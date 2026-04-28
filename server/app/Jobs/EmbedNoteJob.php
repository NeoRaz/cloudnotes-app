<?php

namespace App\Jobs;

use App\Models\Note;
use App\Models\NoteVector;
use App\Services\AI\AiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class EmbedNoteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 180;

    public function __construct(public Note $note) {}

    public function handle(AiService $ai): void
    {
        $note = $this->note;

        // Base text from title and description
        $description = html_entity_decode(strip_tags($note->description ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = $note->title . "\n" . $description;

        // If there's a PDF attachment, extract its text
        if ($note->attachment_path && str_ends_with(strtolower($note->attachment_path), '.pdf')) {
            try {
                $disk = config('filesystems.default');
                if (\Storage::disk($disk)->exists($note->attachment_path)) {
                    $content = \Storage::disk($disk)->get($note->attachment_path);
                    $parser = new \Smalot\PdfParser\Parser();
                    $pdf    = $parser->parseContent($content);
                    $pdfText = $pdf->getText();
                    if (!empty(trim($pdfText))) {
                        $text .= "\n\n--- PDF Content ---\n" . $pdfText;
                        Log::info("EmbedNoteJob: extracted text from PDF for note #{$note->id}");
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("EmbedNoteJob: failed to extract PDF text for note #{$note->id}", ['error' => $e->getMessage()]);
            }
        }

        $text = trim($text);

        if (empty($text)) {
            Log::info("EmbedNoteJob: skipping note #{$note->id} — empty content");
            return;
        }

        // Chunk text into segments of ~500 chars (simple word-boundary split)
        $chunks = $this->chunkText($text, 500);

        // Delete previous embeddings for this note
        \DB::connection('pgvector')->table('note_vectors')
            ->where('note_id', $note->id)
            ->delete();

        // Get embeddings for all chunks in one API call
        try {
            $embeddings = $ai->embed($chunks);
        } catch (\Throwable $e) {
            Log::error("EmbedNoteJob: embedding failed for note #{$note->id}", ['error' => $e->getMessage()]);
            $this->fail($e);
            return;
        }

        // Persist each chunk + embedding
        foreach ($chunks as $index => $chunk) {
            NoteVector::createVector(
                noteId:     $note->id,
                chunkIndex: $index,
                chunkText:  $chunk,
                embedding:  $embeddings[$index],
                metadata:   [
                    'title'   => $note->title,
                    'user_id' => $note->user_id,
                ],
            );
        }

        Log::info("EmbedNoteJob: embedded note #{$note->id} into " . count($chunks) . " chunk(s)");
    }

    /**
     * Split text into overlapping chunks using a sliding window.
     * This preserves context between chunks.
     */
    private function chunkText(string $text, int $maxLen, int $overlap = 100): array
    {
        if (mb_strlen($text) <= $maxLen) {
            return [$text];
        }

        $chunks = [];
        $start = 0;
        $textLen = mb_strlen($text);

        while ($start < $textLen) {
            $end = $start + $maxLen;
            
            // If not at the end of the text, try to find the last space within the window to avoid cutting words
            if ($end < $textLen) {
                $lastSpace = mb_strrpos(mb_substr($text, $start, $maxLen), ' ');
                if ($lastSpace !== false && $lastSpace > ($maxLen * 0.5)) {
                    $end = $start + $lastSpace;
                }
            }

            $chunk = mb_substr($text, $start, $end - $start);
            $chunks[] = trim($chunk);

            // Move start forward by (window size - overlap)
            $start = $end - $overlap;
            
            // Safety: if we didn't move forward, force move to avoid infinite loop
            if ($start <= ($end - $maxLen)) {
                $start = $end;
            }
            
            // If the remaining text is very short, just append it to the last chunk or exit
            if ($textLen - $start < ($maxLen * 0.2)) {
                break;
            }
        }

        return $chunks;
    }
}

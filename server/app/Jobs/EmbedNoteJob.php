<?php

namespace App\Jobs;

use App\Models\Note;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class EmbedNoteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 600;

    public function __construct(public Note $note)
    {
    }

    public function handle(): void
    {
        $note = $this->note;

        // Base text from title and description
        $description = html_entity_decode(strip_tags($note->description ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = $note->title . "\n" . $description;

        // If there's a PDF attachment, extract its text via AI Pod (Red Flag #4)
        if ($note->attachment_path && str_ends_with(strtolower($note->attachment_path), '.pdf')) {
            try {
                $disk = config('filesystems.default');
                if (\Storage::disk($disk)->exists($note->attachment_path)) {
                    $aiUrl = config('services.ai.url'); // AI Pod URL
                    $content = \Storage::disk($disk)->get($note->attachment_path);

                    $response = \Illuminate\Support\Facades\Http::attach(
                        'file',
                        $content,
                        $note->attachment_name ?? 'note.pdf'
                    )->post("{$aiUrl}/v1/extract-pdf");

                    if ($response->successful()) {
                        $pdfText = $response->json('text');
                        if (!empty(trim($pdfText))) {
                            $text .= "\n\n--- PDF Content ---\n" . $pdfText;
                            Log::info("EmbedNoteJob: extracted PDF text for note #{$note->id}. Preview: " . mb_substr($pdfText, 0, 500) . "...");
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("EmbedNoteJob: failed to extract PDF text via AI Pod for note #{$note->id}", ['error' => $e->getMessage()]);
            }
        }

        $text = trim($text);
        $contentLength = mb_strlen($text);

        if ($contentLength === 0) {
            Log::info("EmbedNoteJob: skipping note #{$note->id} — empty content");
            return;
        }

        $cogneeUrl = config('services.ai.cognee_url');

        if (!$cogneeUrl) {
            Log::error("EmbedNoteJob: Cognee URL not configured.");
            $this->fail(new \Exception("Cognee URL missing"));
            return;
        }

        Log::info("EmbedNoteJob: sending note #{$note->id} to Cognee ($contentLength chars)");

        // Send to Cognee API to handle chunking, Graph generation, and Embeddings
        try {
            $response = \Illuminate\Support\Facades\Http::timeout(600)->post("{$cogneeUrl}/api/v1/cognify", [
                'user_id' => $note->user_id,
                'note_id' => $note->id,
                'text'    => $text,
            ]);

            if ($response->failed()) {
                throw new \Exception("Cognee API failed: " . $response->body());
            }

            Log::info("EmbedNoteJob: successfully cognified note #{$note->id}");
        } catch (\Throwable $e) {
            Log::error("EmbedNoteJob: cognify failed for note #{$note->id}", ['error' => $e->getMessage()]);
            $this->fail($e);
            return;
        }
    }
}

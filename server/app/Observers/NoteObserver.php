<?php

namespace App\Observers;

use App\Jobs\EmbedNoteJob;
use App\Models\Note;

class NoteObserver
{
    /**
     * Dispatch embedding job when a note is created.
     */
    public function created(Note $note): void
    {
        if (config('services.ai.enabled')) {
            EmbedNoteJob::dispatch($note);
        }
    }

    /**
     * Dispatch embedding job when a note is updated.
     * Re-embeds only if title or description changed.
     */
    public function updated(Note $note): void
    {
        if (config('services.ai.enabled') && $note->wasChanged(['title', 'description'])) {
            EmbedNoteJob::dispatch($note);
        }
    }

    /**
     * Remove vectors when a note is deleted.
     */
    public function deleted(Note $note): void
    {
        // Knowledge graph pruning is handled by the AiService->deleteNoteData call in NoteService
        // (Red Flag #5: Centralizing knowledge management in Cognee)
    }
}

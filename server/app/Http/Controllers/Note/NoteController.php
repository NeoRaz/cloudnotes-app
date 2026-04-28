<?php

namespace App\Http\Controllers\Note;

use App\Services\Note\NoteService;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class NoteController extends Controller
{
    protected $service;
    protected $storage;

    public function __construct(NoteService $service, FileStorageService $storage)
    {
        $this->service = $service;
        $this->storage = $storage;
    }

    public function allUserNotes(Request $request)
    {
        $userId = $request->user()->id;
        $result = $this->service->allUserNotes($userId);
        return response(successResponse($result));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority_id' => 'nullable|exists:priorities,id',
            'status_id' => 'nullable|exists:statuses,id',
            'is_pinned' => 'boolean',
            'due_date' => 'nullable|date',
            'attachment' => 'nullable|file|mimes:pdf|max:10240', // Max 10MB
        ]);

        $userId = $request->user()->id;
        $result = $this->service->create($data, $userId, $request->file('attachment'));
        return response(successResponse($result));
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority_id' => 'nullable|exists:priorities,id',
            'status_id' => 'nullable|exists:statuses,id',
            'is_pinned' => 'boolean',
            'due_date' => 'nullable|date',
            'attachment' => 'nullable|file|mimes:pdf|max:10240',
            'delete_attachment' => 'nullable|boolean',
        ]);

        $result = $this->service->update($id, $data, $request->file('attachment'));
        return response(successResponse($result));
    }

    public function destroy(int $id)
    {
        $result = $this->service->delete($id);
        return response(successResponse($result));
    }

    public function download(Request $request, int $id)
    {
        $userId = $request->user()->id;
        $note = $this->service->findForUser($id, $userId);

        if (!$note || !$note->attachment_path) {
            return response()->json(['error' => 'File not found'], 404);
        }

        if (!$this->storage->exists($note->attachment_path)) {
            return response()->json(['error' => 'File missing from storage'], 404);
        }

        return $this->storage->download(
            $note->attachment_path,
            $note->attachment_name ?? 'document.pdf'
        );
    }
}

<?php

namespace App\Services\Note;

use App\Repositories\Note\NoteRepository;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\UploadedFile;

class NoteService
{
    protected $repo;
    protected $storage;

    public function __construct(NoteRepository $repo, FileStorageService $storage)
    {
        $this->repo = $repo;
        $this->storage = $storage;
    }

    public function allUserNotes(int $userId)
    {
        return $this->repo->allUserNotes($userId);
    }

    public function findForUser(int $id, int $userId)
    {
        $note = $this->repo->find($id);
        if ($note && $note->user_id === $userId) {
            return $note;
        }
        return null;
    }

    public function create(array $data, int $userId, ?UploadedFile $file = null)
    {
        $data['user_id'] = $userId;
        
        if ($file) {
            $data['attachment_path'] = $this->storage->store($file, 'notes/attachments');
            $data['attachment_name'] = $file->getClientOriginalName();
        }

        return $this->repo->create($data);
    }

    public function update(int $id, array $data, ?UploadedFile $file = null)
    {
        $note = $this->repo->find($id);

        // Handle attachment deletion
        \Log::info("Note update - data:", ['id' => $id, 'delete_flag' => $data['delete_attachment'] ?? 'not_set']);
        
        if (!empty($data['delete_attachment']) && ($data['delete_attachment'] == true || $data['delete_attachment'] === '1' || $data['delete_attachment'] === 1)) {
            \Log::info("Note update - Entring deletion block for note $id");
            if ($note->attachment_path) {
                \Log::info("Note update - Deleting file: " . $note->attachment_path);
                $this->storage->delete($note->attachment_path);
            }
            $data['attachment_path'] = null;
            $data['attachment_name'] = null;
        }

        if ($file) {
            $this->storage->delete($note->attachment_path);
            $data['attachment_path'] = $this->storage->store($file, 'notes/attachments');
            $data['attachment_name'] = $file->getClientOriginalName();
        }

        return $this->repo->update($note, $data);
    }

    public function delete(int $id)
    {
        $note = $this->repo->find($id);
        if ($note->attachment_path) {
            $this->storage->delete($note->attachment_path);
        }
        return $this->repo->delete($note);
    }
}


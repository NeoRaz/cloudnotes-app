<?php

namespace App\Services\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileStorageService
{
    protected string $disk;

    public function __construct()
    {
        $this->disk = config('filesystems.default', 'public');
    }

    /**
     * Store a file and return the path.
     */
    public function store(UploadedFile $file, string $folder = 'attachments'): string
    {
        return $file->store($folder, $this->disk);
    }

    /**
     * Delete a file from storage.
     */
    public function delete(?string $path): bool
    {
        if ($path && Storage::disk($this->disk)->exists($path)) {
            return Storage::disk($this->disk)->delete($path);
        }
        return false;
    }

    /**
     * Download a file (proxied through Laravel).
     */
    public function download(string $path, ?string $name = null)
    {
        $name = $name ?? basename($path);
        
        return response()->streamDownload(function () use ($path) {
            $stream = \Storage::disk($this->disk)->readStream($path);
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, $name);
    }

    /**
     * Get the absolute path for a file (useful for PDF parsing).
     */
    public function getAbsolutePath(string $path): string
    {
        return storage_path('app/public/' . $path);
    }

    /**
     * Check if a file exists.
     */
    public function exists(string $path): bool
    {
        return Storage::disk($this->disk)->exists($path);
    }
}

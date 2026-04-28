<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class NoteVector extends Model
{
    protected $connection = 'pgvector';

    protected $table = 'note_vectors';

    protected $fillable = [
        'note_id',
        'chunk_index',
        'chunk_text',
        'embedding',
        'metadata',
    ];

    public $timestamps = true;

    // Cast metadata to array automatically
    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * Store a vector embedding in Postgres
     * $embedding = array of floats
     */
    public static function createVector(int $noteId, int $chunkIndex, string $chunkText, array $embedding, array $metadata = [])
    {
        // Convert embedding to Postgres vector array literal
        $embeddingSql = 'ARRAY[' . implode(',', $embedding) . ']::vector';

        DB::connection('pgvector')->insert("
            INSERT INTO note_vectors (note_id, chunk_index, chunk_text, embedding, metadata, created_at, updated_at)
            VALUES (?, ?, ?, {$embeddingSql}, ?, now(), now())
        ", [$noteId, $chunkIndex, $chunkText, json_encode($metadata)]);
    }
}

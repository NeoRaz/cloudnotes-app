<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CreateNoteVectorsTable extends Migration
{
    public function up()
    {
        // Note: Laravel's schema builder doesn't know 'vector' type.
        // Create the table with raw SQL using the pgvector connection.
        $sql = "
            CREATE TABLE IF NOT EXISTS note_vectors (
                id SERIAL PRIMARY KEY,
                note_id BIGINT NOT NULL,
                chunk_index INT NOT NULL DEFAULT 0,
                chunk_text TEXT,
                embedding vector(768),
                metadata jsonb,
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
            );
        ";

        // Run using pgvector connection
        DB::connection('pgvector')->statement('CREATE EXTENSION IF NOT EXISTS vector;');
        DB::connection('pgvector')->statement($sql);

        // Create index (ivfflat)
        DB::connection('pgvector')->statement("
            CREATE INDEX IF NOT EXISTS note_vectors_embedding_ivfflat_idx
            ON note_vectors USING ivfflat (embedding vector_l2_ops)
            WITH (lists = 100);
        ");
    }

    public function down()
    {
        DB::connection('pgvector')->statement('DROP TABLE IF EXISTS note_vectors;');
    }
}

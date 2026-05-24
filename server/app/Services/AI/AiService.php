<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiService
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.ai.base_url', 'http://ai:8000'), '/');
    }

    /**
     * Embed one or more text strings.
     * Returns an array of float arrays.
     */
    public function embed(array $inputs): array
    {
        $response = Http::timeout(120)->post("{$this->baseUrl}/embed", [
            'input' => $inputs,
        ]);

        if ($response->failed()) {
            Log::error('AI embed failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException("AI embed request failed: " . $response->body());
        }

        return $response->json('embeddings', []);
    }

    /**
     * Full RAG pipeline: embed question → retrieve chunks → generate answer.
     */
    public function ask(string $question, int $limit = 5, ?int $userId = null, array $meta = [], array $history = []): array
    {
        $payload = [
            'question' => $question,
            'limit'    => $limit,
            'history'  => $history,
        ];

        if ($userId !== null) {
            $payload['user_id'] = $userId;
        }

        if (!empty($meta)) {
            $payload['meta'] = $meta;
        }

        $response = Http::timeout(300)->post("{$this->baseUrl}/ask", $payload);

        if ($response->failed()) {
            Log::error('AI ask failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException("AI ask request failed: " . $response->body());
        }

        return $response->json();
    }
}

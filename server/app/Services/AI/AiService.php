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
     * Full RAG pipeline: Graph RAG search via Cognee → build prompt → generate answer.
     */
    public function ask(string $question, int $limit = 5, ?int $userId = null, array $meta = [], array $history = []): array
    {
        // 1. Get relevant context from Cognee Graph RAG
        $cogneeUrl = rtrim(config('services.ai.cognee_url', 'http://cognee:8000'), '/');
        
        $searchResponse = Http::timeout(300)->post("{$cogneeUrl}/api/v1/search", [
            'query'   => $question,
            'user_id' => $userId,
            'limit'   => $limit,
        ]);

        $context = "(No relevant notes found)";
        $sources = [];

        if ($searchResponse->successful()) {
            $results = $searchResponse->json('results', []);
            $context = "--- KNOWLEDGE GRAPH CONTEXT ---\n";
            if (is_array($results)) {
                foreach ($results as $result) {
                    $context .= is_array($result) ? ($result['text'] ?? json_encode($result)) : $result;
                    $context .= "\n---\n";
                }
            } else {
                $context .= (string)$results;
            }
            $context .= "\n--- END OF CONTEXT ---";
            $sources = [['cognee' => true, 'type' => 'graph_rag']];
        } else {
            Log::warning('Cognee search failed', ['body' => $searchResponse->body()]);
        }

        // 2. Generate answer using the AI pod (which handles the LLM logic)
        $response = Http::timeout(300)->post("{$this->baseUrl}/ask", [
            'question' => $question,
            'context'  => $context, 
            'history'  => $history,
            'meta'     => $meta,
        ]);

        if ($response->failed()) {
            Log::error('AI ask failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException("AI ask request failed: " . $response->body());
        }

        $answerData = $response->json();
        $answerData['sources'] = array_merge($sources, $answerData['sources'] ?? []);

        return $answerData;
    }

    public function deleteNoteData(int $noteId, int $userId): void
    {
        $cogneeUrl = rtrim(config('services.ai.cognee_url', 'http://cognee:8000'), '/');

        // Only Cognee needs to forget now, as it owns all graph/vector data
        try {
            Http::timeout(30)->post("{$cogneeUrl}/api/v1/delete", [
                'user_id' => $userId,
                'note_id' => $noteId,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to delete note from Cognee: " . $e->getMessage());
        }
    }
}

<?php

namespace App\Http\Controllers\Assistant;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\Note;
use App\Services\AI\AiService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AssistantController extends Controller
{
    public function __construct(protected AiService $ai) {}

    /**
     * POST /assistant/ask
     * Body: { "question": "...", "conversation_id": 123 }
     */
    public function ask(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question'        => 'required|string|max:1000',
            'conversation_id' => 'nullable|integer|exists:conversations,id',
            'limit'           => 'nullable|integer|min:1|max:20',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        return DB::transaction(function () use ($data, $user) {
            // 1. Get or create conversation
            if (isset($data['conversation_id'])) {
                $conversation = Conversation::where('id', $data['conversation_id'])
                    ->where('user_id', $user->id)
                    ->firstOrFail();
            } else {
                $conversation = Conversation::create([
                    'user_id' => $user->id,
                    'title'   => substr($data['question'], 0, 40) . (strlen($data['question']) > 40 ? '...' : '')
                ]);
            }

            // 2. Prepare history from DB
            $history = $conversation->messages()
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(fn($m) => ['role' => $m->role, 'content' => $m->content])
                ->toArray();

            // 3. Save User message
            ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'role'            => 'user',
                'content'         => $data['question']
            ]);

            // 4. Inject aggregate stats
            $totalNotes = Note::where('user_id', $user->id)->count();

            // 5. Call AI
            try {
                $result = $this->ai->ask(
                    question: $data['question'],
                    limit:    $data['limit'] ?? 5,
                    userId:   $user->id,
                    meta:     ['total_notes' => $totalNotes],
                    history:  $history,
                );
            } catch (\Throwable $e) {
                return response()->json(['error' => 'AI service unavailable: ' . $e->getMessage()], 503);
            }

            // 6. Save Assistant message
            ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'role'            => 'assistant',
                'content'         => $result['answer'],
                'sources'         => $result['sources'] ?? [],
                'model'           => $result['model'] ?? null
            ]);

            // 7. Update conversation timestamp
            $conversation->touch();

            return response()->json(successResponse([
                'conversation_id' => $conversation->id,
                'answer'          => $result['answer'],
                'sources'         => $result['sources'] ?? [],
                'provider'        => $result['provider'],
                'model'           => $result['model'],
            ]));
        });
    }
}

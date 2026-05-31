<?php

use App\Http\Controllers\Assistant\AssistantController;
use App\Http\Controllers\Assistant\ConversationController;
use Illuminate\Support\Facades\Route;

if (config('services.ai.enabled')) {
    Route::prefix('assistant')->group(function () {
        Route::post('/ask', [AssistantController::class, 'ask'])->name('assistant.ask');

        Route::get('/conversations', [ConversationController::class, 'index'])->name('assistant.conversations.index');
        Route::post('/conversations', [ConversationController::class, 'store'])->name('assistant.conversations.store');
        Route::get('/conversations/{conversation}', [ConversationController::class, 'show'])->name('assistant.conversations.show');
        Route::delete('/conversations/{conversation}', [ConversationController::class, 'destroy'])->name('assistant.conversations.destroy');
    });
}

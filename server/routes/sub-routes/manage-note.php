<?php

use App\Http\Controllers\Note\NoteController;

Route::prefix('note')->group(function () {
    Route::get('/all-user-notes', [NoteController::class, 'allUserNotes'])->name('note.all-user-notes');
    Route::post('/create', [NoteController::class, 'store'])->name('note.create');
    Route::post('/update/{id}', [NoteController::class, 'update'])->name('note.update');
    Route::post('/delete/{id}', [NoteController::class, 'destroy'])->name('note.delete');
    Route::get('/download/{id}', [NoteController::class, 'download'])->name('note.download');
});
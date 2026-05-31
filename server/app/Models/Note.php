<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Observers\NoteObserver;

class Note extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::observe(NoteObserver::class);
    }

    protected $fillable = [
        'title',
        'description',
        'user_id',
        'priority_id',
        'status_id',
        'due_date',
        'is_pinned',
        'attachment_path',
        'attachment_name',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'due_date'  => 'date',
    ];

    public function priority()
    {
        return $this->belongsTo(Priority::class);
    }

    public function status()
    {
        return $this->belongsTo(Status::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

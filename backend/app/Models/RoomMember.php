<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomMember extends Model
{
    protected $fillable = [
        'room_id',
        'user_id',
        'primary_role',
        'backup_role',
        'productivity_windows',
        'joined_at',
    ];

    protected $casts = [
        'productivity_windows' => 'array',
        'joined_at' => 'datetime',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

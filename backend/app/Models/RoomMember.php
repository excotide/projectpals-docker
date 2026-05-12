<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $room_id
 * @property int $user_id
 * @property string|null $primary_role
 * @property string|null $backup_role
 * @property array|null $productivity_windows
 * @property Carbon|null $joined_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */

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

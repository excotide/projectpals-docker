<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $room_id
 * @property int $team_number
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Team extends Model
{
    protected $fillable = [
        'room_id',
        'team_number',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }

    public function targets(): HasMany
    {
        return $this->hasMany(TeamRoleTarget::class);
    }

    public function isLeader(?int $userId): bool
    {
        if (! $userId) {
            return false;
        }

        return $this->members()
            ->where('is_leader', true)
            ->whereHas('roomMember', fn ($q) => $q->where('user_id', $userId))
            ->exists();
    }

    public function memberForUser(?int $userId): ?TeamMember
    {
        if (! $userId) {
            return null;
        }

        return $this->members()
            ->whereHas('roomMember', fn ($q) => $q->where('user_id', $userId))
            ->first();
    }
}

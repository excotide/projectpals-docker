<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $team_id
 * @property int $from_room_member_id
 * @property int $to_room_member_id
 * @property string|null $to_assigned_role
 * @property int|null $rating
 * @property string $content
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class TeamFeedback extends Model
{
    protected $table = 'team_feedbacks';

    protected $fillable = [
        'team_id',
        'from_room_member_id',
        'to_room_member_id',
        'to_assigned_role',
        'rating',
        'content',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function fromRoomMember(): BelongsTo
    {
        return $this->belongsTo(RoomMember::class, 'from_room_member_id');
    }

    public function toRoomMember(): BelongsTo
    {
        return $this->belongsTo(RoomMember::class, 'to_room_member_id');
    }
}

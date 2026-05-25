<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $team_id
 * @property string $role
 * @property string $title
 * @property bool $is_done
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class TeamRoleTarget extends Model
{
    protected $fillable = [
        'team_id',
        'role',
        'title',
        'is_done',
        'sort_order',
    ];

    protected $casts = [
        'is_done' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}

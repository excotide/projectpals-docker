<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $created_by
 * @property string $project_theme
 * @property string $room_code
 * @property array $roles
 * @property array $productivity_windows
 * @property array $environments
 * @property int $max_per_group
 * @property int $max_members
 * @property int $number_of_groups
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Room extends Model
{
    protected $fillable = [
        'created_by',
        'project_theme',
        'room_code',
        'roles',
        'productivity_windows',
        'environments',
        'max_per_group',
        'max_members',
        'number_of_groups',
        'status',
    ];

    protected $casts = [
        'roles' => 'array',
        'productivity_windows' => 'array',
        'environments' => 'array',
        'max_per_group' => 'integer',
        'max_members' => 'integer',
        'number_of_groups' => 'integer',
    ];

    public static function generateUniqueCode(): string
    {
        do {
            $code = Str::upper(Str::random(6));
        } while (self::query()->where('room_code', $code)->exists());

        return $code;
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): HasMany
    {
        return $this->hasMany(RoomMember::class);
    }

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendPushNotification;
use App\Http\Requests\CreateRoomRequest;
use App\Http\Requests\JoinRoomRequest;
use App\Http\Requests\UpdateRoomRequest;
use App\Models\Room;
use App\Models\RoomMember;
use App\Services\RoleNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoomController extends Controller
{
    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Serialize a Room model into the standard response shape,
     * including the nested `owner` object built from the eager-loaded creator.
     */
    private function roomData(Room $room): array
    {
        return [
            ...$room->toArray(),
            'owner' => $room->creator ? [
                'id'       => $room->creator->id,
                'name'     => $room->creator->name,
                'username' => $room->creator->username,
            ] : null,
        ];
    }

    // ─── Endpoints ───────────────────────────────────────────────────────────

    public function previewForJoin(string $roomCode): JsonResponse
    {
        $room = Room::query()
            ->where('room_code', Str::upper($roomCode))
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Room preview fetched successfully.',
            'data' => [
                'room_code'     => $room->room_code,
                'project_theme' => $room->project_theme,
                'roles'         => $room->roles,
                'status'        => $room->status,
            ],
        ]);
    }

    public function myRooms(): JsonResponse
    {
        $userId = auth()->id();

        $rooms = Room::query()
            ->where(function ($q) use ($userId): void {
                $q->where('created_by', $userId)
                  ->orWhereHas('members', function ($mq) use ($userId): void {
                      $mq->where('user_id', $userId);
                  });
            })
            ->with('creator')
            ->latest('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Rooms fetched successfully.',
            'data'    => $rooms->map($this->roomData(...)),
        ]);
    }

    public function showByCode(string $roomCode): JsonResponse
    {
        $userId = auth()->id();

        $room = Room::query()
            ->where('room_code', Str::upper($roomCode))
            ->where(function ($query) use ($userId): void {
                $query
                    ->where('created_by', $userId)
                    ->orWhereHas('members', function ($memberQuery) use ($userId): void {
                        $memberQuery->where('user_id', $userId);
                    });
            })
            ->with('creator')
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Room detail fetched successfully.',
            'data'    => [
                'room'   => $this->roomData($room),
                'access' => [
                    'is_owner'  => (int) $room->created_by === (int) $userId,
                    'is_member' => true,
                ],
            ],
        ]);
    }

    public function members(string $roomCode): JsonResponse
    {
        $userId = auth()->id();

        $room = Room::query()
            ->where('room_code', Str::upper($roomCode))
            ->where(function ($query) use ($userId): void {
                $query
                    ->where('created_by', $userId)
                    ->orWhereHas('members', function ($memberQuery) use ($userId): void {
                        $memberQuery->where('user_id', $userId);
                    });
            })
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found.',
            ], 404);
        }

        $members = $room->members()
            ->with('user')
            ->latest('id')
            ->get()
            ->map(fn (RoomMember $member) => [
                'id'                  => $member->id,
                'joined_at'           => $member->joined_at,
                'primary_role'        => $member->primary_role,
                'backup_role'         => $member->backup_role,
                'backup_roles'        => $member->backup_roles,
                'productivity_windows' => $member->productivity_windows,
                'environments'        => $member->environments,
                'user' => $member->user ? [
                    'id'       => $member->user->id,
                    'name'     => $member->user->name,
                    'username' => $member->user->username,
                    'email'    => $member->user->email,
                ] : null,
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Joined room members fetched successfully.',
            'data'    => [
                'room' => [
                    'id'            => $room->id,
                    'room_code'     => $room->room_code,
                    'project_theme' => $room->project_theme,
                    'status'        => $room->status,
                ],
                'members' => $members,
            ],
        ]);
    }

    public function store(CreateRoomRequest $request, RoleNormalizer $normalizer): JsonResponse
    {
        $validated = $request->validated();

        // Normalize each free-form role to its canonical form, then dedupe while
        // preserving order. Different inputs ("fe", "Front-end") may collapse to one.
        $canonicalRoles = collect($validated['roles'])
            ->map(static fn (string $role): string => $normalizer->normalize($role))
            ->filter(static fn (string $role): bool => $role !== '')
            ->unique()
            ->values()
            ->all();

        if (\count($canonicalRoles) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'Role yang kamu masukkan ternormalisasi menjadi role yang sama. Tambahkan role yang berbeda.',
            ], 422);
        }

        // Reject configurations that can never cover every role in every team, so
        // the room fails at creation rather than later at matching time.
        $roleCount = \count($canonicalRoles);
        $groups = (int) $validated['number_of_groups'];
        $maxMembers = (int) $validated['max_members'];
        $maxPerGroup = (int) $validated['max_per_group'];

        if ($maxPerGroup < $roleCount) {
            return response()->json([
                'success' => false,
                'message' => "Kapasitas per team ({$maxPerGroup}) lebih kecil dari jumlah role ({$roleCount}). Naikkan Max member room atau kurangi jumlah team/role.",
            ], 422);
        }

        if ($maxMembers < $groups * $roleCount) {
            $needed = $groups * $roleCount;
            return response()->json([
                'success' => false,
                'message' => "Max member room ({$maxMembers}) tidak cukup untuk mengisi semua role di setiap team. Butuh minimal {$needed} member ({$groups} team × {$roleCount} role).",
            ], 422);
        }

        $validated['roles'] = $canonicalRoles;

        $room = Room::create([
            ...$validated,
            'productivity_windows' => $validated['productivity_windows'] ?? ['flexible'],
            'environments'         => $validated['environments'] ?? ['flexible'],
            'created_by'           => auth()->id(),
            'room_code'            => Room::generateUniqueCode(),
        ])->refresh();

        $room->load('creator');

        // Owner joins as a member unless they opted to only monitor the room.
        if (! $request->boolean('create_room_only')) {
            RoomMember::create([
                'room_id'   => $room->id,
                'user_id'   => auth()->id(),
                'joined_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Room created successfully.',
            'data'    => $this->roomData($room),
        ], 201);
    }

    public function removeMember(Request $request, string $roomCode, int $memberId): JsonResponse
    {
        $userId = auth()->id();

        // Only the room owner may remove members
        $room = Room::query()
            ->where('room_code', Str::upper($roomCode))
            ->where('created_by', $userId)
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found or you are not the owner.',
            ], 404);
        }

        $member = RoomMember::query()
            ->where('id', $memberId)
            ->where('room_id', $room->id)
            ->first();

        if (! $member) {
            return response()->json([
                'success' => false,
                'message' => 'Member not found in this room.',
            ], 404);
        }

        // Prevent owner from removing themselves via this endpoint
        if ((int) $member->user_id === (int) $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Room owner cannot remove themselves.',
            ], 422);
        }

        $kickedUserId = (int) $member->user_id;
        $reason = trim((string) $request->input('reason', ''));

        $member->delete();

        // Notify the removed member only.
        SendPushNotification::dispatch(
            [$kickedUserId],
            'Kamu dikeluarkan dari room',
            $reason !== ''
                ? "{$room->project_theme} — {$reason}"
                : "Kamu dikeluarkan dari room {$room->project_theme}.",
            [
                'type'      => 'kicked',
                'room_code' => (string) $room->room_code,
                'reason'    => $reason,
            ],
        );

        return response()->json([
            'success' => true,
            'message' => 'Member removed from room successfully.',
        ]);
    }

    public function update(UpdateRoomRequest $request, string $roomCode): JsonResponse
    {
        $room = Room::query()
            ->where('created_by', auth()->id())
            ->where('room_code', Str::upper($roomCode))
            ->with('creator')
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found or you are not allowed to update this room.',
            ], 404);
        }

        $validated = $request->validated();

        if ($validated === []) {
            return response()->json([
                'success' => false,
                'message' => 'No room fields provided for update.',
            ], 422);
        }

        // Derive per-team size from total capacity ("Max member room") whenever
        // max_members is updated, using the new or existing team count.
        if (\array_key_exists('max_members', $validated)) {
            $groups = (int) ($validated['number_of_groups'] ?? $room->number_of_groups);
            $maxMembers = (int) $validated['max_members'];
            if ($groups > 0 && $maxMembers > 0) {
                $validated['max_per_group'] = (int) ceil($maxMembers / $groups);
            }
        }

        $room->fill($validated);
        $room->save();

        return response()->json([
            'success' => true,
            'message' => 'Room updated successfully.',
            'data'    => $this->roomData($room),
        ]);
    }

    public function destroy(string $roomCode): JsonResponse
    {
        $userId = auth()->id();

        $room = Room::query()
            ->where('room_code', Str::upper($roomCode))
            ->where(function ($query) use ($userId): void {
                $query
                    ->where('created_by', $userId)
                    ->orWhereHas('members', function ($memberQuery) use ($userId): void {
                        $memberQuery->where('user_id', $userId);
                    });
            })
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found.',
            ], 404);
        }

        if ((int) $room->created_by === (int) $userId) {
            $room->delete();

            return response()->json([
                'success' => true,
                'message' => 'Room deleted successfully.',
            ]);
        }

        RoomMember::query()
            ->where('room_id', $room->id)
            ->where('user_id', $userId)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'You have left the room successfully.',
        ]);
    }

    public function leave(Request $request, string $roomCode): JsonResponse
    {
        $room = Room::query()
            ->where('room_code', Str::upper($roomCode))
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found.',
            ], 404);
        }

        if ((int) $room->created_by === (int) $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Room owner cannot leave. Please delete the room instead.',
            ], 422);
        }

        $deleted = RoomMember::query()
            ->where('room_id', $room->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        if (! $deleted) {
            return response()->json([
                'success' => false,
                'message' => 'You are not a member of this room.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'You have left the room successfully.',
        ]);
    }

    public function join(JoinRoomRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $room = Room::query()
            ->where('room_code', Str::upper($validated['room_code']))
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found.',
            ], 404);
        }


        $availableRoles = \is_array($room->roles) ? $room->roles : [];

        if (! empty($validated['primary_role']) && ! \in_array($validated['primary_role'], $availableRoles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Selected primary role is not available in this room.',
            ], 422);
        }

        foreach (($validated['backup_roles'] ?? []) as $backup) {
            if (! \in_array($backup, $availableRoles, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected backup role is not available in this room.',
                ], 422);
            }
        }

        $member = RoomMember::query()->firstOrNew([
            'room_id' => $room->id,
            'user_id' => auth()->id(),
        ]);

        $isNewMember = ! $member->exists;

        if ($isNewMember && $room->max_members !== null) {
            $currentCount = RoomMember::query()->where('room_id', $room->id)->count();
            if ($currentCount >= (int) $room->max_members) {
                return response()->json([
                    'success' => false,
                    'message' => 'Room sudah penuh.',
                ], 422);
            }
        }

        $member->primary_role        = $validated['primary_role'] ?? $member->primary_role;
        $member->backup_role         = $validated['backup_role'] ?? $member->backup_role;
        $member->backup_roles        = $validated['backup_roles'] ?? $member->backup_roles;
        $member->productivity_windows = $validated['productivity_windows'] ?? $member->productivity_windows;
        $member->environments        = $validated['environments'] ?? $member->environments;

        if ($isNewMember) {
            $member->joined_at = now();
        }

        $member->save();

        return response()->json([
            'success' => true,
            'message' => $isNewMember ? 'Joined room successfully.' : 'You are already in this room.',
            'data'    => [
                'room'   => $room,
                'member' => $member,
            ],
        ]);
    }
}

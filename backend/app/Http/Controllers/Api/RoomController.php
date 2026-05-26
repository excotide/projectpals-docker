<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateRoomRequest;
use App\Http\Requests\JoinRoomRequest;
use App\Http\Requests\UpdateRoomRequest;
use App\Models\Room;
use App\Models\RoomMember;
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
                'productivity_windows' => $member->productivity_windows,
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

    public function store(CreateRoomRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $room = Room::create([
            ...$validated,
            'productivity_windows' => $validated['productivity_windows'] ?? ['flexible'],
            'environments'         => $validated['environments'] ?? ['flexible'],
            'created_by'           => auth()->id(),
            'room_code'            => Room::generateUniqueCode(),
        ])->refresh();

        $room->load('creator');

        RoomMember::create([
            'room_id'   => $room->id,
            'user_id'   => auth()->id(),
            'joined_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Room created successfully.',
            'data'    => $this->roomData($room),
        ], 201);
    }

    public function removeMember(string $roomCode, int $memberId): JsonResponse
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

        $member->delete();

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

        if (! empty($validated['backup_role']) && ! \in_array($validated['backup_role'], $availableRoles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Selected backup role is not available in this room.',
            ], 422);
        }

        $member = RoomMember::query()->firstOrNew([
            'room_id' => $room->id,
            'user_id' => auth()->id(),
        ]);

        $isNewMember = ! $member->exists;

        $member->primary_role        = $validated['primary_role'] ?? $member->primary_role;
        $member->backup_role         = $validated['backup_role'] ?? $member->backup_role;
        $member->productivity_windows = $validated['productivity_windows'] ?? $member->productivity_windows;

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

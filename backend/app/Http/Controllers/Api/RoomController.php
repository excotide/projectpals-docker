<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateRoomRequest;
use App\Http\Requests\JoinRoomRequest;
use App\Models\Room;
use App\Models\RoomMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class RoomController extends Controller
{
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

        if ($room->status === 'closed') {
            return response()->json([
                'success' => false,
                'message' => 'Room is closed and cannot accept new members.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Room preview fetched successfully.',
            'data' => [
                'room_code' => $room->room_code,
                'project_theme' => $room->project_theme,
                'roles' => $room->roles,
                'status' => $room->status,
            ],
        ]);
    }

    public function myRooms(): JsonResponse
    {
        $rooms = Room::query()
            ->where('created_by', auth()->id())
            ->latest('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Rooms fetched successfully.',
            'data' => $rooms,
        ]);
    }

    public function showByCode(string $roomCode): JsonResponse
    {
        $room = Room::query()
            ->where('created_by', auth()->id())
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
            'message' => 'Room detail fetched successfully.',
            'data' => $room,
        ]);
    }

    public function store(CreateRoomRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $room = Room::create([
            ...$validated,
            'productivity_windows' => $validated['productivity_windows'] ?? ['flexible'],
            'environments' => $validated['environments'] ?? ['flexible'],
            'created_by' => auth()->id(),
            'room_code' => Room::generateUniqueCode(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Room created successfully.',
            'data' => $room,
        ], 201);
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

        if ($room->status === 'closed') {
            return response()->json([
                'success' => false,
                'message' => 'Room is closed and cannot accept new members.',
            ], 422);
        }

        $availableRoles = is_array($room->roles) ? $room->roles : [];

        if (! empty($validated['primary_role']) && ! in_array($validated['primary_role'], $availableRoles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Selected primary role is not available in this room.',
            ], 422);
        }

        if (! empty($validated['backup_role']) && ! in_array($validated['backup_role'], $availableRoles, true)) {
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

        $member->primary_role = $validated['primary_role'] ?? $member->primary_role;
        $member->backup_role = $validated['backup_role'] ?? $member->backup_role;
        $member->productivity_windows = $validated['productivity_windows'] ?? $member->productivity_windows;

        if ($isNewMember) {
            $member->joined_at = now();
        }

        $member->save();

        return response()->json([
            'success' => true,
            'message' => $isNewMember ? 'Joined room successfully.' : 'You are already in this room.',
            'data' => [
                'room' => $room,
                'member' => $member,
            ],
        ]);
    }
}

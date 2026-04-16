<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateRoomRequest;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class RoomController extends Controller
{
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
            'created_by' => auth()->id(),
            'room_code' => Room::generateUniqueCode(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Room created successfully.',
            'data' => $room,
        ], 201);
    }
}

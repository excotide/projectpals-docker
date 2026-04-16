<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateRoomRequest;
use App\Models\Room;
use Illuminate\Http\JsonResponse;

class RoomController extends Controller
{
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

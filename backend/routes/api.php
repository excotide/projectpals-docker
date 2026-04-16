<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoomController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', fn () => request()->user());
    });
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/rooms/my-rooms', [RoomController::class, 'myRooms']);
    Route::get('/rooms/{roomCode}/join-preview', [RoomController::class, 'previewForJoin']);
    Route::get('/rooms/{roomCode}', [RoomController::class, 'showByCode']);
    Route::patch('/rooms/{roomCode}', [RoomController::class, 'update']);
    Route::delete('/rooms/{roomCode}', [RoomController::class, 'destroy']);
    Route::post('/rooms/{roomCode}/leave', [RoomController::class, 'leave']);
    Route::post('/rooms/join', [RoomController::class, 'join']);
    Route::post('/rooms', [RoomController::class, 'store']);
});

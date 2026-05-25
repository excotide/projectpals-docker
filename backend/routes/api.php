<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MatchingController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\TeamTargetController;
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
    Route::get('/rooms/{roomCode}/members', [RoomController::class, 'members']);
    Route::delete('/rooms/{roomCode}/members/{memberId}', [RoomController::class, 'removeMember']);
    Route::get('/rooms/{roomCode}', [RoomController::class, 'showByCode']);
    Route::patch('/rooms/{roomCode}', [RoomController::class, 'update']);
    Route::delete('/rooms/{roomCode}', [RoomController::class, 'destroy']);
    Route::post('/rooms/{roomCode}/leave', [RoomController::class, 'leave']);
    Route::post('/rooms/{roomCode}/match', [MatchingController::class, 'match']);
    Route::get('/rooms/{roomCode}/teams', [MatchingController::class, 'teams']);
    Route::post('/teams/{team}/transfer-leader', [MatchingController::class, 'transferLeader']);
    Route::patch('/teams/{team}/members/{member}/role', [MatchingController::class, 'changeMemberRole']);
    Route::get('/teams/{team}/targets', [TeamTargetController::class, 'index']);
    Route::post('/teams/{team}/targets', [TeamTargetController::class, 'store']);
    Route::patch('/teams/{team}/targets/{target}', [TeamTargetController::class, 'update']);
    Route::delete('/teams/{team}/targets/{target}', [TeamTargetController::class, 'destroy']);
    Route::post('/teams/{team}/targets/{target}/toggle', [TeamTargetController::class, 'toggle']);
    Route::post('/rooms/join', [RoomController::class, 'join']);
    Route::post('/rooms', [RoomController::class, 'store']);
});

require __DIR__.'/admin_api.php';

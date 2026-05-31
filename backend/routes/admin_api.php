<?php

use App\Http\Controllers\Admin\AdminLoginController;
use App\Http\Controllers\Admin\DevController;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Support\Facades\Route;

$adminPrefix = trim((string) config('admin.prefix', env('ADMIN_PREFIX', 'pp-console')));

Route::prefix($adminPrefix !== '' ? $adminPrefix : 'pp-console')
    ->middleware(['web'])
    ->withoutMiddleware([PreventRequestForgery::class])
    ->group(function (): void {
        Route::get('/me', [AdminLoginController::class, 'me']);
        Route::post('/login', [AdminLoginController::class, 'login']);

        Route::middleware('admin.session')->group(function (): void {
            Route::post('/logout', [AdminLoginController::class, 'logout']);
            Route::get('/users', [AdminLoginController::class, 'users']);
            Route::get('/rooms', [AdminLoginController::class, 'rooms']);
            Route::get('/analytics', [AdminLoginController::class, 'analytics']);
            Route::get('/logs', [AdminLoginController::class, 'logs']);

            Route::get('/dev/users', [DevController::class, 'users']);
            Route::post('/dev/simulate-matching', [DevController::class, 'simulateMatching']);
            Route::post('/dev/create-room', [DevController::class, 'createRoom']);
            Route::get('/dev/room-info', [DevController::class, 'roomInfo']);
            Route::post('/dev/inject-members', [DevController::class, 'injectMembers']);
            Route::get('/dev/matched-rooms', [DevController::class, 'matchedRooms']);
        });
    });

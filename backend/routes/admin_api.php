<?php

use App\Http\Controllers\Admin\AdminLoginController;
use Illuminate\Support\Facades\Route;

$adminPrefix = trim((string) config('admin.prefix', env('ADMIN_PREFIX', 'pp-console')));

Route::prefix($adminPrefix !== '' ? $adminPrefix : 'pp-console')
    ->middleware(['web'])
    ->group(function (): void {
        Route::get('/me', [AdminLoginController::class, 'me']);
        Route::post('/login', [AdminLoginController::class, 'login']);

        Route::middleware('admin.session')->group(function (): void {
            Route::post('/logout', [AdminLoginController::class, 'logout']);
            Route::get('/users', [AdminLoginController::class, 'users']);
            Route::get('/rooms', [AdminLoginController::class, 'rooms']);
            Route::get('/analytics', [AdminLoginController::class, 'analytics']);
            Route::get('/logs', [AdminLoginController::class, 'logs']);
        });
    });

<?php

use App\Http\Middleware\AdminSessionAuth;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\VerifyCsrfToken;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->replaceInGroup(
            'web',
            ValidateCsrfToken::class,
            VerifyCsrfToken::class
        );
        $middleware->replaceInGroup(
            'web',
            Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
            VerifyCsrfToken::class
        );
        $middleware->appendToGroup('api', ForceJsonResponse::class);
        $middleware->alias([
            'admin.session' => AdminSessionAuth::class,
        ]);

        $middleware->redirectGuestsTo(function ($request): ?string {
            if ($request->expectsJson() || $request->is('api/*')) {
                return null;
            }

            return '/';
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();

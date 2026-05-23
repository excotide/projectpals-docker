<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\TeamFormation\ScoringService::class);
        $this->app->singleton(\App\Services\TeamFormation\SnakeDraftService::class);
        $this->app->singleton(\App\Services\TeamFormation\TeamFormationService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}

<?php

namespace App\Providers;

use App\Services\TeamFormation\ScoringService;
use App\Services\TeamFormation\SnakeDraftService;
use App\Services\TeamFormation\TeamFormationService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ScoringService::class);
        $this->app->singleton(SnakeDraftService::class);
        $this->app->singleton(TeamFormationService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}

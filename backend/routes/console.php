<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Push a deadline reminder to teams whose deadline is approaching.
Schedule::command('fcm:deadline-reminders')->everyFifteenMinutes();

<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;

class VerifyCsrfToken extends PreventRequestForgery
{
    /**
     * @return array<int, string>
     */
    public function getExcludedPaths(): array
    {
        $prefix = trim((string) config('admin.prefix', 'pp-console'));

        if ($prefix === '') {
            $prefix = 'pp-console';
        }

        return [
            "api/{$prefix}/*",
        ];
    }
}

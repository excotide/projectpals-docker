<?php

$prefix = trim((string) env('ADMIN_PREFIX', 'pp-console'));

return [
    'prefix' => $prefix !== '' ? $prefix : 'pp-console',

    'max_attempts' => (int) env('ADMIN_MAX_ATTEMPTS', 5),

    'lockout_minutes' => (int) env('ADMIN_LOCKOUT_MINUTES', 15),

    'session_lifetime' => (int) env('ADMIN_SESSION_LIFETIME', 120),

    'allowed_ips' => array_values(array_filter(array_map(
        static fn (string $ip): string => trim($ip),
        explode(',', (string) env('ADMIN_ALLOWED_IPS', ''))
    ))),
];

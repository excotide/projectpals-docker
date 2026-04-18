<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminSessionAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->get('admin_logged_in', false)) {
            return $this->unauthenticated();
        }

        $lastActivity = (int) $request->session()->get('admin_last_activity', 0);
        $lifetimeSeconds = max(1, (int) config('admin.session_lifetime', 120)) * 60;

        if ($lastActivity === 0 || (time() - $lastActivity) > $lifetimeSeconds) {
            $this->clearSession($request);

            return $this->unauthenticated(expired: true);
        }

        $allowedIps = config('admin.allowed_ips', []);
        if (is_array($allowedIps) && count($allowedIps) > 0 && ! in_array($request->ip(), $allowedIps, true)) {
            return response()->json([
                'message' => 'Unauthorized request origin.',
                'expired' => false,
            ], 401);
        }

        $request->session()->put('admin_last_activity', time());

        return $next($request);
    }

    private function unauthenticated(bool $expired = false): JsonResponse
    {
        return response()->json([
            'message' => $expired ? 'Admin session expired.' : 'Unauthenticated.',
            'expired' => $expired,
        ], 401);
    }

    private function clearSession(Request $request): void
    {
        $request->session()->forget([
            'admin_logged_in',
            'admin_id',
            'admin_name',
            'admin_role',
            'admin_last_activity',
        ]);

        $request->session()->regenerateToken();
    }
}

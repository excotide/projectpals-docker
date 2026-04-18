<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AdminLoginController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        $admin = $this->resolveSessionAdmin($request);

        if (! $admin) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'admin' => $this->adminPayload($admin),
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc,dns'],
            'password' => ['required', 'string', 'min:8'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $key = sprintf('admin-login:%s|%s', strtolower($validated['email']), $request->ip());
        $maxAttempts = max(1, (int) config('admin.max_attempts', 5));
        $lockoutSeconds = max(1, (int) config('admin.lockout_minutes', 15)) * 60;

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            return response()->json([
                'message' => 'Too many login attempts. Please try again later.',
                'locked' => true,
                'lockout_seconds' => RateLimiter::availableIn($key),
            ], 429);
        }

        $admin = Admin::query()->where('email', strtolower($validated['email']))->first();

        if (! $admin || ! Hash::check($validated['password'], $admin->password)) {
            RateLimiter::hit($key, $lockoutSeconds);

            $attemptsUsed = RateLimiter::attempts($key);
            $remaining = max(0, $maxAttempts - $attemptsUsed);

            return response()->json([
                'message' => 'Invalid credentials.',
                'attempts_remaining' => $remaining,
                'locked' => false,
            ], 422);
        }

        RateLimiter::clear($key);

        $request->session()->regenerate();
        $this->setAdminSession($request, $admin);

        $admin->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->save();

        return response()->json([
            'message' => 'Login successful.',
            'admin' => $this->adminPayload($admin),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->clearAdminSession($request);
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function users(): JsonResponse
    {
        $users = User::query()
            ->latest('id')
            ->limit(50)
            ->get(['id', 'name', 'email', 'created_at']);

        return response()->json([
            'items' => $users,
            'total' => User::query()->count(),
        ]);
    }

    public function rooms(): JsonResponse
    {
        $rooms = Room::query()
            ->latest('id')
            ->withCount('members')
            ->limit(50)
            ->get(['id', 'project_theme', 'room_code', 'max_per_group', 'number_of_groups', 'status', 'created_at']);

        return response()->json([
            'items' => $rooms,
            'total' => Room::query()->count(),
        ]);
    }

    public function analytics(): JsonResponse
    {
        $usersTotal = User::query()->count();
        $roomsTotal = Room::query()->count();
        $activeRooms = Room::query()->whereIn('status', ['open', 'matching', 'ongoing'])->count();

        $recentUsers = User::query()
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->count();

        return response()->json([
            'summary' => [
                'users_total' => $usersTotal,
                'rooms_total' => $roomsTotal,
                'active_rooms' => $activeRooms,
                'new_users_last_7_days' => $recentUsers,
            ],
        ]);
    }

    public function logs(): JsonResponse
    {
        $userLogs = User::query()
            ->latest('id')
            ->limit(15)
            ->get(['id', 'name', 'email', 'created_at'])
            ->map(static fn (User $user): array => [
                'type' => 'user',
                'event' => 'User registered',
                'message' => sprintf('%s (%s) registered', $user->name, $user->email),
                'created_at' => optional($user->created_at)?->toISOString(),
            ]);

        $roomLogs = Room::query()
            ->latest('id')
            ->limit(15)
            ->get(['id', 'project_theme', 'room_code', 'created_at'])
            ->map(static fn (Room $room): array => [
                'type' => 'room',
                'event' => 'Room created',
                'message' => sprintf('Room %s (%s) created', $room->project_theme, $room->room_code),
                'created_at' => optional($room->created_at)?->toISOString(),
            ]);

        $items = $userLogs->merge($roomLogs)
            ->sortByDesc('created_at')
            ->values()
            ->take(30);

        return response()->json([
            'items' => $items,
        ]);
    }

    private function resolveSessionAdmin(Request $request): ?Admin
    {
        if (! $request->session()->get('admin_logged_in', false)) {
            return null;
        }

        $lastActivity = (int) $request->session()->get('admin_last_activity', 0);
        $lifetimeSeconds = max(1, (int) config('admin.session_lifetime', 120)) * 60;

        if ($lastActivity === 0 || (time() - $lastActivity) > $lifetimeSeconds) {
            $this->clearAdminSession($request);

            return null;
        }

        $request->session()->put('admin_last_activity', time());

        $adminId = $request->session()->get('admin_id');

        if (! $adminId) {
            return null;
        }

        return Admin::query()->find($adminId);
    }

    private function setAdminSession(Request $request, Admin $admin): void
    {
        $request->session()->put([
            'admin_logged_in' => true,
            'admin_id' => $admin->id,
            'admin_name' => $admin->name,
            'admin_role' => $admin->role,
            'admin_last_activity' => time(),
        ]);
    }

    private function clearAdminSession(Request $request): void
    {
        $request->session()->forget([
            'admin_logged_in',
            'admin_id',
            'admin_name',
            'admin_role',
            'admin_last_activity',
        ]);
    }

    private function adminPayload(Admin $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => $admin->role,
            'last_login_at' => optional($admin->last_login_at)?->toISOString(),
            'last_login_ip' => $admin->last_login_ip,
        ];
    }
}

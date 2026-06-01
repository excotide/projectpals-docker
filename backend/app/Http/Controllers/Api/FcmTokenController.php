<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFcmTokenRequest;
use App\Models\FcmToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FcmTokenController extends Controller
{
    /**
     * Register (or refresh) the FCM token for the authenticated user's device.
     * Upsert by token so a token that moved to another account is reassigned
     * rather than duplicated.
     */
    public function store(StoreFcmTokenRequest $request): JsonResponse
    {
        $data = $request->validated();

        FcmToken::query()->updateOrCreate(
            ['token' => $data['token']],
            [
                'user_id' => auth()->id(),
                'platform' => $data['platform'] ?? null,
                'last_used_at' => now(),
            ],
        );

        return response()->json([
            'success' => true,
            'message' => 'FCM token registered.',
        ]);
    }

    /**
     * Remove a token (e.g. on logout) so the device stops receiving pushes.
     */
    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
        ]);

        FcmToken::query()
            ->where('token', $data['token'])
            ->where('user_id', auth()->id())
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'FCM token removed.',
        ]);
    }
}

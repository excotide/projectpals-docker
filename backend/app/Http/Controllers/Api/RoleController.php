<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RoleNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    /**
     * Read-only preview of how a free-form role input will be normalized.
     * Used by the room creation form (debounced) to show "akan disimpan sebagai".
     */
    public function normalize(Request $request, RoleNormalizer $normalizer): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'max:100'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Role normalized successfully.',
            'data'    => $normalizer->preview($validated['role']),
        ]);
    }
}

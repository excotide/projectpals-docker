<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RoomMember;
use App\Models\TeamFeedback;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    /**
     * Feedback summary for the authenticated user: average rating per assigned
     * role (across all teams/rooms) plus the most recent feedback received.
     */
    public function feedbackSummary(): JsonResponse
    {
        $userId = (int) auth()->id();

        $roomMemberIds = RoomMember::query()
            ->where('user_id', $userId)
            ->pluck('id')
            ->map(static fn ($id) => (int) $id)
            ->all();

        if ($roomMemberIds === []) {
            return response()->json([
                'success' => true,
                'data' => [
                    'role_ratings' => [],
                    'feedbacks'    => [],
                ],
            ]);
        }

        // Average rating grouped by the role the feedback was given for.
        $roleRatings = TeamFeedback::query()
            ->whereIn('to_room_member_id', $roomMemberIds)
            ->whereNotNull('to_assigned_role')
            ->whereNotNull('rating')
            ->groupBy('to_assigned_role')
            ->selectRaw('to_assigned_role as role, AVG(rating) as avg_rating, COUNT(*) as cnt')
            ->get()
            ->map(static fn ($row) => [
                'role'       => (string) $row->role,
                'avg_rating' => round((float) $row->avg_rating, 2),
                'count'      => (int) $row->cnt,
            ])
            ->values();

        $feedbacks = TeamFeedback::query()
            ->whereIn('to_room_member_id', $roomMemberIds)
            ->with(['fromRoomMember.user'])
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get()
            ->map(static function (TeamFeedback $f): array {
                return [
                    'id'               => $f->id,
                    'to_assigned_role' => $f->to_assigned_role,
                    'rating'           => $f->rating !== null ? (int) $f->rating : null,
                    'content'          => $f->content,
                    'created_at'       => $f->created_at?->toIso8601String(),
                    'from_user'        => $f->fromRoomMember && $f->fromRoomMember->user ? [
                        'id'       => $f->fromRoomMember->user->id,
                        'name'     => $f->fromRoomMember->user->name,
                        'username' => $f->fromRoomMember->user->username,
                    ] : null,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'role_ratings' => $roleRatings,
                'feedbacks'    => $feedbacks,
            ],
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\TeamFeedback;
use Illuminate\Http\JsonResponse;

class HistoryController extends Controller
{
    public function teams(): JsonResponse
    {
        $userId = auth()->id();

        $teams = Team::query()
            ->whereNotNull('finished_at')
            ->whereHas('members.roomMember', function ($query) use ($userId): void {
                $query->where('user_id', $userId);
            })
            ->with(['room', 'members.roomMember.user'])
            ->orderByDesc('finished_at')
            ->orderByDesc('id')
            ->get();

        $memberIdsByTeam = [];
        $teamIds = [];

        foreach ($teams as $team) {
            $teamIds[] = (int) $team->id;

            $myMember = $team->members->first(function ($member) use ($userId) {
                return $member->roomMember && (int) $member->roomMember->user_id === (int) $userId;
            });

            $memberIdsByTeam[(int) $team->id] = $myMember?->room_member_id !== null
                ? (int) $myMember->room_member_id
                : null;
        }

        $ratingRows = collect();
        $roomMemberIds = array_values(array_filter($memberIdsByTeam, fn ($id) => $id !== null));

        if ($teamIds !== [] && $roomMemberIds !== []) {
            $ratingRows = TeamFeedback::query()
                ->whereIn('team_id', $teamIds)
                ->whereIn('from_room_member_id', $roomMemberIds)
                ->selectRaw('team_id, from_room_member_id, AVG(rating) as avg_rating, COUNT(*) as feedback_count')
                ->groupBy('team_id', 'from_room_member_id')
                ->get()
                ->keyBy('team_id');
        }

        return response()->json([
            'success' => true,
            'message' => 'Team history fetched successfully.',
            'data' => $teams->map(function (Team $team) use ($memberIdsByTeam, $ratingRows): array {
                $memberId = $memberIdsByTeam[(int) $team->id] ?? null;
                $ratingRow = $ratingRows->get($team->id);

                return [
                    'team_id' => $team->id,
                    'team_number' => $team->team_number,
                    'status' => $team->finished_at ? 'Completed' : 'In progress',
                    'finished_at' => $team->finished_at?->toIso8601String(),
                    'average_rating' => $ratingRow ? round((float) $ratingRow->avg_rating, 1) : null,
                    'feedback_count' => $ratingRow ? (int) $ratingRow->feedback_count : 0,
                    'my_room_member_id' => $memberId,
                    'room' => [
                        'id' => $team->room?->id,
                        'room_code' => $team->room?->room_code,
                        'project_theme' => $team->room?->project_theme,
                        'status' => $team->room?->status,
                    ],
                ];
            })->values(),
        ]);
    }
}

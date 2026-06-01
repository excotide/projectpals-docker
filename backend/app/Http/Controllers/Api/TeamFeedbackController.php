<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\TeamFeedback;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamFeedbackController extends Controller
{
    public function status(Team $team): JsonResponse
    {
        $userId = auth()->id();
        $isOwner = $team->room && (int) $team->room->created_by === (int) $userId;
        $myMember = $team->memberForUser($userId);

        if (! $isOwner && ! $myMember) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this team.',
            ], 403);
        }

        $members = TeamMember::query()
            ->where('team_id', $team->id)
            ->pluck('room_member_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $memberCount = \count($members);
        $expectedPerMember = max($memberCount - 1, 0);

        $givenCounts = [];
        if ($memberCount > 0) {
            $rows = TeamFeedback::query()
                ->where('team_id', $team->id)
                ->whereIn('from_room_member_id', $members)
                ->whereIn('to_room_member_id', $members)
                ->selectRaw('from_room_member_id, count(distinct to_room_member_id) as cnt')
                ->groupBy('from_room_member_id')
                ->get();
            foreach ($rows as $row) {
                $givenCounts[(int) $row->from_room_member_id] = (int) $row->cnt;
            }
        }

        $completedContributors = [];
        foreach ($members as $rmId) {
            if (($givenCounts[$rmId] ?? 0) >= $expectedPerMember) {
                $completedContributors[] = $rmId;
            }
        }

        $totalGiven = \count($completedContributors);
        $totalRequired = $memberCount > 1 ? $memberCount : 0;
        $complete = $memberCount <= 1 ? true : ($totalGiven >= $totalRequired);

        $myComplete = false;
        $myMissingTargets = [];
        if ($myMember) {
            $myId = (int) $myMember->room_member_id;
            $myGivenTo = TeamFeedback::query()
                ->where('team_id', $team->id)
                ->where('from_room_member_id', $myId)
                ->pluck('to_room_member_id')
                ->map(fn ($id) => (int) $id)
                ->all();
            foreach ($members as $rmId) {
                if ($rmId !== $myId && ! \in_array($rmId, $myGivenTo, true)) {
                    $myMissingTargets[] = $rmId;
                }
            }
            $myComplete = $myMissingTargets === [];
        }

        $missingContributors = array_values(array_diff($members, $completedContributors));

        return response()->json([
            'success' => true,
            'data' => [
                'team_id' => $team->id,
                'total_required' => $totalRequired,
                'total_given' => $totalGiven,
                'complete' => $complete,
                'my_room_member_id' => $myMember?->room_member_id,
                'my_complete' => $myComplete,
                'my_missing_targets' => $myMissingTargets,
                'missing_contributors' => $missingContributors,
            ],
        ]);
    }

    public function store(Request $request, Team $team): JsonResponse
    {
        $userId = auth()->id();
        $myMember = $team->memberForUser($userId);

        if (! $myMember) {
            return response()->json([
                'success' => false,
                'message' => 'Only team members can give feedback.',
            ], 403);
        }

        $data = $request->validate([
            'to_room_member_id' => ['required', 'integer'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'content' => ['nullable', 'string', 'max:1000'],
        ]);

        $toRoomMemberId = (int) $data['to_room_member_id'];

        if ($toRoomMemberId === (int) $myMember->room_member_id) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot give feedback to yourself.',
            ], 422);
        }

        $targetMember = TeamMember::query()
            ->where('team_id', $team->id)
            ->where('room_member_id', $toRoomMemberId)
            ->first();

        if (! $targetMember) {
            return response()->json([
                'success' => false,
                'message' => 'Target is not a member of this team.',
            ], 422);
        }

        $rawContent = $data['content'] ?? null;
        $content = (\is_string($rawContent) && \trim($rawContent) !== '') ? $rawContent : null;

        $feedback = TeamFeedback::updateOrCreate(
            [
                'team_id' => $team->id,
                'from_room_member_id' => $myMember->room_member_id,
                'to_room_member_id' => $toRoomMemberId,
            ],
            [
                'rating' => $data['rating'],
                'content' => $content,
                'to_assigned_role' => $targetMember->assigned_role,
            ],
        );

        return response()->json([
            'success' => true,
            'data' => $this->format($feedback->fresh()),
        ], $feedback->wasRecentlyCreated ? 201 : 200);
    }

    public function received(Team $team, int $roomMemberId): JsonResponse
    {
        $userId = auth()->id();
        $isOwner = $team->room && (int) $team->room->created_by === (int) $userId;
        $isMember = $team->memberForUser($userId) !== null;

        if (! $isOwner && ! $isMember) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this team.',
            ], 403);
        }

        $feedbacks = TeamFeedback::query()
            ->where('team_id', $team->id)
            ->where('to_room_member_id', $roomMemberId)
            ->with(['fromRoomMember.user'])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'team_id' => $team->id,
                'room_member_id' => $roomMemberId,
                'feedbacks' => $feedbacks->map(fn (TeamFeedback $f) => $this->format($f, withFromUser: true))->values(),
            ],
        ]);
    }

    public function given(Team $team): JsonResponse
    {
        $userId = auth()->id();
        $myMember = $team->memberForUser($userId);

        if (! $myMember) {
            return response()->json([
                'success' => false,
                'message' => 'Only team members can view their given feedbacks.',
            ], 403);
        }

        $feedbacks = TeamFeedback::query()
            ->where('team_id', $team->id)
            ->where('from_room_member_id', $myMember->room_member_id)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'team_id' => $team->id,
                'feedbacks' => $feedbacks->map(fn (TeamFeedback $f) => $this->format($f))->values(),
            ],
        ]);
    }

    private function format(TeamFeedback $f, bool $withFromUser = false): array
    {
        $arr = [
            'id' => $f->id,
            'team_id' => $f->team_id,
            'from_room_member_id' => $f->from_room_member_id,
            'to_room_member_id' => $f->to_room_member_id,
            'to_assigned_role' => $f->to_assigned_role,
            'rating' => $f->rating !== null ? (int) $f->rating : null,
            'content' => $f->content,
            'created_at' => $f->created_at?->toIso8601String(),
            'updated_at' => $f->updated_at?->toIso8601String(),
        ];

        if ($withFromUser && $f->fromRoomMember && $f->fromRoomMember->user) {
            $arr['from_user'] = [
                'id' => $f->fromRoomMember->user->id,
                'name' => $f->fromRoomMember->user->name,
                'username' => $f->fromRoomMember->user->username,
            ];
        }

        return $arr;
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\Team;
use App\Services\TeamFormation\TeamFormationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class MatchingController extends Controller
{
    public function __construct(private readonly TeamFormationService $formation) {}

    public function teams(string $roomCode): JsonResponse
    {
        $userId = auth()->id();

        $room = Room::query()
            ->where('room_code', Str::upper($roomCode))
            ->where(function ($query) use ($userId): void {
                $query
                    ->where('created_by', $userId)
                    ->orWhereHas('members', function ($mq) use ($userId): void {
                        $mq->where('user_id', $userId);
                    });
            })
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found.',
            ], 404);
        }

        $teams = Team::query()
            ->where('room_id', $room->id)
            ->with(['members.roomMember.user'])
            ->orderBy('team_number')
            ->get();

        $assignedRoomMemberIds = [];
        foreach ($teams as $team) {
            foreach ($team->members as $tm) {
                $assignedRoomMemberIds[] = (int) $tm->room_member_id;
            }
        }

        $unassigned = $room->members()
            ->when($assignedRoomMemberIds !== [], fn ($q) => $q->whereNotIn('id', $assignedRoomMemberIds))
            ->with('user')
            ->get()
            ->map(fn ($rm) => [
                'room_member_id' => $rm->id,
                'primary_role'   => $rm->primary_role,
                'backup_role'    => $rm->backup_role,
                'user'           => $rm->user ? [
                    'id'       => $rm->user->id,
                    'name'     => $rm->user->name,
                    'username' => $rm->user->username,
                ] : null,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'room' => [
                    'id'            => $room->id,
                    'room_code'     => $room->room_code,
                    'project_theme' => $room->project_theme,
                    'status'        => $room->status,
                    'max_per_group' => $room->max_per_group,
                    'number_of_groups' => $room->number_of_groups,
                ],
                'teams' => $teams->map(fn (Team $t) => [
                    'team_number' => $t->team_number,
                    'members'     => $t->members->map(fn ($tm) => [
                        'room_member_id' => $tm->room_member_id,
                        'assigned_role'  => $tm->assigned_role,
                        'score'          => (float) $tm->score,
                        'primary_role'   => $tm->roomMember?->primary_role,
                        'backup_role'    => $tm->roomMember?->backup_role,
                        'user'           => $tm->roomMember && $tm->roomMember->user ? [
                            'id'       => $tm->roomMember->user->id,
                            'name'     => $tm->roomMember->user->name,
                            'username' => $tm->roomMember->user->username,
                        ] : null,
                    ])->values(),
                ])->values(),
                'unassigned' => $unassigned,
            ],
        ]);
    }

    public function match(string $roomCode): JsonResponse
    {
        $userId = auth()->id();

        $room = Room::query()
            ->where('room_code', Str::upper($roomCode))
            ->first();

        if (! $room || (int) $room->created_by !== (int) $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found or you are not the owner.',
            ], 404);
        }

        if ($room->status !== 'open') {
            return response()->json([
                'success' => false,
                'message' => 'Room is not open for matching.',
            ], 422);
        }

        $room->load('members');

        if ($room->members->count() < 2) {
            return response()->json([
                'success' => false,
                'message' => 'Need at least 2 members to form teams.',
            ], 422);
        }

        $room->update(['status' => 'matching']);

        try {
            $roomArr = [
                'roles' => \is_array($room->roles) ? $room->roles : [],
                'productivity_windows' => \is_array($room->productivity_windows) ? $room->productivity_windows : [],
                'max_per_group' => (int) $room->max_per_group,
                'number_of_groups' => (int) $room->number_of_groups,
            ];

            $membersArr = $room->members->map(fn ($m) => [
                'id' => (int) $m->id,
                'primary_role' => $m->primary_role,
                'backup_role' => $m->backup_role,
                'productivity_windows' => \is_array($m->productivity_windows) ? $m->productivity_windows : [],
            ])->all();

            $out = $this->formation->form($membersArr, $roomArr);

            DB::transaction(function () use ($room, $out): void {
                Team::query()->where('room_id', $room->id)->delete();

                foreach ($out['teams'] as $teamNumber => $picks) {
                    $team = Team::create([
                        'room_id' => $room->id,
                        'team_number' => $teamNumber,
                    ]);

                    foreach ($picks as $pick) {
                        $team->members()->create([
                            'room_member_id' => $pick['member_id'],
                            'assigned_role' => $pick['assigned_role'],
                            'score' => $pick['score'],
                        ]);
                    }
                }

                $room->update(['status' => 'matched']);
            });
        } catch (Throwable $e) {
            $room->update(['status' => 'open']);
            Log::error('Team formation failed', [
                'room_id' => $room->id,
                'room_code' => $room->room_code,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to form teams.',
            ], 500);
        }

        $teams = Team::query()
            ->with(['members.roomMember.user'])
            ->where('room_id', $room->id)
            ->orderBy('team_number')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Teams formed.',
            'data' => [
                'teams' => $teams->map(fn (Team $t) => [
                    'team_number' => $t->team_number,
                    'members' => $t->members->map(fn ($tm) => [
                        'room_member_id' => $tm->room_member_id,
                        'assigned_role' => $tm->assigned_role,
                        'score' => (float) $tm->score,
                        'user' => $tm->roomMember && $tm->roomMember->user ? [
                            'id' => $tm->roomMember->user->id,
                            'name' => $tm->roomMember->user->name,
                            'username' => $tm->roomMember->user->username,
                        ] : null,
                    ])->values(),
                ])->values(),
                'unassigned' => $out['unassigned'],
                'meta' => $out['meta'],
            ],
        ]);
    }
}

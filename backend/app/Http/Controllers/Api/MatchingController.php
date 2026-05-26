<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\TeamFormation\TeamFormationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
                    'id'           => $t->id,
                    'team_number'  => $t->team_number,
                    'project_name' => $t->project_name,
                    'description'  => $t->description,
                    'deadline'     => $t->deadline?->toIso8601String(),
                    'finished_at'  => $t->finished_at?->toIso8601String(),
                    'members'      => $t->members->map(fn ($tm) => [
                        'room_member_id' => $tm->room_member_id,
                        'assigned_role'  => $tm->assigned_role,
                        'score'          => (float) $tm->score,
                        'is_leader'      => (bool) $tm->is_leader,
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

                $roomMembersById = $room->members->keyBy('id');

                foreach ($out['teams'] as $teamNumber => $picks) {
                    $team = Team::create([
                        'room_id' => $room->id,
                        'team_number' => $teamNumber,
                    ]);

                    $created = [];
                    foreach ($picks as $pick) {
                        $tm = $team->members()->create([
                            'room_member_id' => $pick['member_id'],
                            'assigned_role' => $pick['assigned_role'],
                            'score' => $pick['score'],
                        ]);
                        $created[] = ['tm' => $tm, 'pick' => $pick];
                    }

                    if ($created === []) {
                        continue;
                    }

                    $primaryMatchers = array_values(array_filter($created, function ($entry) use ($roomMembersById) {
                        $rm = $roomMembersById[$entry['pick']['member_id']] ?? null;
                        return $rm && $entry['pick']['assigned_role'] === $rm->primary_role;
                    }));

                    $pool = $primaryMatchers !== [] ? $primaryMatchers : $created;
                    usort($pool, fn ($a, $b) => $b['pick']['score'] <=> $a['pick']['score']);
                    $pool[0]['tm']->update(['is_leader' => true]);
                }

                $room->update(['status' => 'ongoing']);
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
                    'id'           => $t->id,
                    'team_number'  => $t->team_number,
                    'project_name' => $t->project_name,
                    'description'  => $t->description,
                    'deadline'     => $t->deadline?->toIso8601String(),
                    'finished_at'  => $t->finished_at?->toIso8601String(),
                    'members' => $t->members->map(fn ($tm) => [
                        'room_member_id' => $tm->room_member_id,
                        'assigned_role' => $tm->assigned_role,
                        'score' => (float) $tm->score,
                        'is_leader' => (bool) $tm->is_leader,
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

    public function updateTeam(Request $request, Team $team): JsonResponse
    {
        if (! $team->isLeader(auth()->id())) {
            return response()->json([
                'success' => false,
                'message' => 'Only the team leader can update the project.',
            ], 403);
        }

        $data = $request->validate([
            'project_name' => ['nullable', 'string', 'max:150'],
            'description'  => ['nullable', 'string'],
            'deadline'     => ['nullable', 'date'],
        ]);

        $payload = [];
        foreach (['project_name', 'description', 'deadline'] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = $data[$field];
            }
        }

        $team->update($payload);
        $team->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Project updated.',
            'data' => [
                'id'           => $team->id,
                'team_number'  => $team->team_number,
                'project_name' => $team->project_name,
                'description'  => $team->description,
                'deadline'     => $team->deadline?->toIso8601String(),
                'finished_at'  => $team->finished_at?->toIso8601String(),
            ],
        ]);
    }

    public function finishTeam(Team $team): JsonResponse
    {
        if (! $team->isLeader(auth()->id())) {
            return response()->json([
                'success' => false,
                'message' => 'Only the team leader can finish the project.',
            ], 403);
        }

        if ($team->finished_at !== null) {
            return response()->json([
                'success' => false,
                'message' => 'Project is already finished.',
            ], 422);
        }

        $memberIds = TeamMember::query()
            ->where('team_id', $team->id)
            ->pluck('room_member_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $memberCount = \count($memberIds);
        if ($memberCount > 1) {
            $expectedPerMember = $memberCount - 1;

            $rows = \App\Models\TeamFeedback::query()
                ->where('team_id', $team->id)
                ->whereIn('from_room_member_id', $memberIds)
                ->whereIn('to_room_member_id', $memberIds)
                ->selectRaw('from_room_member_id, count(distinct to_room_member_id) as cnt')
                ->groupBy('from_room_member_id')
                ->get();

            $given = [];
            foreach ($rows as $row) {
                $given[(int) $row->from_room_member_id] = (int) $row->cnt;
            }

            $incomplete = [];
            foreach ($memberIds as $rmId) {
                if (($given[$rmId] ?? 0) < $expectedPerMember) {
                    $incomplete[] = $rmId;
                }
            }

            if ($incomplete !== []) {
                return response()->json([
                    'success' => false,
                    'message' => 'Setiap anggota team harus memberi feedback ke semua anggota lain sebelum proyek bisa diselesaikan.',
                    'missing_contributors' => $incomplete,
                ], 422);
            }
        }

        $team->update(['finished_at' => now()]);
        $team->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Project marked as finished.',
            'data' => [
                'id'          => $team->id,
                'finished_at' => $team->finished_at?->toIso8601String(),
                'deadline'    => $team->deadline?->toIso8601String(),
            ],
        ]);
    }

    public function changeMemberRole(Request $request, Team $team, TeamMember $member): JsonResponse
    {
        if ((int) $member->team_id !== (int) $team->id) {
            return response()->json([
                'success' => false,
                'message' => 'Member does not belong to this team.',
            ], 404);
        }

        if (! $team->isLeader(auth()->id())) {
            return response()->json([
                'success' => false,
                'message' => 'Only the team leader can change member roles.',
            ], 403);
        }

        $data = $request->validate([
            'assigned_role' => ['required', 'string', 'max:100'],
        ]);

        $room = $team->room;
        $roomRoles = $room && \is_array($room->roles) ? $room->roles : [];
        if (! \in_array($data['assigned_role'], $roomRoles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid role for this room.',
            ], 422);
        }

        $member->update(['assigned_role' => $data['assigned_role']]);

        return response()->json([
            'success' => true,
            'message' => 'Member role updated.',
            'data' => [
                'room_member_id' => $member->room_member_id,
                'assigned_role'  => $member->assigned_role,
            ],
        ]);
    }

    public function transferLeader(Request $request, Team $team): JsonResponse
    {
        $userId = auth()->id();

        $data = $request->validate([
            'new_leader_room_member_id' => ['required', 'integer'],
        ]);

        $currentLeader = TeamMember::query()
            ->where('team_id', $team->id)
            ->where('is_leader', true)
            ->with('roomMember')
            ->first();

        if (! $currentLeader || ! $currentLeader->roomMember || (int) $currentLeader->roomMember->user_id !== (int) $userId) {
            return response()->json([
                'success' => false,
                'message' => 'Only the current team leader can transfer leadership.',
            ], 403);
        }

        $newLeader = TeamMember::query()
            ->where('team_id', $team->id)
            ->where('room_member_id', $data['new_leader_room_member_id'])
            ->first();

        if (! $newLeader) {
            return response()->json([
                'success' => false,
                'message' => 'Target member is not part of this team.',
            ], 422);
        }

        if ((int) $newLeader->id === (int) $currentLeader->id) {
            return response()->json([
                'success' => false,
                'message' => 'Target member is already the leader.',
            ], 422);
        }

        DB::transaction(function () use ($currentLeader, $newLeader): void {
            $currentLeader->update(['is_leader' => false]);
            $newLeader->update(['is_leader' => true]);
        });

        $team->load(['members.roomMember.user']);

        return response()->json([
            'success' => true,
            'message' => 'Leadership transferred.',
            'data' => [
                'team_number' => $team->team_number,
                'members' => $team->members->map(fn (TeamMember $tm) => [
                    'room_member_id' => $tm->room_member_id,
                    'assigned_role'  => $tm->assigned_role,
                    'score'          => (float) $tm->score,
                    'is_leader'      => (bool) $tm->is_leader,
                    'primary_role'   => $tm->roomMember?->primary_role,
                    'backup_role'    => $tm->roomMember?->backup_role,
                    'user'           => $tm->roomMember && $tm->roomMember->user ? [
                        'id'       => $tm->roomMember->user->id,
                        'name'     => $tm->roomMember->user->name,
                        'username' => $tm->roomMember->user->username,
                    ] : null,
                ])->values(),
            ],
        ]);
    }
}

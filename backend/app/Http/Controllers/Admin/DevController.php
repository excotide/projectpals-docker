<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomMember;
use App\Models\Team;
use App\Models\User;
use App\Services\TeamFormation\TeamFormationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class DevController extends Controller
{
    public function __construct(private readonly TeamFormationService $formation) {}

    public function users(): JsonResponse
    {
        $users = User::query()
            ->latest('id')
            ->limit(100)
            ->get(['id', 'name', 'username', 'email']);

        return response()->json([
            'success' => true,
            'data'    => $users,
        ]);
    }

    public function simulateMatching(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'roles'                                => ['required', 'array', 'min:1'],
            'roles.*'                              => ['string', 'max:100'],
            'max_per_group'                        => ['required', 'integer', 'min:1', 'max:50'],
            'number_of_groups'                     => ['required', 'integer', 'min:1', 'max:50'],
            'productivity_windows'                 => ['sometimes', 'array'],
            'productivity_windows.*'               => ['in:morning,afternoon,evening,flexible'],

            'members'                              => ['required', 'array', 'min:1', 'max:200'],
            'members.*.id'                         => ['required', 'integer'],
            'members.*.primary_role'               => ['nullable', 'string', 'max:100'],
            'members.*.backup_role'                => ['nullable', 'string', 'max:100'],
            'members.*.productivity_windows'       => ['sometimes', 'array'],
            'members.*.productivity_windows.*'     => ['in:morning,afternoon,evening,flexible'],
        ]);

        $room = [
            'roles'                => array_values($validated['roles']),
            'productivity_windows' => array_values($validated['productivity_windows'] ?? []),
            'max_per_group'        => (int) $validated['max_per_group'],
            'number_of_groups'     => (int) $validated['number_of_groups'],
        ];

        $members = array_map(static function (array $m): array {
            return [
                'id'                   => (int) $m['id'],
                'primary_role'         => $m['primary_role'] ?? null,
                'backup_role'          => $m['backup_role'] ?? null,
                'productivity_windows' => array_values($m['productivity_windows'] ?? []),
            ];
        }, $validated['members']);

        try {
            $result = $this->formation->form($members, $room);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Simulation failed: '.$e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Simulation finished.',
            'data'    => [
                'input' => [
                    'room'    => $room,
                    'members' => $members,
                ],
                'score_matrix' => $result['score_matrix'],
                'teams'        => $result['teams'],
                'unassigned'   => $result['unassigned'],
                'trace'        => $result['trace'],
                'meta'         => $result['meta'],
            ],
        ]);
    }

    public function createRoom(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'owner_user_id'                        => ['required', 'integer'],
            'project_theme'                        => ['required', 'string', 'max:255'],
            'roles'                                => ['required', 'array', 'min:1'],
            'roles.*'                              => ['string', 'max:100'],
            'max_per_group'                        => ['required', 'integer', 'min:1', 'max:50'],
            'number_of_groups'                     => ['required', 'integer', 'min:1', 'max:50'],
            'productivity_windows'                 => ['sometimes', 'array'],
            'productivity_windows.*'               => ['in:morning,afternoon,evening,flexible'],

            'members'                              => ['required', 'array', 'min:1', 'max:200'],
            'members.*.user_id'                    => ['required', 'integer'],
            'members.*.primary_role'               => ['nullable', 'string', 'max:100'],
            'members.*.backup_role'                => ['nullable', 'string', 'max:100'],
            'members.*.productivity_windows'       => ['sometimes', 'array'],
            'members.*.productivity_windows.*'     => ['in:morning,afternoon,evening,flexible'],
        ]);

        $ownerId = (int) $validated['owner_user_id'];
        $owner = User::query()->find($ownerId);
        if (! $owner) {
            return response()->json([
                'success' => false,
                'message' => "Owner user_id={$ownerId} not found.",
            ], 422);
        }

        $userIds = array_values(array_unique(array_map(static fn ($m) => (int) $m['user_id'], $validated['members'])));
        if (! \in_array($ownerId, $userIds, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Owner must also be selected as a member.',
            ], 422);
        }

        $existing = User::query()->whereIn('id', $userIds)->pluck('id')->all();
        $missing = array_values(array_diff($userIds, $existing));
        if ($missing !== []) {
            return response()->json([
                'success' => false,
                'message' => 'Some member user IDs are not valid users: '.implode(', ', $missing),
            ], 422);
        }

        try {
            $created = DB::transaction(function () use ($validated, $ownerId): array {
                $roomRow = Room::create([
                    'created_by'           => $ownerId,
                    'project_theme'        => (string) $validated['project_theme'],
                    'room_code'            => Room::generateUniqueCode(),
                    'roles'                => array_values($validated['roles']),
                    'productivity_windows' => $validated['productivity_windows'] ?? ['flexible'],
                    'environments'         => ['flexible'],
                    'max_per_group'        => (int) $validated['max_per_group'],
                    'number_of_groups'     => (int) $validated['number_of_groups'],
                    'status'               => 'open',
                ])->refresh();

                $createdMembers = 0;
                $seen = [];
                foreach ($validated['members'] as $m) {
                    $userId = (int) $m['user_id'];
                    if (\in_array($userId, $seen, true)) {
                        continue;
                    }
                    $seen[] = $userId;

                    RoomMember::create([
                        'room_id'              => $roomRow->id,
                        'user_id'              => $userId,
                        'primary_role'         => $m['primary_role'] ?? null,
                        'backup_role'          => $m['backup_role'] ?? null,
                        'productivity_windows' => $m['productivity_windows'] ?? [],
                        'joined_at'            => now(),
                    ]);
                    $createdMembers++;
                }

                return [
                    'room_id'         => $roomRow->id,
                    'room_code'       => $roomRow->room_code,
                    'owner_id'        => $ownerId,
                    'members_created' => $createdMembers,
                ];
            });
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Create room failed: '.$e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Room created. The owner can now run matching from the normal UI.',
            'data'    => $created,
        ]);
    }

    public function matchedRooms(): JsonResponse
    {
        $rooms = Room::query()
            ->whereHas('teams')
            ->with(['creator:id,name,username'])
            ->latest('id')
            ->limit(50)
            ->get();

        $payload = $rooms->map(function (Room $room): array {
            $teams = Team::query()
                ->where('room_id', $room->id)
                ->with(['members.roomMember.user:id,name,username'])
                ->orderBy('team_number')
                ->get();

            $assignedRoomMemberIds = [];
            foreach ($teams as $team) {
                foreach ($team->members as $tm) {
                    $assignedRoomMemberIds[] = (int) $tm->room_member_id;
                }
            }

            $unassigned = RoomMember::query()
                ->where('room_id', $room->id)
                ->when($assignedRoomMemberIds !== [], fn ($q) => $q->whereNotIn('id', $assignedRoomMemberIds))
                ->with('user:id,name,username')
                ->get()
                ->map(static fn (RoomMember $rm) => [
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

            return [
                'id'               => $room->id,
                'room_code'        => $room->room_code,
                'project_theme'    => $room->project_theme,
                'status'           => $room->status,
                'max_per_group'    => $room->max_per_group,
                'number_of_groups' => $room->number_of_groups,
                'owner'            => $room->creator ? [
                    'id'       => $room->creator->id,
                    'name'     => $room->creator->name,
                    'username' => $room->creator->username,
                ] : null,
                'teams' => $teams->map(static fn (Team $t) => [
                    'team_number' => $t->team_number,
                    'members'     => $t->members->map(static fn ($tm) => [
                        'room_member_id' => $tm->room_member_id,
                        'assigned_role'  => $tm->assigned_role,
                        'score'          => (float) $tm->score,
                        'user'           => $tm->roomMember && $tm->roomMember->user ? [
                            'id'       => $tm->roomMember->user->id,
                            'name'     => $tm->roomMember->user->name,
                            'username' => $tm->roomMember->user->username,
                        ] : null,
                    ])->values(),
                ])->values(),
                'unassigned' => $unassigned,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data'    => $payload,
        ]);
    }
}

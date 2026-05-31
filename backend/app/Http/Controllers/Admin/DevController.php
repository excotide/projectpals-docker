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
            'max_members'                          => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'max_per_group'                        => ['sometimes', 'integer', 'min:1', 'max:50'],
            'number_of_groups'                     => ['required', 'integer', 'min:1', 'max:50'],
            'productivity_windows'                 => ['sometimes', 'array'],
            'productivity_windows.*'               => ['in:morning,afternoon,evening,flexible'],
            'environments'                         => ['sometimes', 'array'],
            'environments.*'                       => ['in:private,public,online,flexible'],

            'members'                              => ['required', 'array', 'min:1', 'max:200'],
            'members.*.id'                         => ['required', 'integer'],
            'members.*.primary_role'               => ['nullable', 'string', 'max:100'],
            'members.*.backup_role'                => ['nullable', 'string', 'max:100'],
            'members.*.productivity_windows'       => ['sometimes', 'array'],
            'members.*.productivity_windows.*'     => ['in:morning,afternoon,evening,flexible'],
            'members.*.environments'               => ['sometimes', 'array'],
            'members.*.environments.*'             => ['in:private,public,online,flexible'],
        ]);

        $numberOfGroups = (int) $validated['number_of_groups'];
        // "Max member room" total capacity; derive per-team size. Fall back to legacy per-group input.
        $maxMembers = isset($validated['max_members'])
            ? (int) $validated['max_members']
            : (int) ($validated['max_per_group'] ?? 0) * $numberOfGroups;
        $maxPerGroup = ($numberOfGroups > 0 && $maxMembers > 0)
            ? (int) ceil($maxMembers / $numberOfGroups)
            : (int) ($validated['max_per_group'] ?? 1);

        $room = [
            'roles'                => array_values($validated['roles']),
            'productivity_windows' => array_values($validated['productivity_windows'] ?? []),
            'environments'         => array_values($validated['environments'] ?? []),
            'max_per_group'        => $maxPerGroup,
            'number_of_groups'     => $numberOfGroups,
        ];

        $members = array_map(static function (array $m): array {
            return [
                'id'                   => (int) $m['id'],
                'primary_role'         => $m['primary_role'] ?? null,
                'backup_role'          => $m['backup_role'] ?? null,
                'productivity_windows' => array_values($m['productivity_windows'] ?? []),
                'environments'         => array_values($m['environments'] ?? []),
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
            'max_members'                          => ['sometimes', 'integer', 'min:1', 'max:1000'],
            'max_per_group'                        => ['sometimes', 'integer', 'min:1', 'max:50'],
            'number_of_groups'                     => ['required', 'integer', 'min:1', 'max:50'],
            'productivity_windows'                 => ['sometimes', 'array'],
            'productivity_windows.*'               => ['in:morning,afternoon,evening,flexible'],
            'environments'                         => ['sometimes', 'array'],
            'environments.*'                       => ['in:private,public,online,flexible'],

            'members'                              => ['required', 'array', 'min:1', 'max:200'],
            'members.*.user_id'                    => ['required', 'integer'],
            'members.*.primary_role'               => ['nullable', 'string', 'max:100'],
            'members.*.backup_role'                => ['nullable', 'string', 'max:100'],
            'members.*.productivity_windows'       => ['sometimes', 'array'],
            'members.*.productivity_windows.*'     => ['in:morning,afternoon,evening,flexible'],
            'members.*.environments'               => ['sometimes', 'array'],
            'members.*.environments.*'             => ['in:private,public,online,flexible'],
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
                $numberOfGroups = (int) $validated['number_of_groups'];
                $maxMembers = isset($validated['max_members'])
                    ? (int) $validated['max_members']
                    : (int) ($validated['max_per_group'] ?? 0) * $numberOfGroups;
                $maxPerGroup = ($numberOfGroups > 0 && $maxMembers > 0)
                    ? (int) ceil($maxMembers / $numberOfGroups)
                    : (int) ($validated['max_per_group'] ?? 1);

                $roomRow = Room::create([
                    'created_by'           => $ownerId,
                    'project_theme'        => (string) $validated['project_theme'],
                    'room_code'            => Room::generateUniqueCode(),
                    'roles'                => array_values($validated['roles']),
                    'productivity_windows' => $validated['productivity_windows'] ?? ['flexible'],
                    'environments'         => $validated['environments'] ?? ['flexible'],
                    'max_per_group'        => $maxPerGroup,
                    'max_members'          => $maxMembers,
                    'number_of_groups'     => $numberOfGroups,
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
                        'environments'         => $m['environments'] ?? [],
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
                'max_members'      => $room->max_members,
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

    public function roomInfo(Request $request): JsonResponse
    {
        $code = (string) $request->query('room_code', '');
        if ($code === '') {
            return response()->json(['success' => false, 'message' => 'room_code is required.'], 422);
        }

        $room = Room::query()->where('room_code', strtoupper($code))->first();
        if (! $room) {
            return response()->json(['success' => false, 'message' => 'Room not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id'                   => $room->id,
                'room_code'            => $room->room_code,
                'project_theme'        => $room->project_theme,
                'status'               => $room->status,
                'roles'                => \is_array($room->roles) ? array_values($room->roles) : [],
                'productivity_windows' => \is_array($room->productivity_windows) ? array_values($room->productivity_windows) : [],
                'max_members'          => $room->max_members,
                'number_of_groups'     => $room->number_of_groups,
                'current_members'      => (int) RoomMember::query()->where('room_id', $room->id)->count(),
            ],
        ]);
    }

    public function injectMembers(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_code'                            => ['required', 'string', 'max:32'],
            'members'                              => ['required', 'array', 'min:1', 'max:200'],
            'members.*.user_id'                    => ['required', 'integer'],
            'members.*.primary_role'               => ['nullable', 'string', 'max:100'],
            'members.*.backup_role'                => ['nullable', 'string', 'max:100'],
            'members.*.productivity_windows'       => ['sometimes', 'array'],
            'members.*.productivity_windows.*'     => ['in:morning,afternoon,evening,flexible'],
            'members.*.environments'               => ['sometimes', 'array'],
            'members.*.environments.*'             => ['in:private,public,online,flexible'],
        ]);

        $room = Room::query()
            ->where('room_code', strtoupper($validated['room_code']))
            ->first();

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Room not found (room_code='.$validated['room_code'].').',
            ], 404);
        }

        $availableRoles = \is_array($room->roles) ? $room->roles : [];

        // Validate all user_ids exist up front.
        $userIds = array_values(array_unique(array_map(static fn ($m) => (int) $m['user_id'], $validated['members'])));
        $existingUsers = User::query()->whereIn('id', $userIds)->pluck('id')->map(static fn ($id) => (int) $id)->all();
        $missingUsers = array_values(array_diff($userIds, $existingUsers));
        if ($missingUsers !== []) {
            return response()->json([
                'success' => false,
                'message' => 'Some user IDs are not valid users: '.implode(', ', $missingUsers),
            ], 422);
        }

        // Pre-load existing members to detect duplicates.
        $alreadyMember = RoomMember::query()
            ->where('room_id', $room->id)
            ->whereIn('user_id', $userIds)
            ->pluck('user_id')
            ->map(static fn ($id) => (int) $id)
            ->all();

        $injected = [];
        $skipped = [];   // already-member user_ids
        $errors = [];

        try {
            DB::transaction(function () use ($room, $availableRoles, $alreadyMember, $validated, &$injected, &$skipped, &$errors): void {
                $cap = $room->max_members !== null ? (int) $room->max_members : null;
                $currentCount = (int) RoomMember::query()->where('room_id', $room->id)->count();

                $seen = [];
                foreach ($validated['members'] as $m) {
                    $userId = (int) $m['user_id'];
                    if (\in_array($userId, $seen, true)) {
                        continue;
                    }
                    $seen[] = $userId;

                    if (\in_array($userId, $alreadyMember, true)) {
                        $skipped[] = $userId;
                        continue;
                    }

                    $primary = $m['primary_role'] ?? null;
                    $backup  = $m['backup_role'] ?? null;
                    if ($primary !== null && $primary !== '' && ! \in_array($primary, $availableRoles, true)) {
                        $errors[] = ['user_id' => $userId, 'message' => 'Invalid primary_role for this room.'];
                        continue;
                    }
                    if ($backup !== null && $backup !== '' && ! \in_array($backup, $availableRoles, true)) {
                        $errors[] = ['user_id' => $userId, 'message' => 'Invalid backup_role for this room.'];
                        continue;
                    }

                    if ($cap !== null && $currentCount >= $cap) {
                        $errors[] = ['user_id' => $userId, 'message' => "Room sudah penuh ({$cap}/{$cap})."];
                        continue;
                    }

                    RoomMember::create([
                        'room_id'              => $room->id,
                        'user_id'              => $userId,
                        'primary_role'         => $primary ?: null,
                        'backup_role'          => $backup ?: null,
                        'productivity_windows' => $m['productivity_windows'] ?? [],
                        'environments'         => $m['environments'] ?? [],
                        'joined_at'            => now(),
                    ]);
                    $injected[] = $userId;
                    $currentCount++;
                }
            });
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Inject failed: '.$e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Inject completed.',
            'data' => [
                'room_id'        => $room->id,
                'room_code'      => $room->room_code,
                'roles'          => $availableRoles,
                'injected_count' => \count($injected),
                'injected'       => $injected,
                'skipped'        => $skipped,
                'errors'         => $errors,
                'total_members'  => RoomMember::query()->where('room_id', $room->id)->count(),
                'max_members'    => $room->max_members,
            ],
        ]);
    }
}

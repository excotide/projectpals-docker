<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\TeamRoleTarget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class TeamTargetController extends Controller
{
    public function index(Team $team): JsonResponse
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

        $targets = TeamRoleTarget::query()
            ->where('team_id', $team->id)
            ->orderBy('role')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'team_id' => $team->id,
                'targets' => $targets->map(fn (TeamRoleTarget $t) => $this->format($t))->values(),
            ],
        ]);
    }

    public function store(Request $request, Team $team): JsonResponse
    {
        if (! $team->isLeader(auth()->id())) {
            return response()->json([
                'success' => false,
                'message' => 'Only the team leader can create targets.',
            ], 403);
        }

        if (trim((string) $team->project_name) === '' || $team->deadline === null) {
            return response()->json([
                'success' => false,
                'message' => 'Lengkapi judul dan deadline proyek terlebih dahulu sebelum menambah target.',
            ], 422);
        }

        $data = $request->validate([
            'role' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:255'],
            'deadline' => ['nullable', 'date'],
        ]);

        $room = $team->room;
        $roomRoles = $room && \is_array($room->roles) ? $room->roles : [];
        if (! \in_array($data['role'], $roomRoles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid role for this room.',
            ], 422);
        }

        if ($error = $this->validateDeadline($team, $data['deadline'] ?? null)) {
            return $error;
        }

        $maxOrder = (int) TeamRoleTarget::query()
            ->where('team_id', $team->id)
            ->where('role', $data['role'])
            ->max('sort_order');

        $target = TeamRoleTarget::create([
            'team_id' => $team->id,
            'role' => $data['role'],
            'title' => $data['title'],
            'deadline' => $data['deadline'] ?? null,
            'sort_order' => $maxOrder + 1,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->format($target),
        ], 201);
    }

    public function update(Request $request, Team $team, TeamRoleTarget $target): JsonResponse
    {
        if ((int) $target->team_id !== (int) $team->id) {
            return response()->json([
                'success' => false,
                'message' => 'Target does not belong to this team.',
            ], 404);
        }

        if (! $team->isLeader(auth()->id())) {
            return response()->json([
                'success' => false,
                'message' => 'Only the team leader can edit targets.',
            ], 403);
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'deadline' => ['sometimes', 'nullable', 'date'],
        ]);

        if (! \array_key_exists('title', $data) && ! \array_key_exists('deadline', $data)) {
            return response()->json([
                'success' => false,
                'message' => 'No fields to update.',
            ], 422);
        }

        if (\array_key_exists('deadline', $data) && ($error = $this->validateDeadline($team, $data['deadline']))) {
            return $error;
        }

        $payload = [];
        if (\array_key_exists('title', $data)) {
            $payload['title'] = $data['title'];
        }
        if (\array_key_exists('deadline', $data)) {
            $payload['deadline'] = $data['deadline'];
        }

        $target->update($payload);

        return response()->json([
            'success' => true,
            'data' => $this->format($target->fresh()),
        ]);
    }

    public function destroy(Team $team, TeamRoleTarget $target): JsonResponse
    {
        if ((int) $target->team_id !== (int) $team->id) {
            return response()->json([
                'success' => false,
                'message' => 'Target does not belong to this team.',
            ], 404);
        }

        if (! $team->isLeader(auth()->id())) {
            return response()->json([
                'success' => false,
                'message' => 'Only the team leader can delete targets.',
            ], 403);
        }

        $target->delete();

        return response()->json([
            'success' => true,
            'message' => 'Target deleted.',
        ]);
    }

    public function toggle(Team $team, TeamRoleTarget $target): JsonResponse
    {
        if ((int) $target->team_id !== (int) $team->id) {
            return response()->json([
                'success' => false,
                'message' => 'Target does not belong to this team.',
            ], 404);
        }

        $userMember = $team->memberForUser(auth()->id());
        if (! $userMember) {
            return response()->json([
                'success' => false,
                'message' => 'You are not a member of this team.',
            ], 403);
        }

        if ($userMember->assigned_role !== $target->role) {
            return response()->json([
                'success' => false,
                'message' => 'Only members assigned to this role can toggle this target.',
            ], 403);
        }

        $newIsDone = ! $target->is_done;
        $target->update([
            'is_done' => $newIsDone,
            'completed_at' => $newIsDone ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->format($target->fresh()),
        ]);
    }

    /**
     * Ensure a target deadline is not earlier than the room creation date and,
     * when the team has a project deadline, does not exceed it. Compares by
     * calendar day so the time-of-day picked by the user is not penalised.
     * Returns a 422 JsonResponse on violation, or null when valid.
     */
    private function validateDeadline(Team $team, ?string $deadline): ?JsonResponse
    {
        if ($deadline === null || $deadline === '') {
            return null;
        }

        $target = Carbon::parse($deadline);

        $room = $team->room;
        if ($room && $room->created_at && $target->copy()->startOfDay()->lt($room->created_at->copy()->startOfDay())) {
            return response()->json([
                'success' => false,
                'message' => 'Deadline target tidak boleh sebelum room dibuat.',
            ], 422);
        }

        if ($team->deadline && $target->gt($team->deadline)) {
            return response()->json([
                'success' => false,
                'message' => 'Deadline target tidak boleh melebihi deadline proyek team ('.$team->deadline->format('d M Y H:i').').',
            ], 422);
        }

        return null;
    }

    private function format(TeamRoleTarget $t): array
    {
        return [
            'id' => $t->id,
            'team_id' => $t->team_id,
            'role' => $t->role,
            'title' => $t->title,
            'is_done' => (bool) $t->is_done,
            'sort_order' => (int) $t->sort_order,
            'deadline' => $t->deadline?->toIso8601String(),
            'completed_at' => $t->completed_at?->toIso8601String(),
        ];
    }
}

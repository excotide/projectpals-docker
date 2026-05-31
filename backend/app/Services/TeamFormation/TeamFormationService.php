<?php

namespace App\Services\TeamFormation;

final class TeamFormationService
{
    public function __construct(
        private readonly ScoringService $scoring,
        private readonly ProfileClusterService $cluster,
        private readonly RoleAssignmentService $assignment,
    ) {}

    /**
     * Two-phase team formation:
     *   Phase 1 — cluster members into K teams by profile similarity.
     *   Phase 2 — within each team, assign roles so every role is covered.
     *
     * @param  array<int, array<string, mixed>>  $members
     * @param  array<string, mixed>  $room
     * @return array{
     *     score_matrix: array<int, array<string, float>>,
     *     teams: array<int, array<int, array{member_id:int, assigned_role:string, score:float}>>,
     *     unassigned: array<int, int>,
     *     trace: array<int, array<string, mixed>>,
     *     meta: array<string, mixed>
     * }
     */
    public function form(array $members, array $room): array
    {
        $roles = \is_array($room['roles'] ?? null) ? \array_values($room['roles']) : [];
        $kTeams = (int) ($room['number_of_groups'] ?? 0);
        $maxPerGroup = (int) ($room['max_per_group'] ?? 0);

        $clusters = $this->cluster->cluster($members, $kTeams, $maxPerGroup);

        $teams = [];
        $totalPicks = 0;
        foreach ($clusters as $i => $clusterMembers) {
            $teamNumber = $i + 1;
            $picks = $this->assignment->assign($clusterMembers, $roles);
            $teams[$teamNumber] = $picks;
            $totalPicks += \count($picks);
        }

        return [
            'score_matrix' => $this->scoreMatrix($members, $roles),
            'teams' => $teams,
            'unassigned' => [],
            'trace' => [],
            'meta' => [
                'k_teams' => $kTeams,
                'max_per_group' => $maxPerGroup,
                'total_members' => \count($members),
                'total_picks' => $totalPicks,
                'feedback_weight' => ScoringService::WEIGHT_FEEDBACK,
            ],
        ];
    }

    /**
     * Full (member_id, role) roleScore matrix for inspection/debugging.
     *
     * @param  array<int, array<string, mixed>>  $members
     * @param  array<int, string>  $roles
     * @return array<int, array<string, float>>
     */
    private function scoreMatrix(array $members, array $roles): array
    {
        $matrix = [];
        foreach ($members as $member) {
            $id = (int) $member['id'];
            $matrix[$id] = [];
            foreach ($roles as $role) {
                $matrix[$id][$role] = $this->scoring->roleScore($member, $role);
            }
        }

        return $matrix;
    }
}

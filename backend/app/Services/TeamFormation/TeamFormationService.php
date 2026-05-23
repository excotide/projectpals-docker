<?php

namespace App\Services\TeamFormation;

final class TeamFormationService
{
    public function __construct(
        private readonly ScoringService $scoring,
        private readonly SnakeDraftService $draft,
    ) {}

    /**
     * Run the full two-phase team formation pipeline.
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
        $initial = $this->scoring->scoreMatrix($members, $room, ['N' => 0, 'n' => []]);
        $result = $this->draft->draft($members, $room);

        return [
            'score_matrix' => $initial,
            'teams' => $result['teams'],
            'unassigned' => $result['unassigned'],
            'trace' => $result['trace'],
            'meta' => [
                'c' => ScoringService::C,
                'k_teams' => (int) ($room['number_of_groups'] ?? 0),
                'max_per_group' => (int) ($room['max_per_group'] ?? 0),
                'total_members' => \count($members),
                'total_picks' => $result['total_picks'],
            ],
        ];
    }
}

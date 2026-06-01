<?php

namespace App\Services\TeamFormation;

final class SnakeDraftService
{
    public function __construct(private readonly ScoringService $scoring) {}

    /**
     * Run the snake-draft assignment.
     *
     * @param  array<int, array<string, mixed>>  $members
     * @param  array<string, mixed>  $room
     * @return array{
     *     teams: array<int, array<int, array{member_id:int, assigned_role:string, score:float}>>,
     *     unassigned: array<int, int>,
     *     trace: array<int, array<string, mixed>>,
     *     total_picks: int
     * }
     */
    public function draft(array $members, array $room): array
    {
        $roles = \is_array($room['roles'] ?? null) ? \array_values($room['roles']) : [];
        $kTeams = (int) ($room['number_of_groups'] ?? 0);
        $maxPerGroup = (int) ($room['max_per_group'] ?? 0);

        $teams = [];
        for ($t = 1; $t <= $kTeams; $t++) {
            $teams[$t] = [];
        }

        $unassigned = [];
        $trace = [];
        $counters = ['N' => 0, 'n' => []];

        if ($members === [] || $roles === [] || $kTeams < 1 || $maxPerGroup < 1) {
            foreach ($members as $member) {
                $unassigned[] = (int) $member['id'];
            }

            return [
                'teams' => $teams,
                'unassigned' => $unassigned,
                'trace' => $trace,
                'total_picks' => 0,
            ];
        }

        $draftOrder = $this->buildDraftOrder($members, $room);

        $snakeIndex = 0;
        $totalCapacity = $kTeams * $maxPerGroup;

        foreach ($draftOrder as $member) {
            $memberId = (int) $member['id'];

            $teamNumber = $this->nextTeamFromSnake($teams, $kTeams, $maxPerGroup, $snakeIndex, $totalCapacity);
            if ($teamNumber === null) {
                $unassigned[] = $memberId;

                continue;
            }

            [$role, $score] = $this->bestRoleForMember($member, $roles, $room, $counters);

            $teams[$teamNumber][] = [
                'member_id' => $memberId,
                'assigned_role' => $role,
                'score' => $score,
            ];

            $counters['N']++;
            $counters['n'][$role] = ($counters['n'][$role] ?? 0) + 1;

            $trace[] = [
                'pick' => $counters['N'],
                'team' => $teamNumber,
                'member_id' => $memberId,
                'role' => $role,
                'score' => $score,
                'counters_after' => [
                    'N' => $counters['N'],
                    'n' => $counters['n'],
                ],
            ];
        }

        // Redistribution phase: nobody should be left hanging once teams exist.
        // Each overflow member joins the smallest team (tie-break: lowest team number),
        // so some teams will exceed max_per_group but everyone gets placed.
        if ($unassigned !== []) {
            $membersById = [];
            foreach ($members as $m) {
                $membersById[(int) $m['id']] = $m;
            }

            $overflow = $unassigned;   // already in draft order (score-sorted)
            $unassigned = [];

            foreach ($overflow as $memberId) {
                $member = $membersById[$memberId] ?? null;
                if ($member === null) {
                    $unassigned[] = $memberId;   // safety net, should not happen

                    continue;
                }

                $targetTeam = 1;
                $minCount = \count($teams[1]);
                for ($t = 2; $t <= $kTeams; $t++) {
                    $c = \count($teams[$t]);
                    if ($c < $minCount) {
                        $minCount = $c;
                        $targetTeam = $t;
                    }
                }

                [$role, $score] = $this->bestRoleForMember($member, $roles, $room, $counters);

                $teams[$targetTeam][] = [
                    'member_id' => $memberId,
                    'assigned_role' => $role,
                    'score' => $score,
                ];

                $counters['N']++;
                $counters['n'][$role] = ($counters['n'][$role] ?? 0) + 1;

                $trace[] = [
                    'pick' => $counters['N'],
                    'team' => $targetTeam,
                    'member_id' => $memberId,
                    'role' => $role,
                    'score' => $score,
                    'overflow' => true,
                    'counters_after' => [
                        'N' => $counters['N'],
                        'n' => $counters['n'],
                    ],
                ];
            }
        }

        return [
            'teams' => $teams,
            'unassigned' => $unassigned,
            'trace' => $trace,
            'total_picks' => $counters['N'],
        ];
    }

    /**
     * Sort members descending by best initial score (N=0), ascending by id on ties.
     *
     * @param  array<int, array<string, mixed>>  $members
     * @param  array<string, mixed>  $room
     * @return array<int, array<string, mixed>>
     */
    private function buildDraftOrder(array $members, array $room): array
    {
        $roles = \is_array($room['roles'] ?? null) ? $room['roles'] : [];

        $withScores = \array_map(function (array $member) use ($roles, $room): array {
            $best = 0.0;
            foreach ($roles as $role) {
                $s = $this->scoring->score($member, $role, $room, 0, 0);
                if ($s > $best) {
                    $best = $s;
                }
            }

            return ['member' => $member, 'best' => $best];
        }, $members);

        \usort($withScores, function (array $a, array $b): int {
            if ($a['best'] === $b['best']) {
                return ((int) $a['member']['id']) <=> ((int) $b['member']['id']);
            }

            return $b['best'] <=> $a['best'];
        });

        return \array_map(static fn (array $row) => $row['member'], $withScores);
    }

    /**
     * Advance the snake cursor to the next non-full team. Returns null if all teams are full.
     *
     * @param  array<int, array<int, mixed>>  $teams
     */
    private function nextTeamFromSnake(array $teams, int $kTeams, int $maxPerGroup, int &$snakeIndex, int $totalCapacity): ?int
    {
        $totalAssigned = 0;
        foreach ($teams as $picks) {
            $totalAssigned += \count($picks);
        }
        if ($totalAssigned >= $totalCapacity) {
            return null;
        }

        $period = $kTeams === 1 ? 1 : (2 * $kTeams);

        // Walk forward at most one full period; we know a slot exists somewhere.
        for ($step = 0; $step < $period; $step++) {
            $pos = ($snakeIndex + $step) % $period;
            $teamNumber = $kTeams === 1
                ? 1
                : ($pos < $kTeams ? $pos + 1 : (2 * $kTeams - $pos));

            if (\count($teams[$teamNumber]) < $maxPerGroup) {
                $snakeIndex = ($snakeIndex + $step + 1) % $period;

                return $teamNumber;
            }
        }

        return null;
    }

    /**
     * Pick the role with the highest current score for this member; tie-break by role array order.
     *
     * @param  array<string, mixed>  $member
     * @param  array<int, string>  $roles
     * @param  array<string, mixed>  $room
     * @param  array{N:int, n:array<string,int>}  $counters
     * @return array{0:string, 1:float}
     */
    private function bestRoleForMember(array $member, array $roles, array $room, array $counters): array
    {
        $bestRole = $roles[0];
        $bestScore = $this->scoring->score(
            $member,
            $bestRole,
            $room,
            $counters['N'],
            (int) ($counters['n'][$bestRole] ?? 0)
        );

        for ($i = 1, $n = \count($roles); $i < $n; $i++) {
            $role = $roles[$i];
            $s = $this->scoring->score(
                $member,
                $role,
                $room,
                $counters['N'],
                (int) ($counters['n'][$role] ?? 0)
            );
            if ($s > $bestScore) {
                $bestScore = $s;
                $bestRole = $role;
            }
        }

        return [$bestRole, $bestScore];
    }
}

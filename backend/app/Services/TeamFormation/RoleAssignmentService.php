<?php

namespace App\Services\TeamFormation;

/**
 * Phase 2 of team formation: within a single team, assign each member a role so
 * that every room role is covered at least once, maximizing total roleScore
 * (affinity + feedback reputation). Remaining members take their best role.
 */
final class RoleAssignmentService
{
    public function __construct(private readonly ScoringService $scoring) {}

    /**
     * @param  array<int, array<string, mixed>>  $members  members of one team
     * @param  array<int, string>  $roles  room roles
     * @return array<int, array{member_id:int, assigned_role:string, score:float}>
     */
    public function assign(array $members, array $roles): array
    {
        $roles = \array_values($roles);
        if ($members === [] || $roles === []) {
            return [];
        }

        // Precompute scores[memberId][role].
        $scores = [];
        foreach ($members as $m) {
            $id = (int) $m['id'];
            foreach ($roles as $role) {
                $scores[$id][$role] = $this->scoring->roleScore($m, $role);
            }
        }

        $assignedMembers = [];   // memberId => true
        $result = [];

        // Coverage pass: fill the scarcest roles first. Scarcity = how few members
        // have meaningful affinity for that role (so hard-to-fill roles get first pick).
        $roleOrder = $this->rolesByScarcity($roles, $scores);

        foreach ($roleOrder as $role) {
            $bestId = null;
            $bestScore = -1.0;
            foreach ($members as $m) {
                $id = (int) $m['id'];
                if (isset($assignedMembers[$id])) {
                    continue;
                }
                $s = $scores[$id][$role];
                if ($s > $bestScore || ($s === $bestScore && ($bestId === null || $id < $bestId))) {
                    $bestScore = $s;
                    $bestId = $id;
                }
            }

            if ($bestId === null) {
                // More roles than members in this team — cannot cover further.
                break;
            }

            $assignedMembers[$bestId] = true;
            $result[] = ['member_id' => $bestId, 'assigned_role' => $role, 'score' => $bestScore];
        }

        // Remaining members take their highest-scoring role (duplicates allowed).
        foreach ($members as $m) {
            $id = (int) $m['id'];
            if (isset($assignedMembers[$id])) {
                continue;
            }

            $bestRole = $roles[0];
            $bestScore = $scores[$id][$bestRole];
            foreach ($roles as $role) {
                if ($scores[$id][$role] > $bestScore) {
                    $bestScore = $scores[$id][$role];
                    $bestRole = $role;
                }
            }

            $assignedMembers[$id] = true;
            $result[] = ['member_id' => $id, 'assigned_role' => $bestRole, 'score' => $bestScore];
        }

        return $result;
    }

    /**
     * Order roles ascending by number of members with positive affinity-driven
     * score, so scarce roles are assigned before popular ones. Tie-break: keep
     * original room order.
     *
     * @param  array<int, string>  $roles
     * @param  array<int, array<string, float>>  $scores
     * @return array<int, string>
     */
    private function rolesByScarcity(array $roles, array $scores): array
    {
        $candidateCount = [];
        foreach ($roles as $role) {
            $count = 0;
            foreach ($scores as $byRole) {
                if (($byRole[$role] ?? 0.0) > 0.0) {
                    $count++;
                }
            }
            $candidateCount[$role] = $count;
        }

        $ordered = $roles;
        \usort($ordered, static function (string $a, string $b) use ($candidateCount, $roles): int {
            $cmp = $candidateCount[$a] <=> $candidateCount[$b];
            if ($cmp !== 0) {
                return $cmp;
            }

            return \array_search($a, $roles, true) <=> \array_search($b, $roles, true);
        });

        return $ordered;
    }
}

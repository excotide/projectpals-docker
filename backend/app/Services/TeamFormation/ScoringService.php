<?php

namespace App\Services\TeamFormation;

final class ScoringService
{
    public const C = 0.5;

    public const WEIGHT_ROLE_AFFINITY = 0.6;

    public const WEIGHT_TIME_COMPATIBILITY = 0.3;

    public const WEIGHT_EXPLORATION = 0.1;

    public function score(array $member, string $role, array $room, int $totalPicks, int $rolePicks): float
    {
        return self::WEIGHT_ROLE_AFFINITY * $this->roleAffinity($member, $role)
            + self::WEIGHT_TIME_COMPATIBILITY * $this->timeCompatibility($member, $room)
            + self::WEIGHT_EXPLORATION * $this->explorationBonus($totalPicks, $rolePicks);
    }

    public function roleAffinity(array $member, string $role): float
    {
        $primary = $member['primary_role'] ?? null;
        if ($primary !== null && $primary === $role) {
            return 1.0;
        }

        $backup = $member['backup_role'] ?? null;
        if ($backup !== null && $backup === $role) {
            return 0.5;
        }

        return 0.0;
    }

    public function timeCompatibility(array $member, array $room): float
    {
        $memberWindows = $this->normalizeWindows($member['productivity_windows'] ?? []);
        $roomWindows = $this->normalizeWindows($room['productivity_windows'] ?? []);

        if ($memberWindows === [] || $roomWindows === []) {
            return 1.0;
        }

        if (\in_array('flexible', $memberWindows, true) || \in_array('flexible', $roomWindows, true)) {
            return 1.0;
        }

        $intersection = \array_values(\array_intersect($memberWindows, $roomWindows));
        $union = \array_values(\array_unique(\array_merge($memberWindows, $roomWindows)));

        if ($union === []) {
            return 1.0;
        }

        return \count($intersection) / \count($union);
    }

    public function explorationBonus(int $totalPicks, int $rolePicks): float
    {
        return self::C * \sqrt(\log($totalPicks + 1) / ($rolePicks + 1));
    }

    /**
     * Compute the full (member_id, role) score matrix at the given counter state.
     *
     * @param  array<int, array<string, mixed>>  $members
     * @param  array<string, mixed>  $room
     * @param  array{N:int, n:array<string,int>}  $counters
     * @return array<int, array<string, float>>
     */
    public function scoreMatrix(array $members, array $room, array $counters): array
    {
        $roles = \is_array($room['roles'] ?? null) ? $room['roles'] : [];
        $totalPicks = (int) ($counters['N'] ?? 0);
        $rolePicksMap = \is_array($counters['n'] ?? null) ? $counters['n'] : [];

        $matrix = [];
        foreach ($members as $member) {
            $memberId = (int) $member['id'];
            $matrix[$memberId] = [];
            foreach ($roles as $role) {
                $rolePicks = (int) ($rolePicksMap[$role] ?? 0);
                $matrix[$memberId][$role] = $this->score($member, $role, $room, $totalPicks, $rolePicks);
            }
        }

        return $matrix;
    }

    /**
     * @param  mixed  $windows
     * @return array<int, string>
     */
    private function normalizeWindows($windows): array
    {
        if (! \is_array($windows)) {
            return [];
        }

        $filtered = \array_filter($windows, static fn ($w) => \is_string($w) && $w !== '');

        return \array_values(\array_unique($filtered));
    }
}

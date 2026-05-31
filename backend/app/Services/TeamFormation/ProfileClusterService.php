<?php

namespace App\Services\TeamFormation;

/**
 * Phase 1 of team formation: group members into K teams so that members with
 * similar profiles (Productivity Windows + Work Environment) land on the same
 * team. Sizes are balanced (as even as possible, capped at max_per_group).
 */
final class ProfileClusterService
{
    /**
     * @param  array<int, array<string, mixed>>  $members
     * @return array<int, array<int, array<string, mixed>>>  K clusters of members
     */
    public function cluster(array $members, int $kTeams, int $maxPerGroup): array
    {
        $kTeams = \max(1, $kTeams);

        // Deterministic base order by id.
        \usort($members, static fn (array $a, array $b): int => ((int) $a['id']) <=> ((int) $b['id']));

        $n = \count($members);
        $targets = $this->targetSizes($n, $kTeams, $maxPerGroup);

        $clusters = \array_fill(0, $kTeams, []);
        if ($n === 0) {
            return $clusters;
        }

        // Seeds: pick K members that are mutually most dissimilar.
        $seedIdx = $this->pickSeeds($members, $kTeams);
        $assigned = [];
        foreach ($seedIdx as $c => $mi) {
            $clusters[$c][] = $members[$mi];
            $assigned[$mi] = true;
        }

        // Assign each remaining member to the non-full cluster with the highest
        // average profile similarity; tie-break by lower cluster index.
        for ($mi = 0; $mi < $n; $mi++) {
            if (isset($assigned[$mi])) {
                continue;
            }

            $bestCluster = -1;
            $bestSim = -1.0;
            for ($c = 0; $c < $kTeams; $c++) {
                if (\count($clusters[$c]) >= $targets[$c]) {
                    continue;
                }
                $sim = $this->avgSimilarity($members[$mi], $clusters[$c]);
                if ($sim > $bestSim) {
                    $bestSim = $sim;
                    $bestCluster = $c;
                }
            }

            // Safety: if every cluster hit its target (rounding), drop into the smallest.
            if ($bestCluster === -1) {
                $bestCluster = $this->smallestCluster($clusters);
            }

            $clusters[$bestCluster][] = $members[$mi];
            $assigned[$mi] = true;
        }

        return $clusters;
    }

    /**
     * @return array<int, int>
     */
    private function targetSizes(int $n, int $kTeams, int $maxPerGroup): array
    {
        $base = intdiv($n, $kTeams);
        $remainder = $n % $kTeams;

        $sizes = [];
        for ($c = 0; $c < $kTeams; $c++) {
            $size = $base + ($c < $remainder ? 1 : 0);
            if ($maxPerGroup > 0) {
                $size = \min($size, $maxPerGroup);
            }
            $sizes[$c] = $size;
        }

        return $sizes;
    }

    /**
     * Greedy farthest-point seeding: first seed = member 0; each next seed is the
     * member with the lowest max-similarity to already chosen seeds.
     *
     * @param  array<int, array<string, mixed>>  $members
     * @return array<int, int>  cluster index → member index
     */
    private function pickSeeds(array $members, int $kTeams): array
    {
        $n = \count($members);
        $seeds = [0];

        while (\count($seeds) < $kTeams && \count($seeds) < $n) {
            $bestMi = -1;
            $bestScore = \PHP_FLOAT_MAX; // we want the member whose closeness to seeds is lowest
            for ($mi = 0; $mi < $n; $mi++) {
                if (\in_array($mi, $seeds, true)) {
                    continue;
                }
                $maxSim = 0.0;
                foreach ($seeds as $si) {
                    $maxSim = \max($maxSim, $this->profileSim($members[$mi], $members[$si]));
                }
                if ($maxSim < $bestScore) {
                    $bestScore = $maxSim;
                    $bestMi = $mi;
                }
            }
            $seeds[] = $bestMi;
        }

        // If fewer members than teams, pad with the last seed (empty clusters allowed).
        while (\count($seeds) < $kTeams) {
            $seeds[] = $seeds[\count($seeds) - 1] ?? 0;
        }

        return $seeds;
    }

    /**
     * @param  array<int, array<string, mixed>>  $cluster
     */
    private function avgSimilarity(array $member, array $cluster): float
    {
        if ($cluster === []) {
            return 0.0;
        }

        $sum = 0.0;
        foreach ($cluster as $other) {
            $sum += $this->profileSim($member, $other);
        }

        return $sum / \count($cluster);
    }

    /**
     * @param  array<int, array<int, mixed>>  $clusters
     */
    private function smallestCluster(array $clusters): int
    {
        $best = 0;
        $min = \count($clusters[0]);
        for ($c = 1, $k = \count($clusters); $c < $k; $c++) {
            if (\count($clusters[$c]) < $min) {
                $min = \count($clusters[$c]);
                $best = $c;
            }
        }

        return $best;
    }

    private function profileSim(array $a, array $b): float
    {
        $windows = $this->setSim($a['productivity_windows'] ?? [], $b['productivity_windows'] ?? []);
        $envs = $this->setSim($a['environments'] ?? [], $b['environments'] ?? []);

        return 0.5 * $windows + 0.5 * $envs;
    }

    /**
     * Jaccard similarity with "flexible" acting as a wildcard (matches anything).
     *
     * @param  mixed  $a
     * @param  mixed  $b
     */
    private function setSim($a, $b): float
    {
        $a = $this->normalize($a);
        $b = $this->normalize($b);

        if ($a === [] && $b === []) {
            return 1.0;
        }
        if (\in_array('flexible', $a, true) || \in_array('flexible', $b, true)) {
            return 1.0;
        }

        $intersection = \array_intersect($a, $b);
        $union = \array_unique(\array_merge($a, $b));

        return $union === [] ? 1.0 : \count($intersection) / \count($union);
    }

    /**
     * @param  mixed  $values
     * @return array<int, string>
     */
    private function normalize($values): array
    {
        if (! \is_array($values)) {
            return [];
        }

        $filtered = \array_filter($values, static fn ($v) => \is_string($v) && $v !== '');

        return \array_values(\array_unique($filtered));
    }
}

<?php

namespace App\Services;

use App\Models\CanonicalRole;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Normalizes free-form role/skill input into a canonical role name.
 *
 * Two layers (validated by the Python prototype in test/fitur.py):
 *   1. Fuzzy lookup against existing canonical roles (token_sort_ratio >= threshold).
 *   2. AI fallback via Groq (llama-3.1-8b-instant), then fuzzy-check again before
 *      treating the AI output as a brand-new canonical role.
 *
 * Failures of the AI layer degrade gracefully: the cleaned input is returned as-is.
 */
final class RoleNormalizer
{
    /** Minimum token_sort_ratio (0-100) for a fuzzy match to be accepted. */
    private const FUZZY_THRESHOLD = 80.0;

    /**
     * Normalize and persist a new canonical role when one is discovered.
     * Used when actually saving a room.
     */
    public function normalize(string $input): string
    {
        return $this->resolve($input, persist: true)['normalized'];
    }

    /**
     * Read-only normalization for live preview. Never writes to the database.
     *
     * @return array{original: string, normalized: string, changed: bool}
     */
    public function preview(string $input): array
    {
        return $this->resolve($input, persist: false);
    }

    /**
     * @return array{original: string, normalized: string, changed: bool}
     */
    private function resolve(string $input, bool $persist): array
    {
        $cleaned = $this->clean($input);

        $canonical = $this->canonicalize($cleaned, $persist);

        return [
            'original' => $input,
            'normalized' => $canonical,
            'changed' => $canonical !== $cleaned,
        ];
    }

    private function canonicalize(string $cleaned, bool $persist): string
    {
        if ($cleaned === '') {
            return $cleaned;
        }

        // Layer 1: fuzzy lookup against existing canonical roles.
        if ($match = $this->fuzzyLookup($cleaned)) {
            return $match;
        }

        // Layer 2: AI fallback.
        $ai = $this->askAi($cleaned);

        if ($ai === null) {
            // Graceful fallback: keep the cleaned input as the canonical value.
            if ($persist) {
                CanonicalRole::firstOrCreate(['name' => $cleaned]);
            }

            return $cleaned;
        }

        // Re-check the DB: the AI output may already be (close to) an existing canonical.
        if ($match = $this->fuzzyLookup($ai)) {
            return $match;
        }

        if ($persist) {
            CanonicalRole::firstOrCreate(['name' => $ai]);
        }

        return $ai;
    }

    private function clean(string $s): string
    {
        return Str::lower(trim($s));
    }

    /**
     * Return the best-matching canonical role name when its token_sort_ratio
     * reaches the threshold, otherwise null.
     */
    private function fuzzyLookup(string $cleaned): ?string
    {
        if ($cleaned === '') {
            return null;
        }

        $best = null;
        $bestScore = 0.0;

        foreach (CanonicalRole::query()->pluck('name') as $candidate) {
            $score = $this->tokenSortRatio($cleaned, (string) $candidate);
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = (string) $candidate;
            }
        }

        return $bestScore >= self::FUZZY_THRESHOLD ? $best : null;
    }

    /**
     * PHP approximation of rapidfuzz token_sort_ratio: sort whitespace tokens in
     * each string, then compare with similar_text() (which yields a 0-100 percent).
     */
    private function tokenSortRatio(string $a, string $b): float
    {
        $a = $this->sortTokens($a);
        $b = $this->sortTokens($b);

        if ($a === '' && $b === '') {
            return 100.0;
        }

        similar_text($a, $b, $percent);

        return (float) $percent;
    }

    private function sortTokens(string $s): string
    {
        $tokens = preg_split('/\s+/', trim($s), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        sort($tokens);

        return implode(' ', $tokens);
    }

    /**
     * Ask Groq to normalize the role. Returns a cleaned canonical string, or null
     * on any failure (missing key, network error, unexpected payload).
     */
    private function askAi(string $input): ?string
    {
        $key = config('services.groq.key');

        if (empty($key)) {
            return null;
        }

        $prompt = 'You are a role name normalizer for a team project platform. '
            .'Convert the following role input into a simple, commonly used role name in English. '
            .'Use 1-3 words only, lowercase, no special characters. '
            .'Return ONLY the normalized role name, nothing else.'
            ."\n\nInput: ".$input;

        try {
            $response = Http::withToken($key)
                ->timeout(10)
                ->post(rtrim((string) config('services.groq.base_url'), '/').'/chat/completions', [
                    'model' => config('services.groq.model'),
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens' => 20,
                    'temperature' => 0.1,
                ]);

            if (! $response->successful()) {
                return null;
            }

            $content = $response->json('choices.0.message.content');

            if (! \is_string($content)) {
                return null;
            }

            $sanitized = $this->sanitizeAiOutput($content);

            return $sanitized === '' ? null : $sanitized;
        } catch (Throwable $e) {
            Log::warning('Groq role normalization failed', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Small instruction-tuned models occasionally echo the prompt, wrap the answer
     * in quotes, or emit "input -> output" formats. Strip all that down to a clean
     * 1-3 word, lowercase, alnum/hyphen role name before it can be stored.
     */
    private function sanitizeAiOutput(string $content): string
    {
        // Keep only the first line.
        $line = trim((string) strtok($content, "\n"));

        // If the model answered with "x -> y" or "x: y", keep the trailing part.
        if (($pos = strrpos($line, '->')) !== false) {
            $line = substr($line, $pos + 2);
        }
        if (($pos = strrpos($line, ':')) !== false) {
            $line = substr($line, $pos + 1);
        }

        $line = Str::lower($line);

        // Drop everything except letters, digits, spaces and hyphens.
        $line = preg_replace('/[^a-z0-9\s-]/', ' ', $line) ?? '';
        $line = trim(preg_replace('/\s+/', ' ', $line) ?? '');

        if ($line === '') {
            return '';
        }

        // Cap to the first 3 words, matching the prompt instruction.
        return implode(' ', \array_slice(explode(' ', $line), 0, 3));
    }
}

<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BulkDevUsersSeeder extends Seeder
{
    /** First dev index to create (inclusive). */
    public const START = 2;

    /** Last dev index to create (inclusive). dev2..dev50 = 49 users. */
    public const END = 50;

    /**
     * Seed 49 deterministic dev users (dev2..dev50) for testing.
     *
     * Usage:  php artisan db:seed --class=BulkDevUsersSeeder
     *
     * Login pattern for any user:
     *   email:    dev{N}@example.test   (e.g. dev2@example.test)
     *   username: dev{N}
     *   password: 12345678
     *
     * Idempotent: re-running updates existing dev users instead of creating duplicates.
     */
    public function run(): void
    {
        $passwordHash = Hash::make('12345678');
        $created = 0;
        $updated = 0;
        $total = 0;

        for ($i = self::START; $i <= self::END; $i++) {
            $email = "dev{$i}@example.test";
            $total++;

            $existing = User::query()->where('email', $email)->first();

            $payload = [
                'name' => "Dev User {$i}",
                'username' => "dev{$i}",
                'password' => $passwordHash,
                'email_verified_at' => now(),
            ];

            if ($existing) {
                $existing->forceFill($payload)->save();
                $updated++;
            } else {
                User::create([
                    'email' => $email,
                    ...$payload,
                ]);
                $created++;
            }
        }

        $this->command?->info("BulkDevUsersSeeder: created={$created}, updated={$updated}, total={$total}.");
        $this->command?->info('Login any of them (dev2..dev50) with password: 12345678');
    }
}

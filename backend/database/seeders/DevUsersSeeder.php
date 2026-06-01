<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevUsersSeeder extends Seeder
{
    public const COUNT = 50;

    /**
     * Seed 50 deterministic dev users for testing.
     *
     * Usage:  php artisan db:seed --class=DevUsersSeeder
     *
     * Login pattern for any user:
     *   email:    dev{N}@example.test   (e.g. dev1@example.test)
     *   username: dev{N}
     *   password: password123
     *
     * Idempotent: re-running updates existing dev users instead of creating duplicates.
     */
    public function run(): void
    {
        $count = self::COUNT;
        $passwordHash = Hash::make('password123');
        $created = 0;
        $updated = 0;

        for ($i = 1; $i <= $count; $i++) {
            $email = "dev{$i}@example.test";

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

        $this->command?->info("DevUsersSeeder: created={$created}, updated={$updated}, total={$count}.");
        $this->command?->info('Login any of them with password: password123');
    }
}

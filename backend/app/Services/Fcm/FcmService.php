<?php

namespace App\Services\Fcm;

use App\Models\FcmToken;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Throwable;

/**
 * Reusable wrapper around Firebase Cloud Messaging. Sends a notification +
 * data payload to one or many users' registered device tokens, and prunes
 * tokens that Firebase reports as invalid/unregistered.
 */
class FcmService
{
    /**
     * Send to every device token belonging to a single user.
     *
     * @param  array<string, scalar>  $data
     */
    public function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        $this->sendToUsers([$user->id], $title, $body, $data);
    }

    /**
     * Send to every device token belonging to the given users.
     *
     * @param  iterable<int|User>  $users  User ids or User models.
     * @param  array<string, scalar>  $data
     */
    public function sendToUsers(iterable $users, string $title, string $body, array $data = []): void
    {
        $userIds = [];
        foreach ($users as $u) {
            $userIds[] = $u instanceof User ? (int) $u->id : (int) $u;
        }
        $userIds = array_values(array_unique(array_filter($userIds)));

        if ($userIds === []) {
            return;
        }

        $tokens = FcmToken::query()
            ->whereIn('user_id', $userIds)
            ->pluck('token')
            ->all();

        $this->sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Core sender. Chunks to FCM's 500-token multicast limit and prunes dead
     * tokens. Degrades gracefully when there are no tokens or Firebase is not
     * configured (logs and returns instead of throwing).
     *
     * @param  array<int, string>  $tokens
     * @param  array<string, scalar>  $data
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): void
    {
        $tokens = array_values(array_unique(array_filter($tokens)));
        if ($tokens === []) {
            return;
        }

        try {
            $messaging = app(Messaging::class);
        } catch (Throwable $e) {
            Log::warning('FCM not configured; skipping push.', ['error' => $e->getMessage()]);

            return;
        }

        // FCM data values must be strings.
        $stringData = [];
        foreach ($data as $key => $value) {
            $stringData[(string) $key] = (string) $value;
        }

        $message = CloudMessage::new()
            ->withNotification(Notification::create($title, $body))
            ->withData($stringData);

        foreach (array_chunk($tokens, 500) as $chunk) {
            try {
                $report = $messaging->sendMulticast($message, $chunk);
            } catch (Throwable $e) {
                Log::error('FCM multicast failed.', ['error' => $e->getMessage()]);

                continue;
            }

            $dead = array_merge($report->invalidTokens(), $report->unknownTokens());
            if ($dead !== []) {
                FcmToken::query()->whereIn('token', $dead)->delete();
            }
        }
    }
}

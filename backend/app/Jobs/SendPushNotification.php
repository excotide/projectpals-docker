<?php

namespace App\Jobs;

use App\Services\Fcm\FcmService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Sends an FCM push to a set of users off the request lifecycle. With the
 * `sync` queue driver it runs inline; switch QUEUE_CONNECTION to `database`
 * (plus a worker) for true async delivery + retries.
 */
class SendPushNotification implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    /**
     * @param  array<int, int>  $userIds
     * @param  array<string, scalar>  $data
     */
    public function __construct(
        public array $userIds,
        public string $title,
        public string $body,
        public array $data = [],
    ) {}

    public function handle(FcmService $fcm): void
    {
        $fcm->sendToUsers($this->userIds, $this->title, $this->body, $this->data);
    }
}

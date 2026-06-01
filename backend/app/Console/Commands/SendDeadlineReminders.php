<?php

namespace App\Console\Commands;

use App\Jobs\SendPushNotification;
use App\Models\Team;
use App\Models\TeamMember;
use Illuminate\Console\Command;

class SendDeadlineReminders extends Command
{
    protected $signature = 'fcm:deadline-reminders';

    protected $description = 'Send a push reminder to members of teams whose deadline is approaching.';

    public function handle(): int
    {
        $hours = (int) config('services.fcm.reminder_hours', 24);
        $now = now();
        $threshold = $now->copy()->addHours($hours);

        // Teams that are not finished, have a deadline within the window, that
        // deadline has not passed yet, and which were not reminded already.
        $teams = Team::query()
            ->whereNull('finished_at')
            ->whereNull('deadline_reminder_sent_at')
            ->whereNotNull('deadline')
            ->where('deadline', '>', $now)
            ->where('deadline', '<=', $threshold)
            ->with('room')
            ->get();

        $sent = 0;
        foreach ($teams as $team) {
            $userIds = TeamMember::query()
                ->where('team_id', $team->id)
                ->with('roomMember')
                ->get()
                ->map(fn (TeamMember $tm) => (int) ($tm->roomMember->user_id ?? 0))
                ->filter()
                ->values()
                ->all();

            if ($userIds !== []) {
                $remaining = $now->diffForHumans($team->deadline, ['parts' => 2, 'syntax' => \Carbon\CarbonInterface::DIFF_ABSOLUTE]);
                $name = (string) ($team->project_name ?: $team->room?->project_theme);

                SendPushNotification::dispatch(
                    $userIds,
                    'Deadline mendekat',
                    "{$name} berakhir dalam {$remaining}. Selesaikan tugasmu!",
                    [
                        'type'      => 'deadline_reminder',
                        'room_code' => (string) ($team->room?->room_code ?? ''),
                        'team_id'   => (string) $team->id,
                        'deadline'  => (string) $team->deadline?->toIso8601String(),
                    ],
                );
                $sent++;
            }

            $team->update(['deadline_reminder_sent_at' => $now]);
        }

        $this->info("Deadline reminders dispatched for {$sent} team(s).");

        return self::SUCCESS;
    }
}

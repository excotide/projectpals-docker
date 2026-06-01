<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table): void {
            // Marks when the "deadline approaching" reminder was sent so the
            // scheduled command does not notify the same team repeatedly.
            $table->timestamp('deadline_reminder_sent_at')->nullable()->after('finished_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table): void {
            $table->dropColumn('deadline_reminder_sent_at');
        });
    }
};

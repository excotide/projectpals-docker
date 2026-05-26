<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_feedbacks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('from_room_member_id')->constrained('room_members')->cascadeOnDelete();
            $table->foreignId('to_room_member_id')->constrained('room_members')->cascadeOnDelete();
            $table->text('content');
            $table->timestamps();

            $table->unique(['team_id', 'from_room_member_id', 'to_room_member_id'], 'team_fb_pair_unique');
            $table->index(['team_id', 'to_room_member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_feedbacks');
    }
};

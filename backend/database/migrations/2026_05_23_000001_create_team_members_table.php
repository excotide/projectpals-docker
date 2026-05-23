<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('room_member_id')->constrained('room_members')->cascadeOnDelete();
            $table->string('assigned_role', 100);
            $table->decimal('score', 6, 4);
            $table->timestamps();

            $table->unique('room_member_id');
            $table->unique(['team_id', 'room_member_id']);
            $table->index('team_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};

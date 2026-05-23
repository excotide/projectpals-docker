<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->unsignedInteger('team_number');
            $table->timestamps();

            $table->unique(['room_id', 'team_number']);
            $table->index('room_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};

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
        Schema::create('rooms', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('project_theme', 255);
            $table->string('room_code', 10)->unique();
            $table->json('roles');
            $table->json('productivity_windows');
            $table->json('environments');
            $table->integer('max_per_group');
            $table->integer('number_of_groups');
            $table->enum('status', ['open', 'matching', 'ongoing', 'closed'])->default('open');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};

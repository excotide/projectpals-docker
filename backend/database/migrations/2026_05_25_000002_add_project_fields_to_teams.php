<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table): void {
            $table->string('project_name', 150)->nullable()->after('team_number');
            $table->text('description')->nullable()->after('project_name');
            $table->timestamp('deadline')->nullable()->after('description');
            $table->timestamp('finished_at')->nullable()->after('deadline');
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table): void {
            $table->dropColumn(['project_name', 'description', 'deadline', 'finished_at']);
        });
    }
};

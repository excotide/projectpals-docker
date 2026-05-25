<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table): void {
            $table->boolean('is_leader')->default(false)->after('score');
            $table->index(['team_id', 'is_leader']);
        });
    }

    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table): void {
            $table->dropIndex(['team_id', 'is_leader']);
            $table->dropColumn('is_leader');
        });
    }
};

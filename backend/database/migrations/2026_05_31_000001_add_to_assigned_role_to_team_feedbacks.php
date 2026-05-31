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
        Schema::table('team_feedbacks', function (Blueprint $table): void {
            $table->string('to_assigned_role', 100)->nullable()->after('to_room_member_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('team_feedbacks', function (Blueprint $table): void {
            $table->dropColumn('to_assigned_role');
        });
    }
};

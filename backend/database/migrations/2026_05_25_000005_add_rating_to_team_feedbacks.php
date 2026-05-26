<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_feedbacks', function (Blueprint $table): void {
            $table->unsignedTinyInteger('rating')->nullable()->after('to_room_member_id');
        });
    }

    public function down(): void
    {
        Schema::table('team_feedbacks', function (Blueprint $table): void {
            $table->dropColumn('rating');
        });
    }
};

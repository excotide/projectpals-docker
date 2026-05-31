<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table): void {
            $table->unsignedInteger('max_members')->nullable()->after('max_per_group');
        });

        DB::statement('UPDATE rooms SET max_members = max_per_group * number_of_groups WHERE max_members IS NULL');
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table): void {
            $table->dropColumn('max_members');
        });
    }
};

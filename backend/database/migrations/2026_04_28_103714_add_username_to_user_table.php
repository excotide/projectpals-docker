<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 30)->nullable();
        });

        DB::table('users')
            ->whereNull('username')
            ->update([
                'username' => DB::raw("SUBSTR('user_' || id, 1, 30)"),
            ]);

        Schema::table('users', function (Blueprint $table) {
            $table->unique('username');
        });

        DB::statement('alter table "USERS" modify ("USERNAME" not null)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};

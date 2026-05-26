<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Oracle does not allow direct ALTER on CLOB to add/remove NOT NULL.
        // Workaround: add a new nullable column, copy data, drop original, rename.
        DB::statement('ALTER TABLE team_feedbacks ADD content_new CLOB NULL');
        DB::statement('UPDATE team_feedbacks SET content_new = content');
        DB::statement('ALTER TABLE team_feedbacks DROP COLUMN content');
        DB::statement('ALTER TABLE team_feedbacks RENAME COLUMN content_new TO content');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE team_feedbacks ADD content_old CLOB');
        DB::statement('UPDATE team_feedbacks SET content_old = NVL(content, \' \')');
        DB::statement('ALTER TABLE team_feedbacks DROP COLUMN content');
        DB::statement('ALTER TABLE team_feedbacks RENAME COLUMN content_old TO content');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Migrate stale values to the new canonical set:
        //   matched  -> ongoing  (rename: same semantic)
        //   closed   -> ongoing  (closed is dropped; treat as ongoing)
        DB::statement("UPDATE rooms SET status = 'ongoing' WHERE status IN ('matched', 'closed')");

        // Drop existing CHECK constraint (auto-generated or named rooms_status_check)
        DB::unprepared(<<<'SQL'
DECLARE
BEGIN
  FOR rec IN (
    SELECT c.constraint_name AS name
    FROM   user_constraints c
    JOIN   user_cons_columns cc
      ON   cc.constraint_name = c.constraint_name
    WHERE  c.table_name = 'ROOMS'
      AND  c.constraint_type = 'C'
      AND  cc.column_name = 'STATUS'
      AND  UPPER(c.search_condition_vc) LIKE '%''OPEN''%''MATCHING''%''ONGOING''%'
  ) LOOP
    EXECUTE IMMEDIATE 'ALTER TABLE rooms DROP CONSTRAINT '||rec.name;
  END LOOP;
END;
SQL);

        DB::statement(<<<'SQL'
ALTER TABLE rooms
  ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('open','matching','ongoing'))
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
DECLARE
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE rooms DROP CONSTRAINT rooms_status_check';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -2443 THEN
      RAISE;
    END IF;
END;
SQL);

        DB::statement(<<<'SQL'
ALTER TABLE rooms
  ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('open','matching','ongoing','closed','matched'))
SQL);
    }
};

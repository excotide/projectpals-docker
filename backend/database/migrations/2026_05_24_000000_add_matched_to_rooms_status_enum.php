<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Oracle stores enums as CHECK constraints with auto-generated names.
        // Find any check constraint on ROOMS.STATUS that lists the old enum values, drop it, re-add with 'matched'.
        DB::unprepared(<<<'SQL'
DECLARE
  v_name VARCHAR2(128);
BEGIN
  FOR rec IN (
    SELECT c.constraint_name AS name
    FROM   user_constraints c
    JOIN   user_cons_columns cc
      ON   cc.constraint_name = c.constraint_name
    WHERE  c.table_name = 'ROOMS'
      AND  c.constraint_type = 'C'
      AND  cc.column_name = 'STATUS'
      AND  UPPER(c.search_condition_vc) LIKE '%''OPEN''%''MATCHING''%''ONGOING''%''CLOSED''%'
  ) LOOP
    EXECUTE IMMEDIATE 'ALTER TABLE rooms DROP CONSTRAINT '||rec.name;
  END LOOP;
END;
SQL);

        DB::statement(<<<'SQL'
ALTER TABLE rooms
  ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('open','matching','ongoing','closed','matched'))
SQL);
    }

    public function down(): void
    {
        // Reverse: any rows with 'matched' must be moved back before we restore the old narrower check.
        DB::statement("UPDATE rooms SET status = 'ongoing' WHERE status = 'matched'");

        DB::unprepared(<<<'SQL'
DECLARE
  v_name VARCHAR2(128) := 'ROOMS_STATUS_CHECK';
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE rooms DROP CONSTRAINT '||v_name;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -2443 THEN  -- ORA-02443: cannot drop nonexistent constraint
      RAISE;
    END IF;
END;
SQL);

        DB::statement(<<<'SQL'
ALTER TABLE rooms
  ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('open','matching','ongoing','closed'))
SQL);
    }
};

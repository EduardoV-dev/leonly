BEGIN;

ALTER TABLE "spaces"
  ALTER COLUMN "invite_code_expires_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3);

ALTER TABLE "space_members"
  ALTER COLUMN "onboarding_completed_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3);

ALTER TABLE "files"
  ALTER COLUMN "operation_lock_expires_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3);

ALTER TABLE "memories"
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3);

ALTER TABLE "memory_comments"
  ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3);

ALTER TABLE "memory_reactions"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3);

ALTER TABLE "outbox_event"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3),
  ALTER COLUMN "published_at" TYPE TIMESTAMPTZ(3);

CREATE OR REPLACE FUNCTION "private"."set_space_updated_at"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := GREATEST(pg_catalog.clock_timestamp()::timestamptz(3), OLD.updated_at + interval '1 millisecond');
  RETURN NEW;
END;
$$;

COMMIT;

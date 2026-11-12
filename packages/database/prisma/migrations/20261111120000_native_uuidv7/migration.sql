BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE "spaces" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "space_members" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "files" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "memories" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "memory_comments" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "memory_reactions" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "outbox_events" ALTER COLUMN "id" SET DEFAULT uuidv7();

DROP FUNCTION IF EXISTS "private"."uuid_v7"() RESTRICT;

COMMIT;

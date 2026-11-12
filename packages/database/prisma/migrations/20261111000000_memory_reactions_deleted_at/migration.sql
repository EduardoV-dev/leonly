ALTER TABLE "memory_reactions" ADD COLUMN "deleted_at" TIMESTAMPTZ(3);

DROP INDEX "memory_reactions_memory_id";
CREATE INDEX "memory_reactions_memory_deleted_at" ON "memory_reactions" ("memory_id", "deleted_at");

ALTER TABLE "outbox_event" RENAME TO "outbox_events";

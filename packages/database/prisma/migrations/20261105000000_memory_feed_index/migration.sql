CREATE INDEX "memories_active_feed_idx"
ON "memories" ("space_id", "visibility", "memory_date", "created_at", "id")
WHERE "deleted_at" IS NULL;

BEGIN;

ALTER TABLE "memories" DROP CONSTRAINT "memories_cover_asset_id_id_fkey";
ALTER TABLE "memories" DROP COLUMN "cover_asset_id";

DROP TABLE "memory_asset_objects";
DROP TABLE "memory_assets";
DROP TABLE "file_uploads";

DROP TYPE "memory_object_status";
DROP TYPE "memory_object_variant";
DROP TYPE "memory_asset_type";
DROP TYPE "file_upload_status";
DROP TYPE "file_upload_purpose";
DROP TYPE "file_category";

CREATE TYPE "file_purpose" AS ENUM ('memory_image');
CREATE TYPE "file_status" AS ENUM ('pending', 'uploaded', 'ready', 'failed', 'deleting');

CREATE TABLE "files" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "space_id" UUID NOT NULL,
  "uploaded_by_user_id" TEXT NOT NULL,
  "original_file_id" UUID,
  "variant_name" TEXT,
  "object_key" TEXT NOT NULL,
  "original_filename" TEXT,
  "mime_type" TEXT NOT NULL,
  "size_bytes" BIGINT,
  "purpose" "file_purpose" NOT NULL,
  "status" "file_status" NOT NULL DEFAULT 'pending',
  "operation_lock_token" UUID,
  "operation_lock_expires_at" TIMESTAMPTZ(6),
  "last_error_code" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "files_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "files_variant_fields_pair" CHECK (
    ("original_file_id" IS NULL) = ("variant_name" IS NULL)
  ),
  CONSTRAINT "files_not_self_referential" CHECK (
    "original_file_id" IS NULL OR "original_file_id" <> "id"
  ),
  CONSTRAINT "files_variant_name_nonblank" CHECK (
    "variant_name" IS NULL OR char_length(btrim("variant_name")) > 0
  ),
  CONSTRAINT "files_original_metadata_required" CHECK (
    "original_file_id" IS NOT NULL OR (
      "original_filename" IS NOT NULL AND char_length(btrim("original_filename")) > 0 AND
      "size_bytes" IS NOT NULL AND "size_bytes" > 0
    )
  ),
  CONSTRAINT "files_size_positive" CHECK ("size_bytes" IS NULL OR "size_bytes" > 0),
  CONSTRAINT "files_ready_size_required" CHECK ("status" <> 'ready' OR "size_bytes" IS NOT NULL),
  CONSTRAINT "files_operation_lock_pair" CHECK (
    ("operation_lock_token" IS NULL) = ("operation_lock_expires_at" IS NULL)
  )
);

CREATE TABLE "memory_files" (
  "memory_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "position" SMALLINT NOT NULL,
  CONSTRAINT "memory_files_pkey" PRIMARY KEY ("memory_id", "file_id"),
  CONSTRAINT "memory_files_position_nonnegative" CHECK ("position" >= 0)
);

ALTER TABLE "memories" ADD COLUMN "cover_file_id" UUID;

CREATE UNIQUE INDEX "files_id_space_unique" ON "files" ("id", "space_id");
CREATE UNIQUE INDEX "files_object_key_unique" ON "files" ("object_key");
CREATE UNIQUE INDEX "files_original_variant_unique" ON "files" ("original_file_id", "variant_name");
CREATE INDEX "files_status_created_at" ON "files" ("status", "created_at");
CREATE INDEX "files_space_uploader" ON "files" ("space_id", "uploaded_by_user_id");

CREATE UNIQUE INDEX "memory_files_file_unique" ON "memory_files" ("file_id");
CREATE UNIQUE INDEX "memory_files_memory_position_unique" ON "memory_files" ("memory_id", "position");

ALTER TABLE "files" ADD CONSTRAINT "files_space_id_fkey"
  FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_fkey"
  FOREIGN KEY ("uploaded_by_user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_original_file_id_space_id_fkey"
  FOREIGN KEY ("original_file_id", "space_id") REFERENCES "files" ("id", "space_id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "memory_files" ADD CONSTRAINT "memory_files_memory_id_space_id_fkey"
  FOREIGN KEY ("memory_id", "space_id") REFERENCES "memories" ("id", "space_id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "memory_files" ADD CONSTRAINT "memory_files_file_id_space_id_fkey"
  FOREIGN KEY ("file_id", "space_id") REFERENCES "files" ("id", "space_id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "memories" ADD CONSTRAINT "memories_id_cover_file_id_fkey"
  FOREIGN KEY ("id", "cover_file_id") REFERENCES "memory_files" ("memory_id", "file_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "outbox_event" RENAME COLUMN "aggregate_type" TO "entity_type";
ALTER TABLE "outbox_event" RENAME COLUMN "aggregate_id" TO "entity_id";
ALTER TABLE "outbox_event" RENAME COLUMN "publication_attempts" TO "publish_attempt_count";
ALTER TABLE "outbox_event" RENAME COLUMN "last_publication_error" TO "last_publish_error_code";
ALTER TABLE "outbox_event" DROP CONSTRAINT "outbox_event_schema_positive";
ALTER TABLE "outbox_event" DROP COLUMN "schema_version";
ALTER TABLE "outbox_event" RENAME CONSTRAINT "outbox_event_identity_required" TO "outbox_event_entity_identity_required";
ALTER TABLE "outbox_event" RENAME CONSTRAINT "outbox_event_attempts_nonnegative" TO "outbox_event_publish_attempt_count_nonnegative";

COMMIT;

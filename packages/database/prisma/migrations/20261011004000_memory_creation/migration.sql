CREATE TYPE "file_category" AS ENUM ('image');
CREATE TYPE "file_upload_purpose" AS ENUM ('memory_image');
CREATE TYPE "file_upload_status" AS ENUM ('issued', 'finalizing', 'finalized', 'consumed', 'failed');
CREATE TYPE "memory_visibility" AS ENUM ('timeline', 'vault');
CREATE TYPE "memory_asset_type" AS ENUM ('image');
CREATE TYPE "memory_object_variant" AS ENUM ('original', 'cover', 'detail');
CREATE TYPE "memory_object_status" AS ENUM ('pending', 'processing', 'ready', 'failed');

CREATE TABLE "file_uploads" (
  "id" UUID NOT NULL DEFAULT "private"."uuid_v7"(),
  "uploader_user_id" TEXT NOT NULL,
  "space_id" UUID,
  "category" "file_category" NOT NULL,
  "purpose" "file_upload_purpose" NOT NULL,
  "original_filename" TEXT NOT NULL,
  "declared_mime_type" TEXT NOT NULL,
  "declared_byte_size" INTEGER NOT NULL,
  "verified_mime_type" TEXT,
  "verified_byte_size" INTEGER,
  "staging_key" TEXT NOT NULL,
  "intended_final_key" TEXT NOT NULL,
  "status" "file_upload_status" NOT NULL DEFAULT 'issued',
  "upload_url_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "attachment_deadline" TIMESTAMPTZ(6) NOT NULL,
  "lease_token" UUID,
  "lease_expires_at" TIMESTAMPTZ(6),
  "consumed_at" TIMESTAMPTZ(6),
  "failure_code" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "file_uploads_memory_space_required" CHECK (
    "purpose" <> 'memory_image' OR ("space_id" IS NOT NULL AND "category" = 'image')
  ),
  CONSTRAINT "file_uploads_filename_required" CHECK (char_length(btrim("original_filename")) > 0),
  CONSTRAINT "file_uploads_declared_size" CHECK ("declared_byte_size" BETWEEN 1 AND 5242880),
  CONSTRAINT "file_uploads_declared_mime" CHECK (
    "declared_mime_type" IN ('image/jpeg', 'image/png', 'image/webp')
  ),
  CONSTRAINT "file_uploads_verified_size" CHECK ("verified_byte_size" BETWEEN 1 AND 5242880),
  CONSTRAINT "file_uploads_verified_mime" CHECK (
    "verified_mime_type" IN ('image/jpeg', 'image/png', 'image/webp')
  ),
  CONSTRAINT "file_uploads_verified_metadata_pair" CHECK (
    ("verified_mime_type" IS NULL) = ("verified_byte_size" IS NULL)
  ),
  CONSTRAINT "file_uploads_finalized_metadata" CHECK (
    "status" NOT IN ('finalized', 'consumed') OR
    ("verified_mime_type" IS NOT NULL AND "verified_byte_size" IS NOT NULL)
  ),
  CONSTRAINT "file_uploads_staging_key_format" CHECK (
    "purpose" <> 'memory_image' OR
    "staging_key" = 'staging/memories/' || "space_id"::text || '/' || "id"::text || '/original'
  ),
  CONSTRAINT "file_uploads_final_key_format" CHECK (
    "purpose" <> 'memory_image' OR
    "intended_final_key" = 'memories/' || "space_id"::text || '/' || "id"::text || '/original'
  ),
  CONSTRAINT "file_uploads_deadlines" CHECK (
    "upload_url_expires_at" > "created_at" AND "attachment_deadline" > "created_at"
  ),
  CONSTRAINT "file_uploads_lease_pair" CHECK (
    ("lease_token" IS NULL) = ("lease_expires_at" IS NULL)
  ),
  CONSTRAINT "file_uploads_finalizing_lease" CHECK (
    "status" <> 'finalizing' OR "lease_token" IS NOT NULL
  ),
  CONSTRAINT "file_uploads_consumed_timestamp" CHECK (
    ("status" = 'consumed') = ("consumed_at" IS NOT NULL)
  )
);

CREATE TABLE "memories" (
  "id" UUID NOT NULL DEFAULT "private"."uuid_v7"(),
  "space_id" UUID NOT NULL,
  "created_by_user_id" TEXT NOT NULL,
  "created_by_member_id" UUID NOT NULL,
  "cover_asset_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "memory_date" DATE NOT NULL,
  "visibility" "memory_visibility" NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  "idempotency_key" UUID NOT NULL,
  "creation_request_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memories_title_length" CHECK (char_length(btrim("title")) BETWEEN 1 AND 120),
  CONSTRAINT "memories_description_length" CHECK (char_length("description") <= 2000),
  CONSTRAINT "memories_location_length" CHECK (char_length("location") <= 150),
  CONSTRAINT "memories_creation_hash_format" CHECK ("creation_request_hash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "memory_assets" (
  "id" UUID NOT NULL DEFAULT "private"."uuid_v7"(),
  "space_id" UUID NOT NULL,
  "memory_id" UUID NOT NULL,
  "upload_id" UUID NOT NULL,
  "asset_type" "memory_asset_type" NOT NULL DEFAULT 'image',
  "position" SMALLINT NOT NULL,
  "generation_recipe_version" INTEGER NOT NULL DEFAULT 1,
  "processing_lease_token" UUID,
  "processing_lease_expires_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memory_assets_position_nonnegative" CHECK ("position" >= 0),
  CONSTRAINT "memory_assets_recipe_positive" CHECK ("generation_recipe_version" > 0),
  CONSTRAINT "memory_assets_processing_lease_pair" CHECK (
    ("processing_lease_token" IS NULL) = ("processing_lease_expires_at" IS NULL)
  )
);

CREATE TABLE "memory_asset_objects" (
  "id" UUID NOT NULL DEFAULT "private"."uuid_v7"(),
  "asset_id" UUID NOT NULL,
  "variant_type" "memory_object_variant" NOT NULL,
  "object_path" TEXT NOT NULL,
  "status" "memory_object_status" NOT NULL DEFAULT 'pending',
  "mime_type" TEXT,
  "byte_size" INTEGER,
  "failure_code" TEXT,
  "ready_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_asset_objects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memory_asset_objects_final_path" CHECK (
    "object_path" ~ '^memories/[0-9a-f-]{36}/[0-9a-f-]{36}/(original|cover\.webp|detail\.webp)$'
  ),
  CONSTRAINT "memory_asset_objects_size_positive" CHECK ("byte_size" > 0),
  CONSTRAINT "memory_asset_objects_mime_supported" CHECK (
    "mime_type" IN ('image/jpeg', 'image/png', 'image/webp')
  ),
  CONSTRAINT "memory_asset_objects_ready_metadata" CHECK (
    "status" <> 'ready' OR
    ("mime_type" IS NOT NULL AND "byte_size" IS NOT NULL AND "ready_at" IS NOT NULL)
  ),
  CONSTRAINT "memory_asset_objects_original_ready" CHECK (
    "variant_type" <> 'original' OR "status" = 'ready'
  ),
  CONSTRAINT "memory_asset_objects_variant_mime" CHECK (
    "variant_type" = 'original' OR "mime_type" IS NULL OR "mime_type" = 'image/webp'
  ),
  CONSTRAINT "memory_asset_objects_variant_path" CHECK (
    ("variant_type" = 'original' AND "object_path" LIKE '%/original') OR
    ("variant_type" = 'cover' AND "object_path" LIKE '%/cover.webp') OR
    ("variant_type" = 'detail' AND "object_path" LIKE '%/detail.webp')
  )
);

CREATE TABLE "outbox_event" (
  "id" UUID NOT NULL DEFAULT "private"."uuid_v7"(),
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMPTZ(6),
  "publication_attempts" INTEGER NOT NULL DEFAULT 0,
  "last_publication_error" TEXT,
  CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_event_identity_required" CHECK (
    char_length(btrim("aggregate_type")) > 0 AND char_length(btrim("aggregate_id")) > 0 AND
    char_length(btrim("event_type")) > 0
  ),
  CONSTRAINT "outbox_event_schema_positive" CHECK ("schema_version" > 0),
  CONSTRAINT "outbox_event_attempts_nonnegative" CHECK ("publication_attempts" >= 0),
  CONSTRAINT "outbox_event_payload_object" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE UNIQUE INDEX "file_uploads_staging_key_unique" ON "file_uploads" ("staging_key");
CREATE UNIQUE INDEX "file_uploads_final_key_unique" ON "file_uploads" ("intended_final_key");
CREATE UNIQUE INDEX "file_uploads_id_space_unique" ON "file_uploads" ("id", "space_id");
CREATE INDEX "file_uploads_owner_eligibility"
  ON "file_uploads" ("uploader_user_id", "space_id", "status", "attachment_deadline");
CREATE INDEX "file_uploads_status_deadline" ON "file_uploads" ("status", "attachment_deadline");
CREATE UNIQUE INDEX "memories_creation_key_unique"
  ON "memories" ("space_id", "created_by_user_id", "idempotency_key");
CREATE UNIQUE INDEX "memories_id_space_unique" ON "memories" ("id", "space_id");
CREATE INDEX "memories_creator_membership"
  ON "memories" ("created_by_member_id", "created_by_user_id", "space_id");
CREATE UNIQUE INDEX "memory_assets_upload_unique" ON "memory_assets" ("upload_id");
CREATE UNIQUE INDEX "memory_assets_memory_position_unique" ON "memory_assets" ("memory_id", "position");
CREATE UNIQUE INDEX "memory_assets_id_memory_unique" ON "memory_assets" ("id", "memory_id");
CREATE UNIQUE INDEX "memory_asset_objects_path_unique" ON "memory_asset_objects" ("object_path");
CREATE UNIQUE INDEX "memory_asset_objects_asset_variant_unique"
  ON "memory_asset_objects" ("asset_id", "variant_type");
CREATE INDEX "outbox_event_unpublished" ON "outbox_event" ("created_at", "id")
  WHERE "published_at" IS NULL;

ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_uploader_user_id_fkey"
  FOREIGN KEY ("uploader_user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_space_id_fkey"
  FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "memories" ADD CONSTRAINT "memories_space_id_fkey"
  FOREIGN KEY ("space_id") REFERENCES "spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "memories" ADD CONSTRAINT "memories_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "memories" ADD CONSTRAINT "memories_created_by_member_id_created_by_user_id_space_id_fkey"
  FOREIGN KEY ("created_by_member_id", "created_by_user_id", "space_id")
  REFERENCES "space_members" ("id", "user_id", "space_id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "memories" ADD CONSTRAINT "memories_cover_asset_id_id_fkey"
  FOREIGN KEY ("cover_asset_id", "id") REFERENCES "memory_assets" ("id", "memory_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "memory_assets" ADD CONSTRAINT "memory_assets_memory_id_space_id_fkey"
  FOREIGN KEY ("memory_id", "space_id") REFERENCES "memories" ("id", "space_id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "memory_assets" ADD CONSTRAINT "memory_assets_upload_id_space_id_fkey"
  FOREIGN KEY ("upload_id", "space_id") REFERENCES "file_uploads" ("id", "space_id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "memory_asset_objects" ADD CONSTRAINT "memory_asset_objects_asset_id_fkey"
  FOREIGN KEY ("asset_id") REFERENCES "memory_assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "private"."protect_memory_creation_identity"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.creation_request_hash IS DISTINCT FROM OLD.creation_request_hash OR
     NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR
     NEW.space_id IS DISTINCT FROM OLD.space_id OR
     NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id OR
     NEW.created_by_member_id IS DISTINCT FROM OLD.created_by_member_id THEN
    RAISE EXCEPTION 'Memory creation identity is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "memories_creation_identity" BEFORE UPDATE ON "memories"
  FOR EACH ROW EXECUTE FUNCTION "private"."protect_memory_creation_identity"();
CREATE TRIGGER "file_uploads_updated_at" BEFORE UPDATE ON "file_uploads"
  FOR EACH ROW EXECUTE FUNCTION "private"."set_space_updated_at"();
CREATE TRIGGER "memories_updated_at" BEFORE UPDATE ON "memories"
  FOR EACH ROW EXECUTE FUNCTION "private"."set_space_updated_at"();
CREATE TRIGGER "memory_assets_updated_at" BEFORE UPDATE ON "memory_assets"
  FOR EACH ROW EXECUTE FUNCTION "private"."set_space_updated_at"();
CREATE TRIGGER "memory_asset_objects_updated_at" BEFORE UPDATE ON "memory_asset_objects"
  FOR EACH ROW EXECUTE FUNCTION "private"."set_space_updated_at"();

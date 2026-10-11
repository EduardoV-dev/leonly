CREATE SCHEMA IF NOT EXISTS "private";

CREATE FUNCTION "private"."uuid_v7"() RETURNS uuid
LANGUAGE sql VOLATILE SET search_path = pg_catalog AS $$
  SELECT (
    pg_catalog.lpad(
      pg_catalog.to_hex(pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.clock_timestamp()) * 1000)::bigint),
      12,
      '0'
    ) || '7' || pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 14)
  )::uuid;
$$;

CREATE TYPE "space_member_role" AS ENUM ('owner', 'partner');

CREATE TABLE "spaces" (
  "id" UUID NOT NULL DEFAULT "private"."uuid_v7"(),
  "name" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "invite_code" TEXT,
  "invite_code_expires_at" TIMESTAMPTZ(6),
  "created_by_user_id" TEXT NOT NULL,
  "updated_by_user_id" TEXT NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "spaces_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "spaces_name_length" CHECK (char_length(btrim("name")) BETWEEN 2 AND 100),
  CONSTRAINT "spaces_invite_expiry_pair" CHECK (("invite_code" IS NULL) = ("invite_code_expires_at" IS NULL)),
  CONSTRAINT "spaces_invite_code_format" CHECK (
    "invite_code" IS NULL OR "invite_code" ~ '^(leo|lov|mem|our|duo|two|joy|sun|lny)[abcdefghjkmnpqrstuvwxyz23456789]{5}$'
  )
);

CREATE TABLE "space_members" (
  "id" UUID NOT NULL DEFAULT "private"."uuid_v7"(),
  "space_id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "role" "space_member_role" NOT NULL,
  "onboarding_completed_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "space_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "space_members_display_name_length" CHECK (char_length(btrim("display_name")) BETWEEN 2 AND 100),
  CONSTRAINT "space_members_id_user_space_unique" UNIQUE ("id", "user_id", "space_id"),
  CONSTRAINT "space_members_id_space_unique" UNIQUE ("id", "space_id")
);

CREATE UNIQUE INDEX "spaces_active_invite_code_unique" ON "spaces" ("invite_code")
  WHERE "deleted_at" IS NULL AND "invite_code" IS NOT NULL;
CREATE INDEX "spaces_created_by_user_id" ON "spaces" ("created_by_user_id");
CREATE INDEX "spaces_updated_by_user_id" ON "spaces" ("updated_by_user_id");
CREATE UNIQUE INDEX "space_members_active_user_unique" ON "space_members" ("user_id")
  WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "space_members_active_space_user_unique" ON "space_members" ("space_id", "user_id")
  WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "space_members_active_space_role_unique" ON "space_members" ("space_id", "role")
  WHERE "deleted_at" IS NULL;
CREATE INDEX "space_members_space_id" ON "space_members" ("space_id");

ALTER TABLE "spaces" ADD CONSTRAINT "spaces_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_fkey"
  FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION "private"."set_space_updated_at"() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER "spaces_updated_at" BEFORE UPDATE ON "spaces"
  FOR EACH ROW EXECUTE FUNCTION "private"."set_space_updated_at"();
CREATE TRIGGER "space_members_updated_at" BEFORE UPDATE ON "space_members"
  FOR EACH ROW EXECUTE FUNCTION "private"."set_space_updated_at"();

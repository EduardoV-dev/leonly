CREATE TYPE "memory_reaction_type" AS ENUM ('heart', 'laugh', 'cry', 'star');

CREATE TABLE "memory_reactions" (
  "id" UUID NOT NULL DEFAULT "private"."uuid_v7"(),
  "space_id" UUID NOT NULL,
  "memory_id" UUID NOT NULL,
  "reacted_by_member_id" UUID NOT NULL,
  "reaction_type" "memory_reaction_type" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memory_reactions_memory_id_space_id_fkey"
    FOREIGN KEY ("memory_id", "space_id") REFERENCES "memories" ("id", "space_id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "memory_reactions_reacted_by_member_id_space_id_fkey"
    FOREIGN KEY ("reacted_by_member_id", "space_id") REFERENCES "space_members" ("id", "space_id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "memory_reactions_member_memory_unique"
  ON "memory_reactions" ("reacted_by_member_id", "memory_id");
CREATE INDEX "memory_reactions_memory_id" ON "memory_reactions" ("memory_id");

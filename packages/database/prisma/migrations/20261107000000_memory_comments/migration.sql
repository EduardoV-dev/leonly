CREATE TABLE "memory_comments" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "memory_id" UUID NOT NULL,
  "space_id" UUID NOT NULL,
  "author_membership_id" UUID NOT NULL,
  "parent_comment_id" UUID,
  "body" TEXT NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memory_comments_body_length" CHECK (char_length("body") <= 1000 AND char_length(btrim("body")) > 0),
  CONSTRAINT "memory_comments_memory_fkey" FOREIGN KEY ("memory_id", "space_id")
    REFERENCES "memories" ("id", "space_id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "memory_comments_author_fkey" FOREIGN KEY ("author_membership_id", "space_id")
    REFERENCES "space_members" ("id", "space_id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "memory_comments_id_memory_space_unique"
  ON "memory_comments" ("id", "memory_id", "space_id");
ALTER TABLE "memory_comments" ADD CONSTRAINT "memory_comments_parent_fkey"
  FOREIGN KEY ("parent_comment_id", "memory_id", "space_id")
  REFERENCES "memory_comments" ("id", "memory_id", "space_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX "memory_comments_thread_order"
  ON "memory_comments" ("memory_id", "space_id", "parent_comment_id", "created_at", "id");

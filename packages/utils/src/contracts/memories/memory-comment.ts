import { z } from "zod";
import { baseCursorSchema } from "../cursor";

export const commentCursorSchema = baseCursorSchema.extend({
  createdAt: baseCursorSchema.shape.createdAt.refine((value) => /\.\d{6}Z$/.test(value)),
  memoryId: z.uuid(),
  parentCommentId: z.uuid().nullable(),
});

export type CommentCursor = z.infer<typeof commentCursorSchema>;

type CommentBase = {
  id: string;
  memoryId: string;
  createdAt: string;
  replyCount: number;
};

export const memoryCommentSchema = z.strictObject({
  authorAvatarUrl: z.string().nullable(),
  authorDisplayName: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  deletedAt: z.null(),
  id: z.uuid(),
  isAuthor: z.boolean(),
  memoryId: z.uuid(),
  parentCommentId: z.uuid().nullable(),
  replyCount: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
});

export type MemoryComment = z.infer<typeof memoryCommentSchema>;
export type DeletedComment = CommentBase & { deletedAt: string };
export type RootComment = MemoryComment | DeletedComment;

export type CommentPage<T> = {
  data: T[];
  meta: { nextCursor: string | null; resetCursor: boolean };
};

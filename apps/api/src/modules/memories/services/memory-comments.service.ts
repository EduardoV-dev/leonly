import { Prisma } from "@leonly/database/client";
import {
  type CommentPage,
  commentCursorSchema,
  encodeCursor,
  type MemoryComment,
  type RootComment,
} from "@leonly/utils/contracts";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  POSTGRES_TIMESTAMP_FORMAT,
  STALE_RESOURCE_MESSAGE,
} from "../../../common/constants/timestamp.constants";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  createCursorPage,
  decodePaginationCursor,
} from "../../../common/utils/cursor-pagination.util";
import { MembershipsService } from "../../spaces/services/memberships.service";
import { MemoriesService } from "./memories.service";

const COMMENT_PAGE_SIZE = 20;

type ReadCommentsParams = {
  userId: string;
  memoryId: string;
  parentCommentId: string | null;
  cursor?: string;
};
type CommentRow = {
  id: string;
  memoryId: string;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  isAuthor: boolean;
  replyCount: number;
};

type CommentScope = { userId: string; memoryId: string };
type CreateCommentParams = CommentScope & {
  body: string;
  parentCommentId: string | null;
};
type EditCommentParams = CommentScope & {
  commentId: string;
  lastKnownUpdatedAt: string;
  body: string;
};
type DeleteCommentParams = Omit<EditCommentParams, "body">;
type Member = { id: string; spaceId: string };
type CommentResult = Omit<MemoryComment, "deletedAt"> & { deletedAt: string | null };
type RequireMemoryParams = CommentScope & {
  transaction?: Prisma.TransactionClient;
  lock?: boolean;
};
type GetCommentParams = { transaction: Prisma.TransactionClient; commentId: string };

@Injectable()
export class MemoryCommentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly membershipsService: MembershipsService,
    private readonly memoriesService: MemoriesService,
  ) {}

  async read({
    userId,
    memoryId,
    parentCommentId,
    cursor: encoded,
  }: ReadCommentsParams): Promise<CommentPage<RootComment>> {
    const cursor = decodePaginationCursor({ schema: commentCursorSchema, cursor: encoded });

    const membership = await this.membershipsService.requireActiveMembership({ userId });
    await this.memoriesService.requireActiveMemory({ userId, memoryId, membership });

    if (parentCommentId) {
      const parent = await this.prismaService.memoryComment.findFirst({
        where: {
          id: parentCommentId,
          memoryId,
          spaceId: membership.spaceId,
          parentCommentId: null,
        },
        select: { id: true },
      });

      if (!parent) throw new NotFoundException("Memory unavailable.");
    }

    const thread = parentCommentId
      ? Prisma.sql`c.parent_comment_id = ${parentCommentId}::uuid AND c.deleted_at IS NULL`
      : Prisma.sql`c.parent_comment_id IS NULL AND (c.deleted_at IS NULL OR EXISTS (
          SELECT 1 FROM memory_comments r WHERE r.parent_comment_id = c.id
            AND r.memory_id = c.memory_id AND r.space_id = c.space_id AND r.deleted_at IS NULL
        ))`;

    const scope = Prisma.sql`c.memory_id = ${memoryId}::uuid AND c.space_id = ${membership.spaceId}::uuid
      AND EXISTS (SELECT 1 FROM memories m JOIN spaces s ON s.id = m.space_id
        JOIN space_members sm ON sm.space_id = s.id
        WHERE m.id = c.memory_id AND m.space_id = c.space_id AND m.deleted_at IS NULL
          AND s.deleted_at IS NULL AND sm.id = ${membership.id}::uuid AND sm.user_id = ${userId}
          AND sm.deleted_at IS NULL) AND ${thread}`;

    let resetCursor =
      cursor !== null &&
      (cursor.memoryId !== memoryId || cursor.parentCommentId !== parentCommentId);

    if (cursor && !resetCursor) {
      const anchor = await this.prismaService.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT c.id FROM memory_comments c WHERE ${scope} AND c.id = ${cursor.id}::uuid
          AND c.created_at = ${cursor.createdAt}::timestamptz LIMIT 1
      `);
      resetCursor = anchor.length === 0;
    }

    const position =
      cursor && !resetCursor
        ? Prisma.sql`AND (c.created_at, c.id) ${parentCommentId ? Prisma.sql`>` : Prisma.sql`<`}
          (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
        : Prisma.empty;

    const direction = parentCommentId ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const rows = await this.prismaService.$queryRaw<CommentRow[]>(Prisma.sql`
      SELECT c.id, c.memory_id AS "memoryId", c.parent_comment_id AS "parentCommentId", c.body,
        to_char(c.created_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "createdAt",
        to_char(c.updated_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "updatedAt",
        to_char(c.deleted_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "deletedAt",
        a.display_name AS "authorDisplayName", u.image AS "authorAvatarUrl",
        (c.author_membership_id = ${membership.id}::uuid) AS "isAuthor",
        (SELECT count(*)::int FROM memory_comments r WHERE r.parent_comment_id = c.id
          AND r.memory_id = c.memory_id AND r.space_id = c.space_id AND r.deleted_at IS NULL) AS "replyCount"
      FROM memory_comments c JOIN space_members a ON a.id = c.author_membership_id AND a.space_id = c.space_id
        JOIN "user" u ON u.id = a.user_id
      WHERE ${scope} ${position} ORDER BY c.created_at ${direction}, c.id ${direction}
      LIMIT ${COMMENT_PAGE_SIZE + 1}
    `);

    const { data: page, nextCursor } = createCursorPage({
      rows,
      limit: COMMENT_PAGE_SIZE,
      encodeNextCursor: (last) =>
        encodeCursor({
          schema: commentCursorSchema,
          payload: { id: last.id, createdAt: last.createdAt, memoryId, parentCommentId },
        }),
    });

    const comments: RootComment[] = page.map((row) => {
      const base = {
        id: row.id,
        memoryId: row.memoryId,
        createdAt: row.createdAt,
        replyCount: row.replyCount,
      };

      if (row.deletedAt !== null) return { ...base, deletedAt: row.deletedAt };

      return {
        ...base,
        deletedAt: null,
        parentCommentId: row.parentCommentId,
        body: row.body,
        updatedAt: row.updatedAt,
        authorDisplayName: row.authorDisplayName,
        authorAvatarUrl: row.authorAvatarUrl,
        isAuthor: row.isAuthor,
      };
    });

    return { data: comments, meta: { nextCursor, resetCursor } };
  }

  private async requireMemory({
    transaction,
    userId,
    memoryId,
    lock = false,
  }: RequireMemoryParams): Promise<Member> {
    const member = await this.membershipsService.requireActiveMembership({
      userId,
      transaction,
      lock,
    });
    await this.memoriesService.requireActiveMemory({
      userId,
      memoryId,
      membership: member,
      options: { transaction, lock },
    });
    return member;
  }

  private async getComment({ transaction, commentId }: GetCommentParams): Promise<MemoryComment> {
    const rows = await transaction.$queryRaw<CommentResult[]>`
      SELECT c.id, c.memory_id AS "memoryId", c.parent_comment_id AS "parentCommentId", c.body,
        to_char(c.created_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "createdAt",
        to_char(c.updated_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "updatedAt",
        to_char(c.deleted_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "deletedAt",
        a.display_name AS "authorDisplayName", u.image AS "authorAvatarUrl", true AS "isAuthor",
        (SELECT count(*)::int FROM memory_comments r WHERE r.parent_comment_id = c.id AND r.deleted_at IS NULL) AS "replyCount"
      FROM memory_comments c JOIN space_members a ON a.id = c.author_membership_id
      JOIN "user" u ON u.id = a.user_id WHERE c.id = ${commentId}::uuid
    `;
    const comment = rows[0];
    if (!comment || comment.deletedAt !== null) throw new NotFoundException("Memory unavailable.");
    return { ...comment, deletedAt: null };
  }

  async create({
    userId,
    memoryId,
    body,
    parentCommentId,
  }: CreateCommentParams): Promise<MemoryComment> {
    const normalized = body.trim();
    return this.prismaService.$transaction(async (transaction) => {
      const member = await this.requireMemory({ transaction, userId, memoryId, lock: true });
      if (parentCommentId) {
        const parent = await transaction.$queryRaw<{ id: string }[]>`
          SELECT id FROM memory_comments WHERE id = ${parentCommentId}::uuid AND memory_id = ${memoryId}::uuid
            AND space_id = ${member.spaceId}::uuid AND parent_comment_id IS NULL AND deleted_at IS NULL FOR UPDATE
        `;
        if (!parent.length) throw new NotFoundException("Memory unavailable.");
      }

      const created = await transaction.memoryComment.create({
        data: {
          memoryId,
          spaceId: member.spaceId,
          authorMembershipId: member.id,
          parentCommentId,
          body: normalized,
        },
        select: { id: true },
      });
      return this.getComment({
        transaction,
        commentId: created.id,
      });
    });
  }

  async edit({
    userId,
    memoryId,
    commentId,
    body,
    lastKnownUpdatedAt,
  }: EditCommentParams): Promise<MemoryComment> {
    return this.prismaService.$transaction(async (transaction) => {
      const member = await this.requireMemory({ transaction, userId, memoryId });
      await this.updateComment({
        transaction,
        member,
        userId,
        memoryId,
        commentId,
        lastKnownUpdatedAt,
        body: body.trim(),
      });
      return this.getComment({ transaction, commentId });
    });
  }

  async remove({
    userId,
    memoryId,
    commentId,
    lastKnownUpdatedAt,
  }: DeleteCommentParams): Promise<{ deletedCommentId: string }> {
    const member = await this.requireMemory({ userId, memoryId });
    await this.updateComment({
      transaction: this.prismaService,
      member,
      userId,
      memoryId,
      commentId,
      lastKnownUpdatedAt,
      body: null,
    });
    return { deletedCommentId: commentId };
  }

  private async updateComment({
    transaction,
    member,
    userId,
    memoryId,
    commentId,
    lastKnownUpdatedAt,
    body,
  }: {
    transaction: Prisma.TransactionClient;
    member: Member;
    userId: string;
    memoryId: string;
    commentId: string;
    lastKnownUpdatedAt: string;
    body: string | null;
  }): Promise<void> {
    const rows = await transaction.$queryRaw<{ id: string }[]>`
      SELECT id FROM memory_comments WHERE id = ${commentId}::uuid AND memory_id = ${memoryId}::uuid
        AND space_id = ${member.spaceId}::uuid AND author_membership_id = ${member.id}::uuid
        AND deleted_at IS NULL
    `;
    if (!rows.length) throw new NotFoundException("Memory unavailable.");
    const updated = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
      UPDATE memory_comments SET
        ${body === null ? Prisma.sql`deleted_at = clock_timestamp()` : Prisma.sql`body = ${body}`},
        updated_at = greatest(clock_timestamp()::timestamptz(3), updated_at + interval '1 millisecond')
      WHERE id = ${commentId}::uuid AND updated_at = ${lastKnownUpdatedAt}::timestamptz
        AND memory_id = ${memoryId}::uuid AND space_id = ${member.spaceId}::uuid
        AND author_membership_id = ${member.id}::uuid AND deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM memories m JOIN spaces s ON s.id = m.space_id
          JOIN space_members sm ON sm.space_id = s.id
          WHERE m.id = memory_comments.memory_id AND m.space_id = memory_comments.space_id
            AND m.deleted_at IS NULL AND s.deleted_at IS NULL AND sm.id = ${member.id}::uuid
            AND sm.user_id = ${userId} AND sm.deleted_at IS NULL
        ) RETURNING id
    `);
    if (!updated.length) throw new ConflictException({ error: STALE_RESOURCE_MESSAGE });
  }
}

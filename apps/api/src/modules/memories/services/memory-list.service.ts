import { type MemoryVisibility, Prisma } from "@leonly/database/client";
import {
  decodeCursor,
  encodeCursor,
  InvalidCursorError,
  type MemoryCursor,
  type MemoryListPage,
  memoryCursorSchema,
} from "@leonly/utils/contracts";
import { ObjectStorage } from "@leonly/utils/storage";
import { BadRequestException, Injectable } from "@nestjs/common";
import { POSTGRES_TIMESTAMP_FORMAT } from "../../../common/constants/timestamp.constants";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { MembershipsService } from "../../spaces/services/memberships.service";
import type { ListMemoriesDto } from "../dtos/list-memories.dto";

const PAGE_SIZE = 10;
const COVER_URL_SECONDS = 300;

type MemoryRow = {
  id: string;
  title: string;
  memoryDate: string;
  createdAt: string;
  description: string | null;
  location: string | null;
};

type ListParams = {
  userId: string;
  visibility: MemoryVisibility;
  query: ListMemoriesDto;
  limit?: number;
};

@Injectable()
export class MemoryListService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storage: ObjectStorage,
    private readonly membershipsService: MembershipsService,
  ) {}

  async list({
    userId,
    visibility,
    query,
    limit = PAGE_SIZE,
  }: ListParams): Promise<MemoryListPage> {
    const sort = query.sort ?? "newest";
    let cursor: MemoryCursor | null = null;

    if (query.cursor !== undefined) {
      try {
        cursor = decodeCursor({ schema: memoryCursorSchema, cursor: query.cursor });
      } catch (error) {
        if (error instanceof InvalidCursorError) {
          throw new BadRequestException({ error: "Invalid cursor." });
        }
        throw error;
      }
    }

    const membership = await this.membershipsService.requireActiveMembership(userId);

    const scope = Prisma.sql`
      m.space_id = ${membership.spaceId}::uuid AND m.visibility = ${visibility}::memory_visibility
      AND m.deleted_at IS NULL AND EXISTS (
        SELECT 1 FROM space_members sm JOIN spaces s ON s.id = sm.space_id
        WHERE sm.id = ${membership.id}::uuid AND sm.user_id = ${userId}
          AND sm.space_id = m.space_id AND sm.deleted_at IS NULL AND s.deleted_at IS NULL
      )`;

    let cursorReset = cursor !== null && cursor.sort !== sort;
    if (cursor && !cursorReset) {
      const anchor = await this.prismaService.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT m.id FROM memories m WHERE ${scope} AND m.id = ${cursor.id}::uuid
          AND m.memory_date = ${cursor.memoryDate}::date
          AND m.created_at = ${cursor.createdAt}::timestamptz LIMIT 1
      `);
      cursorReset = anchor.length === 0;
    }

    const position =
      cursor && !cursorReset
        ? Prisma.sql`AND (m.memory_date, m.created_at, m.id) ${
            sort === "newest" ? Prisma.sql`<` : Prisma.sql`>`
          } (${cursor.memoryDate}::date, ${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
        : Prisma.empty;

    const direction = sort === "newest" ? Prisma.sql`DESC` : Prisma.sql`ASC`;

    const rows = await this.prismaService.$queryRaw<MemoryRow[]>(Prisma.sql`
      SELECT m.id, m.title, to_char(m.memory_date, 'YYYY-MM-DD') AS "memoryDate",
        to_char(m.created_at AT TIME ZONE 'UTC', ${POSTGRES_TIMESTAMP_FORMAT}) AS "createdAt",
        m.description, m.location
      FROM memories m WHERE ${scope} ${position}
      ORDER BY m.memory_date ${direction}, m.created_at ${direction}, m.id ${direction}
      LIMIT ${limit + 1}
    `);

    const page = rows.slice(0, limit);
    const covers = await this.prismaService.memory.findMany({
      where: {
        id: { in: page.map(({ id }) => id) },
        spaceId: membership.spaceId,
        visibility,
        deletedAt: null,
        space: {
          deletedAt: null,
          members: { some: { id: membership.id, userId, deletedAt: null } },
        },
      },
      select: {
        id: true,
        coverFile: {
          select: {
            file: {
              select: {
                variants: {
                  where: { variantName: "cover", status: "ready", spaceId: membership.spaceId },
                  select: { objectKey: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const coversById = new Map(
      covers.map(({ id, coverFile }) => [id, coverFile?.file.variants[0]?.objectKey]),
    );

    const items = await Promise.all(
      page.map(async (row) => {
        const key = coversById.get(row.id);

        return {
          ...row,
          coverPhotoUrl: key
            ? await this.storage.signObject({ key, expiresIn: COVER_URL_SECONDS })
            : null,
        };
      }),
    );

    const last = page.at(-1);
    const nextCursor =
      rows.length > limit && last
        ? encodeCursor({
            schema: memoryCursorSchema,
            payload: {
              sort,
              id: last.id,
              memoryDate: last.memoryDate,
              createdAt: last.createdAt,
            },
          })
        : null;

    return { data: items, meta: { nextCursor, cursorReset } };
  }
}

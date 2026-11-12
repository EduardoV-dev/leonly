import { randomUUID } from "node:crypto";
import { type File, type Memory, Prisma } from "@leonly/database/client";
import { vi } from "vitest";
import { MEMBER_ID, matchesUpload, SPACE_ID } from "./prisma-predicates";

export type EditFixtureState = {
  uploads: Map<string, File>;
  memories: Memory[];
  memoryFiles: { memoryId: string; fileId: string; spaceId: string; position: number }[];
  events: Record<string, unknown>[];
  hasActiveMembership: boolean;
  isInTransaction: boolean;
  rollbacks: number;
};

// Mirrors POSTGRES_TIMESTAMP_FORMAT: 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'.
export function formatToken(date: Date): string {
  return date.toISOString().replace(/(\.\d{3})Z$/, "$1000Z");
}

type ConditionalUpdateValues = {
  title: string;
  description: string | null;
  location: string | null;
  memoryDate: string;
  visibility: string;
  memoryId: string;
  lastKnownUpdatedAt: string;
  spaceId: string;
  memberId: string;
  userId: string;
};

export function createEditPrismaStub({
  state,
  runTransaction,
}: {
  state: EditFixtureState;
  runTransaction: (operation: (transaction: unknown) => Promise<unknown>) => Promise<unknown>;
}) {
  return {
    spaceMember: {
      findFirst: vi.fn(async () =>
        state.hasActiveMembership ? { id: MEMBER_ID, spaceId: SPACE_ID } : null,
      ),
    },
    file: {
      findFirst: vi.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          [...state.uploads.values()].find((upload) => matchesUpload({ upload, where })) ?? null,
      ),
      updateMany: vi.fn(
        async ({ where, data }: { where: Record<string, unknown>; data: Partial<File> }) => {
          const uploads = [...state.uploads.values()].filter((upload) =>
            matchesUpload({ upload, where }),
          );
          for (const upload of uploads) state.uploads.set(upload.id, { ...upload, ...data });
          return { count: uploads.length };
        },
      ),
    },
    memory: {
      // Availability lookups carry an AND scope whose first entry holds the base filter;
      // the cover read selects by id only.
      findFirst: vi.fn(async ({ where }: { where: { id?: string; AND?: unknown[] } }) => {
        const scope = Array.isArray(where.AND)
          ? (where.AND[0] as { id: string; spaceId: string; deletedAt: null })
          : null;
        const memoryId = scope?.id ?? where.id;
        const memory = state.memories.find(
          (candidate) =>
            candidate.id === memoryId &&
            candidate.spaceId === SPACE_ID &&
            candidate.deletedAt === null &&
            (!Array.isArray(where.AND) || state.hasActiveMembership),
        );
        if (!memory) return null;

        return Array.isArray(where.AND) ? { id: memory.id } : { coverFileId: memory.coverFileId };
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { coverFileId: string | null };
        }) => {
          const memory = state.memories.find((candidate) => candidate.id === where.id);
          if (!memory) throw new Error("Missing memory");
          Object.assign(memory, data);
          return memory;
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { coverFileId: string | null };
        }) => {
          const matched = state.memories.filter((candidate) => candidate.id === where.id);
          for (const memory of matched) Object.assign(memory, data);
          return { count: matched.length };
        },
      ),
    },
    memoryFile: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { memoryId: string; spaceId: string; fileId?: { notIn?: string[] } };
        }) =>
          state.memoryFiles.filter(
            (association) =>
              association.memoryId === where.memoryId &&
              association.spaceId === where.spaceId &&
              !(where.fileId?.notIn ?? []).includes(association.fileId),
          ),
      ),
      deleteMany: vi.fn(
        async ({
          where,
        }: {
          where: { memoryId: string; spaceId: string; fileId?: { in?: string[] } };
        }) => {
          const removals = state.memoryFiles.filter(
            (association) =>
              association.memoryId === where.memoryId &&
              association.spaceId === where.spaceId &&
              (where.fileId?.in ?? []).includes(association.fileId),
          );
          state.memoryFiles = state.memoryFiles.filter(
            (association) => !removals.includes(association),
          );
          return { count: removals.length };
        },
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: { memoryId: string; fileId: string; spaceId: string; position: number };
        }) => {
          assertMemoryFileSlot(data);
          state.memoryFiles.push(data);
          return data;
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { memoryId_fileId: { memoryId: string; fileId: string } };
          data: { position: number };
        }) => {
          const association = state.memoryFiles.find(
            (candidate) =>
              candidate.memoryId === where.memoryId_fileId.memoryId &&
              candidate.fileId === where.memoryId_fileId.fileId,
          );
          if (!association) throw new Error("Missing attachment");
          assertMemoryFileSlot({ ...association, ...data }, association.fileId);
          association.position = data.position;
          return association;
        },
      ),
    },
    outboxEvent: {
      create: vi.fn(
        async ({ data }: { data: Record<string, unknown> }): Promise<Record<string, unknown>> => {
          const event = {
            ...data,
            id: randomUUID(),
            createdAt: new Date(),
            publishedAt: null,
            publishAttemptCount: 0,
            lastPublishErrorCode: null,
          };
          state.events.push(event);
          return event;
        },
      ),
    },
    $queryRaw: vi.fn(async (query: TemplateStringsArray, ...values: unknown[]) =>
      runRawQuery(query, values),
    ),
    $executeRaw: vi.fn(async (query: TemplateStringsArray, ...values: unknown[]) => {
      const sql = query.join("?");
      if (sql.includes("UPDATE memory_files mf SET position")) {
        reserveTemporaryPositions(values as string[]);
        return 1;
      }

      throw new Error(`Unexpected raw statement: ${sql}`);
    }),
    $transaction: vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) =>
      runTransaction(operation),
    ),
  };

  // The conditional update passes values in statement order: metadata, then predicate.
  function readConditionalValues(values: unknown[]): ConditionalUpdateValues {
    const [
      title,
      description,
      location,
      memoryDate,
      visibility,
      memoryId,
      lastKnownUpdatedAt,
      spaceId,
      memberId,
      userId,
    ] = values as [
      string,
      string | null,
      string | null,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];

    return {
      title,
      description,
      location,
      memoryDate,
      visibility,
      memoryId,
      lastKnownUpdatedAt,
      spaceId,
      memberId,
      userId,
    };
  }

  async function runRawQuery(
    query: TemplateStringsArray,
    values: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const sql = query.join("?");

    if (sql.includes("UPDATE memories SET")) {
      const input = readConditionalValues(values);
      const memory = state.memories.find(
        (candidate) =>
          candidate.id === input.memoryId &&
          candidate.spaceId === input.spaceId &&
          candidate.deletedAt === null &&
          candidate.updatedAt.getTime() === new Date(input.lastKnownUpdatedAt).getTime(),
      );
      const isMemberActive =
        state.hasActiveMembership && input.memberId === MEMBER_ID && input.userId === "user-a";
      if (!memory || !isMemberActive) return [];

      Object.assign(memory, {
        title: input.title,
        description: input.description,
        location: input.location,
        memoryDate: new Date(`${input.memoryDate}T00:00:00.000Z`),
        visibility: input.visibility,
        updatedAt: new Date(Math.max(Date.now(), memory.updatedAt.getTime() + 1)),
      });

      return [
        { id: memory.id, visibility: memory.visibility, updatedAt: formatToken(memory.updatedAt) },
      ];
    }

    if (sql.includes("FROM space_members c JOIN spaces")) {
      return state.hasActiveMembership ? [{ id: MEMBER_ID }] : [];
    }

    if (sql.includes("FROM memory_files")) {
      return state.memoryFiles
        .filter(
          (association) => association.memoryId === values[0] && association.spaceId === values[1],
        )
        .sort((first, second) => first.position - second.position)
        .map(({ fileId, position }) => ({ fileId, position }));
    }

    if (sql.includes("SELECT to_char")) {
      const memory = state.memories.find((candidate) => candidate.id === values[1]);
      if (!memory) throw new Error("Missing memory");

      return [{ updatedAt: formatToken(memory.updatedAt) }];
    }

    throw new Error(`Unexpected raw query: ${sql}`);
  }

  function reserveTemporaryPositions(values: string[]): void {
    const [memoryId, ,] = values;
    const associations = state.memoryFiles
      .filter((association) => association.memoryId === memoryId)
      .sort((first, second) => first.position - second.position);
    for (const [index, association] of associations.entries()) {
      association.position = 1000 + index;
    }
  }

  function assertMemoryFileSlot(
    data: { memoryId: string; fileId: string; position: number },
    excludeFileId?: string,
  ): void {
    const others = state.memoryFiles.filter((association) => association.fileId !== excludeFileId);
    const hasDuplicateIdentity = others.some(
      (association) => association.memoryId === data.memoryId && association.fileId === data.fileId,
    );
    const hasDuplicatePosition = others.some(
      (association) =>
        association.memoryId === data.memoryId && association.position === data.position,
    );
    const hasDuplicateFile = others.some((association) => association.fileId === data.fileId);
    const hasConflict = hasDuplicateIdentity || hasDuplicatePosition || hasDuplicateFile;

    if (hasConflict) {
      throw new Prisma.PrismaClientKnownRequestError("duplicate key", {
        code: "P2002",
        clientVersion: "7",
      });
    }
  }
}

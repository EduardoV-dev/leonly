import { decodeCursor, InvalidCursorError } from "@leonly/utils/contracts";
import { BadRequestException } from "@nestjs/common";

type CursorSchema = Parameters<typeof decodeCursor>[0]["schema"];

type DecodePaginationCursorParams<T extends CursorSchema> = {
  schema: T;
  cursor: string | undefined;
};

export function decodePaginationCursor<T extends CursorSchema>({
  schema,
  cursor,
}: DecodePaginationCursorParams<T>): T["_output"] | null {
  if (cursor === undefined) return null;

  try {
    return decodeCursor({ schema, cursor });
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      throw new BadRequestException({ error: "Invalid cursor." }, { cause: error });
    }
    throw error;
  }
}

type CreateCursorPageParams<T> = {
  rows: T[];
  limit: number;
  encodeNextCursor: (row: T) => string;
};

type CreateCursorPageReturn<T> = { data: T[]; nextCursor: string | null };

export function createCursorPage<T>({
  rows,
  limit,
  encodeNextCursor,
}: CreateCursorPageParams<T>): CreateCursorPageReturn<T> {
  const data = rows.slice(0, limit);
  const last = data.at(-1);
  const nextCursor = rows.length > limit && last !== undefined ? encodeNextCursor(last) : null;

  return { data, nextCursor };
}

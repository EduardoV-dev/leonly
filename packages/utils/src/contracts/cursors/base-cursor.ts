import { z } from "zod";

const MAX_CURSOR_LENGTH = 2048;

export const baseCursorSchema = z.strictObject({
  // Preserve the creation timestamp for pagination while restricting values to PostgreSQL-compatible dates and offsets.
  createdAt: z.iso.datetime({ offset: true }).refine((value) => {
    const offset = value.match(/[+-](\d{2}):\d{2}$/);
    return !value.startsWith("0000-") && (!offset || Number(offset[1]) <= 15);
  }),
  id: z.uuid(),
});

export class InvalidCursorError extends Error {
  constructor(cause?: unknown) {
    super("Invalid cursor", { cause });
  }
}

type EncodeCursorParams<T extends z.ZodType> = {
  schema: T;
  payload: z.input<T>;
};

export function encodeCursor(params: { payload: z.input<typeof baseCursorSchema> }): string;
export function encodeCursor<T extends z.ZodType>(params: EncodeCursorParams<T>): string;
export function encodeCursor({
  schema = baseCursorSchema,
  payload,
}: {
  schema?: z.ZodType;
  payload: unknown;
}): string {
  return Buffer.from(JSON.stringify(schema.parse(payload))).toString("base64url");
}

type DecodeCursorParams<T extends z.ZodType> = {
  schema: T;
  cursor: string;
};

export function decodeCursor(params: { cursor: string }): z.output<typeof baseCursorSchema>;
export function decodeCursor<T extends z.ZodType>(params: DecodeCursorParams<T>): z.output<T>;
export function decodeCursor({
  schema = baseCursorSchema,
  cursor,
}: {
  schema?: z.ZodType;
  cursor: string;
}): unknown {
  if (
    cursor.length === 0 ||
    cursor.length > MAX_CURSOR_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(cursor)
  ) {
    throw new InvalidCursorError();
  }

  const bytes = Buffer.from(cursor, "base64url");
  if (bytes.toString("base64url") !== cursor) throw new InvalidCursorError();

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError)
      throw new InvalidCursorError(error);
    throw error;
  }

  const result = schema.safeParse(payload);
  if (!result.success) throw new InvalidCursorError(result.error);
  return result.data;
}

import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const spaceNameSchema = z.string().transform((value, context) => {
  const normalizedName = value.trim();
  const length = Array.from(normalizedName).length;

  if (length < 2 || length > 100) {
    context.addIssue({
      code: "custom",
      message: "Enter a name between 2 and 100 characters.",
    });
  }

  return normalizedName;
});

export const renameActiveSpaceRequestSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    name: spaceNameSchema,
  })
  .strict();

const renameActiveSpaceResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      name: z.string().min(2).max(100),
      status: z.literal("updated"),
      updated_at: z.string().datetime({ offset: true }),
    })
    .strict(),
  z
    .object({
      name: z.string().min(2).max(100),
      status: z.literal("conflict"),
      updated_at: z.string().datetime({ offset: true }),
    })
    .strict(),
  z.object({ status: z.literal("invalid") }).strict(),
  z.object({ status: z.literal("unavailable") }).strict(),
]);

export type RenameActiveSpaceInput = z.input<typeof renameActiveSpaceRequestSchema>;
export type RenameActiveSpaceResult =
  | { name: string; status: "updated"; updatedAt: string }
  | { name: string; status: "conflict"; updatedAt: string }
  | { status: "invalid" }
  | { status: "unavailable" };

export class RenameActiveSpaceError extends Error {}

export async function renameActiveSpace(
  input: RenameActiveSpaceInput,
): Promise<RenameActiveSpaceResult> {
  const parsedInput = renameActiveSpaceRequestSchema.safeParse(input);
  if (!parsedInput.success) {
    return { status: "invalid" };
  }

  const supabase = await createClient();
  const response = await supabase.rpc("rename_active_space", {
    p_expected_updated_at: parsedInput.data.expectedUpdatedAt,
    p_name: parsedInput.data.name,
  });
  if (response.error) {
    throw new RenameActiveSpaceError("Unable to rename the active space.", {
      cause: response.error,
    });
  }

  const parsedResult = renameActiveSpaceResultSchema.safeParse(response.data);
  if (!parsedResult.success) {
    throw new RenameActiveSpaceError("The space-name service returned an invalid response.");
  }

  const result = parsedResult.data;
  if (result.status === "updated" || result.status === "conflict") {
    return { name: result.name, status: result.status, updatedAt: result.updated_at };
  }

  return result;
}

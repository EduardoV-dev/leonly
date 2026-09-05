import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const DISPLAY_NAME_ERROR = "Enter a name between 2 and 100 characters.";

function hasValidDisplayNameLength(value: string): boolean {
  const length = Array.from(value).length;
  return length >= 2 && length <= 100;
}

const displayNameRequestSchema = z.string().transform((value, context) => {
  const displayName = value.trim();
  if (!hasValidDisplayNameLength(displayName)) {
    context.addIssue({ code: "custom", message: DISPLAY_NAME_ERROR });
  }
  return displayName;
});

const canonicalDisplayNameSchema = z
  .string()
  .refine((value) => value === value.trim() && hasValidDisplayNameLength(value), {
    message: DISPLAY_NAME_ERROR,
  });

export const updateActiveMembershipDisplayNameRequestSchema = z
  .object({
    displayName: displayNameRequestSchema,
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const updateActiveMembershipDisplayNameResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      display_name: canonicalDisplayNameSchema,
      status: z.literal("updated"),
      updated_at: z.string().datetime({ offset: true }),
    })
    .strict(),
  z
    .object({
      display_name: canonicalDisplayNameSchema,
      status: z.literal("conflict"),
      updated_at: z.string().datetime({ offset: true }),
    })
    .strict(),
  z.object({ status: z.literal("invalid") }).strict(),
  z.object({ status: z.literal("unavailable") }).strict(),
]);

export type UpdateActiveMembershipDisplayNameInput = z.input<
  typeof updateActiveMembershipDisplayNameRequestSchema
>;

export type UpdateActiveMembershipDisplayNameResult =
  | { displayName: string; status: "updated"; updatedAt: string }
  | { displayName: string; status: "conflict"; updatedAt: string }
  | { status: "invalid" }
  | { status: "unavailable" };

export class UpdateActiveMembershipDisplayNameError extends Error {}

export async function updateActiveMembershipDisplayName(
  input: UpdateActiveMembershipDisplayNameInput,
): Promise<UpdateActiveMembershipDisplayNameResult> {
  const parsedInput = updateActiveMembershipDisplayNameRequestSchema.safeParse(input);
  if (!parsedInput.success) {
    return { status: "invalid" };
  }

  const supabase = await createClient();
  const response = await supabase.rpc("update_active_membership_display_name", {
    p_display_name: parsedInput.data.displayName,
    p_expected_updated_at: parsedInput.data.expectedUpdatedAt,
  });
  if (response.error) {
    throw new UpdateActiveMembershipDisplayNameError(
      "Unable to update the active membership display name.",
      { cause: response.error },
    );
  }

  const parsedResult = updateActiveMembershipDisplayNameResultSchema.safeParse(response.data);
  if (!parsedResult.success) {
    throw new UpdateActiveMembershipDisplayNameError(
      "The display-name service returned an invalid response.",
    );
  }

  const result = parsedResult.data;
  if (result.status === "updated" || result.status === "conflict") {
    return {
      displayName: result.display_name,
      status: result.status,
      updatedAt: result.updated_at,
    };
  }

  return result;
}

import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCalendarDateInTimeZone, parseCalendarDate } from "@/utils/calendar-date";

const dateSchema = z.string().refine((value) => parseCalendarDate(value) !== null);
const timezoneSchema = z
  .string()
  .min(1)
  .refine((value) => getCalendarDateInTimeZone(value) !== null);

export const updateActiveSpaceStartDateRequestSchema = z
  .object({
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    startDate: dateSchema,
    timezone: timezoneSchema,
  })
  .strict()
  .refine(({ startDate, timezone }) => startDate <= (getCalendarDateInTimeZone(timezone) ?? ""), {
    path: ["startDate"],
  });

const resultSchema = z.discriminatedUnion("status", [
  z
    .object({
      start_date: z.iso.date(),
      status: z.literal("updated"),
      updated_at: z.string().datetime({ offset: true }),
    })
    .strict(),
  z
    .object({
      start_date: z.iso.date(),
      status: z.literal("conflict"),
      updated_at: z.string().datetime({ offset: true }),
    })
    .strict(),
  z.object({ status: z.literal("invalid") }).strict(),
  z.object({ status: z.literal("unavailable") }).strict(),
]);

export type UpdateActiveSpaceStartDateInput = z.input<
  typeof updateActiveSpaceStartDateRequestSchema
>;
export type UpdateActiveSpaceStartDateResult =
  | { startDate: string; status: "updated" | "conflict"; updatedAt: string }
  | { status: "invalid" | "unavailable" };

export class UpdateActiveSpaceStartDateError extends Error {}

export async function updateActiveSpaceStartDate(
  input: UpdateActiveSpaceStartDateInput,
): Promise<UpdateActiveSpaceStartDateResult> {
  const parsedInput = updateActiveSpaceStartDateRequestSchema.safeParse(input);
  if (!parsedInput.success) return { status: "invalid" };

  const supabase = await createClient();
  const response = await supabase.rpc("update_active_space_start_date", {
    p_expected_updated_at: parsedInput.data.expectedUpdatedAt,
    p_start_date: parsedInput.data.startDate,
    p_timezone: parsedInput.data.timezone,
  });
  if (response.error) {
    throw new UpdateActiveSpaceStartDateError("Unable to update the active space start date.", {
      cause: response.error,
    });
  }

  const parsedResult = resultSchema.safeParse(response.data);
  if (!parsedResult.success) {
    throw new UpdateActiveSpaceStartDateError(
      "The start-date service returned an invalid response.",
    );
  }

  const result = parsedResult.data;
  if (result.status === "updated" || result.status === "conflict") {
    return { startDate: result.start_date, status: result.status, updatedAt: result.updated_at };
  }
  return result;
}

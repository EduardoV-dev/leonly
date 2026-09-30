import { formatInviteCodeDisplay, isValidInviteCode } from "@leonly/utils/invite-code";
import type { TFunction } from "i18next";
import { z } from "zod";
import { getInclusiveCalendarDayCount, parseCalendarDate } from "@/utils/calendar-date";

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 100;
export const SPACE_NAME_MIN_LENGTH = 2;
export const SPACE_NAME_MAX_LENGTH = 100;

export {
  formatInviteCodeDisplay,
  formatInviteCodeInput,
  normalizeInviteCode,
} from "@leonly/utils/invite-code";

function getTrimmedLength(value: string) {
  return value.trim().length;
}

function isFutureDateString(value: string) {
  return parseCalendarDate(value) !== null && getInclusiveCalendarDayCount(value) === null;
}

export { isFutureDateString };

type SpaceSetupT = TFunction<"spaceSetup">;

function createOptionalDisplayNameSchema(t: SpaceSetupT) {
  return z
    .string()
    .refine(
      (value) => {
        const trimmedLength = getTrimmedLength(value);

        return trimmedLength === 0 || trimmedLength >= DISPLAY_NAME_MIN_LENGTH;
      },
      {
        message: t("validation.displayNameMin", { count: DISPLAY_NAME_MIN_LENGTH }),
      },
    )
    .refine(
      (value) => {
        const trimmedLength = getTrimmedLength(value);

        return trimmedLength === 0 || trimmedLength <= DISPLAY_NAME_MAX_LENGTH;
      },
      {
        message: t("validation.displayNameMax", { count: DISPLAY_NAME_MAX_LENGTH }),
      },
    );
}

export function createCreateSpaceSetupSchema(t: SpaceSetupT) {
  return z.object({
    displayName: createOptionalDisplayNameSchema(t),
    spaceName: z
      .string()
      .refine((value) => getTrimmedLength(value) > 0, {
        message: t("validation.spaceNameRequired"),
      })
      .refine((value) => getTrimmedLength(value) >= SPACE_NAME_MIN_LENGTH, {
        message: t("validation.spaceNameMin", { count: SPACE_NAME_MIN_LENGTH }),
      })
      .refine((value) => getTrimmedLength(value) <= SPACE_NAME_MAX_LENGTH, {
        message: t("validation.spaceNameMax", { count: SPACE_NAME_MAX_LENGTH }),
      }),
    firstDay: z
      .string()
      .refine((value) => getTrimmedLength(value) > 0, {
        message: t("validation.firstDayRequired"),
      })
      .refine((value) => parseCalendarDate(value) !== null, {
        message: t("validation.firstDayRequired"),
      })
      .refine((value) => !isFutureDateString(value), {
        message: t("validation.firstDayFuture"),
      }),
  });
}

export function createJoinSpaceSetupSchema(t: SpaceSetupT) {
  return z.object({
    inviteCode: z
      .string()
      .refine((value) => value.trim().length > 0, {
        message: t("validation.inviteCodeRequired"),
      })
      .refine(isValidInviteCode, {
        message: t("validation.inviteCodeInvalid"),
      })
      .transform(formatInviteCodeDisplay),
    displayName: createOptionalDisplayNameSchema(t),
  });
}

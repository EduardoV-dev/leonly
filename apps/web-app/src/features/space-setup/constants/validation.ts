import type { TFunction } from "i18next";
import { z } from "zod";
import { getInclusiveCalendarDayCount, parseCalendarDate } from "@/utils/calendar-date";

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 100;
export const CREATE_DISPLAY_NAME_MIN_LENGTH = 2;
export const CREATE_DISPLAY_NAME_MAX_LENGTH = 100;
export const SPACE_NAME_MIN_LENGTH = 2;
export const SPACE_NAME_MAX_LENGTH = 100;
export const INVITE_CODE_PATTERN = /^(LEO|LOV|MEM|OUR|DUO|TWO|JOY|SUN|LNY)-?[A-HJKMNP-Z2-9]{5}$/;

function getTrimmedLength(value: string) {
  return value.trim().length;
}

export function formatInviteCodeInput(value: string) {
  const upperValue = value.toUpperCase();

  if (/^[A-Z0-9]{4,8}$/.test(upperValue)) {
    return `${upperValue.slice(0, 3)}-${upperValue.slice(3)}`;
  }

  return upperValue.slice(0, 9);
}

export function normalizeInviteCode(value: string) {
  const trimmedValue = value.replace(/^[\t\n\r\f\v ]+|[\t\n\r\f\v ]+$/g, "").toLowerCase();

  return /^[a-z]{3}-[a-z2-9]{5}$/.test(trimmedValue) ? trimmedValue.replace("-", "") : trimmedValue;
}

function isValidInviteCode(value: string) {
  return INVITE_CODE_PATTERN.test(value);
}

export function formatInviteCodeDisplay(value: string) {
  return formatInviteCodeInput(value).toUpperCase();
}

function isFutureDateString(value: string) {
  return parseCalendarDate(value) !== null && getInclusiveCalendarDayCount(value) === null;
}

export { isFutureDateString };

type SpaceSetupT = TFunction<"spaceSetup">;

function createJoinDisplayNameSchema(t: SpaceSetupT) {
  return z
    .string()
    .refine((value) => getTrimmedLength(value) > 0, {
      message: t("validation.displayNameRequired"),
    })
    .refine((value) => getTrimmedLength(value) >= DISPLAY_NAME_MIN_LENGTH, {
      message: t("validation.displayNameMin", { count: DISPLAY_NAME_MIN_LENGTH }),
    })
    .refine((value) => getTrimmedLength(value) <= DISPLAY_NAME_MAX_LENGTH, {
      message: t("validation.displayNameMax", { count: DISPLAY_NAME_MAX_LENGTH }),
    });
}

function createRequiredDisplayNameSchema(t: SpaceSetupT) {
  return z
    .string()
    .refine((value) => getTrimmedLength(value) > 0, {
      message: t("validation.displayNameRequired"),
    })
    .refine((value) => getTrimmedLength(value) >= CREATE_DISPLAY_NAME_MIN_LENGTH, {
      message: t("validation.displayNameMin", { count: CREATE_DISPLAY_NAME_MIN_LENGTH }),
    })
    .refine((value) => getTrimmedLength(value) <= CREATE_DISPLAY_NAME_MAX_LENGTH, {
      message: t("validation.displayNameMax", { count: CREATE_DISPLAY_NAME_MAX_LENGTH }),
    });
}

export function createCreateSpaceSetupSchema(t: SpaceSetupT) {
  return z.object({
    displayName: createRequiredDisplayNameSchema(t),
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
      .transform(formatInviteCodeInput)
      .refine((value) => value.length > 0, {
        message: t("validation.inviteCodeRequired"),
      })
      .refine(isValidInviteCode, {
        message: t("validation.inviteCodeInvalid"),
      }),
    displayName: createJoinDisplayNameSchema(t),
  });
}

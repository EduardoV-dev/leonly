import type { TFunction } from "i18next";
import { z } from "zod";
import { getInclusiveCalendarDayCount, parseCalendarDate } from "@/utils/calendar-date";

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 100;
export const SPACE_NAME_MIN_LENGTH = 2;
export const SPACE_NAME_MAX_LENGTH = 100;
export const INVITE_CODE_PATTERN = /^(LEO|LOV|MEM|OUR|DUO|TWO|JOY|SUN|LNY)-?[A-HJKMNP-Z2-9]{5}$/;
const NORMALIZED_INVITE_CODE_PATTERN =
  /^(leo|lov|mem|our|duo|two|joy|sun|lny)[abcdefghjkmnpqrstuvwxyz23456789]{5}$/;

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

  const normalizedValue =
    /^(leo|lov|mem|our|duo|two|joy|sun|lny)-[abcdefghjkmnpqrstuvwxyz23456789]{5}$/.test(
      trimmedValue,
    )
      ? trimmedValue.replace("-", "")
      : trimmedValue;

  return NORMALIZED_INVITE_CODE_PATTERN.test(normalizedValue) ? normalizedValue : trimmedValue;
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
      .transform((value) => formatInviteCodeInput(normalizeInviteCode(value)))
      .refine((value) => value.length > 0, {
        message: t("validation.inviteCodeRequired"),
      })
      .refine(isValidInviteCode, {
        message: t("validation.inviteCodeInvalid"),
      }),
    displayName: createOptionalDisplayNameSchema(t),
  });
}

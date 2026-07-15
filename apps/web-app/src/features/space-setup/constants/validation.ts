import type { TFunction } from "i18next";
import { z } from "zod";

export const DISPLAY_NAME_MIN_LENGTH = 5;
export const DISPLAY_NAME_MAX_LENGTH = 50;
export const CREATE_DISPLAY_NAME_MIN_LENGTH = 2;
export const CREATE_DISPLAY_NAME_MAX_LENGTH = 100;
export const SPACE_NAME_MIN_LENGTH = 2;
export const SPACE_NAME_MAX_LENGTH = 100;
export const INVITE_CODE_PATTERN = /^[A-Z]{3}-[A-Z0-9]{5}$/;

function getTrimmedLength(value: string) {
  return value.trim().length;
}

function sanitizeInviteCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

export function formatInviteCodeInput(value: string) {
  const sanitizedValue = sanitizeInviteCode(value);

  if (sanitizedValue.length <= 3) {
    return sanitizedValue;
  }

  return `${sanitizedValue.slice(0, 3)}-${sanitizedValue.slice(3)}`;
}

export function normalizeInviteCode(value: string) {
  return sanitizeInviteCode(value).toLowerCase();
}

function isValidInviteCode(value: string) {
  return INVITE_CODE_PATTERN.test(formatInviteCodeInput(value));
}

export function formatInviteCodeDisplay(value: string) {
  return formatInviteCodeInput(value).toUpperCase();
}

function isFutureDateString(value: string) {
  if (!value) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return false;
  }

  const selectedDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return selectedDate > today;
}

export { isFutureDateString };

type SpaceSetupT = TFunction<"spaceSetup">;

function createOptionalDisplayNameSchema(t: SpaceSetupT) {
  return z
    .string()
    .refine(
      (value) => {
        const length = getTrimmedLength(value);

        return length === 0 || length >= DISPLAY_NAME_MIN_LENGTH;
      },
      {
        message: t("validation.displayNameMin", { count: DISPLAY_NAME_MIN_LENGTH }),
      },
    )
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
    displayName: createOptionalDisplayNameSchema(t),
  });
}

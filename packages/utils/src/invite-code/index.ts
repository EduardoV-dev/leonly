export const INVITE_PREFIXES = ["leo", "lov", "mem", "our", "duo", "two", "joy", "sun", "lny"];
export const INVITE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const INVITE_CODE_LENGTH = 5;

const INVITE_PREFIX_LENGTH = 3;
const INVITE_INPUT_LENGTH = INVITE_PREFIX_LENGTH + INVITE_CODE_LENGTH + 1;
const INVITE_CODE_PATTERN = new RegExp(
  `^(${INVITE_PREFIXES.join("|")})-?[${INVITE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`,
);
const UNFORMATTED_INVITE_INPUT_PATTERN = new RegExp(
  `^[A-Z0-9]{${INVITE_PREFIX_LENGTH + 1},${INVITE_INPUT_LENGTH - 1}}$`,
);

export function isValidInviteCode(value: string): boolean {
  return INVITE_CODE_PATTERN.test(value.trim().toLowerCase());
}

export function normalizeInviteCode(value: string): string {
  const normalized = value.trim().toLowerCase();
  return isValidInviteCode(normalized) ? normalized.replace("-", "") : normalized;
}

export function formatInviteCodeInput(value: string): string {
  const upperValue = value.trim().toUpperCase();

  if (UNFORMATTED_INVITE_INPUT_PATTERN.test(upperValue)) {
    return `${upperValue.slice(0, INVITE_PREFIX_LENGTH)}-${upperValue.slice(INVITE_PREFIX_LENGTH)}`;
  }

  return upperValue.slice(0, INVITE_INPUT_LENGTH);
}

export function formatInviteCodeDisplay(value: string): string {
  return formatInviteCodeInput(value);
}

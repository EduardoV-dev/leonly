import {
  DEFAULT_DISPLAY_NAME,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
} from "../constants/spaces.constants";

type NormalizeDisplayNameParams = {
  value: string | null | undefined;
  accountName: string | undefined;
};

export function normalizeDisplayName({
  value,
  accountName,
}: NormalizeDisplayNameParams): string | null {
  const supplied = value?.trim() ?? "";
  const hasInvalidSuppliedName =
    Boolean(supplied) &&
    (supplied.length < MIN_DISPLAY_NAME_LENGTH || supplied.length > MAX_DISPLAY_NAME_LENGTH);
  if (hasInvalidSuppliedName) return null;

  const fallback = accountName?.trim() ?? "";
  const isFallbackValid =
    fallback.length >= MIN_DISPLAY_NAME_LENGTH && fallback.length <= MAX_DISPLAY_NAME_LENGTH;

  return supplied || (isFallbackValid ? fallback : DEFAULT_DISPLAY_NAME);
}

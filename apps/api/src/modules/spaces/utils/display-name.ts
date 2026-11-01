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
    Boolean(supplied) && (supplied.length < 2 || supplied.length > 100);
  if (hasInvalidSuppliedName) return null;

  const fallback = accountName?.trim() ?? "";
  const isFallbackValid = fallback.length >= 2 && fallback.length <= 100;

  return supplied || (isFallbackValid ? fallback : "Leonly User");
}

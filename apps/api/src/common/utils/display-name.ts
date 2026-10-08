export function normalizeDisplayName(
  value: string | null | undefined,
  accountName: string | undefined,
): string | null {
  const supplied = value?.trim() ?? "";
  const hasInvalidSuppliedName =
    Boolean(supplied) && (supplied.length < 2 || supplied.length > 100);
  if (hasInvalidSuppliedName) return null;
  const fallback = accountName?.trim() ?? "";
  return supplied || (fallback.length >= 2 && fallback.length <= 100 ? fallback : "Leonly User");
}

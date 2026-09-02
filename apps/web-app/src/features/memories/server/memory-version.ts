import "server-only";

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function encodeMemoryVersion(updatedAt: string): string {
  return Buffer.from(updatedAt, "utf8").toString("base64url");
}

export function decodeMemoryVersion(version: string): string | null {
  if (version.length === 0 || version.length > 128 || !/^[A-Za-z0-9_-]+$/.test(version)) {
    return null;
  }

  const decoded = Buffer.from(version, "base64url").toString("utf8");
  if (
    Buffer.from(decoded, "utf8").toString("base64url") !== version ||
    !ISO_TIMESTAMP_PATTERN.test(decoded) ||
    Number.isNaN(Date.parse(decoded))
  ) {
    return null;
  }

  return decoded;
}

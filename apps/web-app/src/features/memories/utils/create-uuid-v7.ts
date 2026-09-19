const MAX_UUID_V7_TIMESTAMP = 0xffffffffffff;

export function createUuidV7(now = Date.now()): string {
  if (!Number.isInteger(now) || now < 0 || now > MAX_UUID_V7_TIMESTAMP) {
    throw new Error("UUIDv7 timestamp is outside the supported range.");
  }

  const randomHex = crypto.randomUUID().replaceAll("-", "");
  const timestampHex = now.toString(16).padStart(12, "0");
  const variant = ((Number.parseInt(randomHex[16], 16) & 3) | 8).toString(16);

  return `${timestampHex.slice(0, 8)}-${timestampHex.slice(8)}-7${randomHex.slice(13, 16)}-${variant}${randomHex.slice(17, 20)}-${randomHex.slice(20)}`;
}

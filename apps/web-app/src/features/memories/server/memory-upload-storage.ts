import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";

function toBuffer(bytes: ArrayBuffer | Buffer): Buffer {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

function digest(bytes: ArrayBuffer | Buffer): Buffer {
  return createHash("sha256").update(toBuffer(bytes)).digest();
}

export async function uploadMemoryObjectIfAbsentOrIdentical(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  bytes: ArrayBuffer | Buffer,
  contentType: string,
): Promise<void> {
  const bucket = admin.storage.from("memory-photos");
  const stored = await bucket.upload(path, toBuffer(bytes), { contentType, upsert: false });
  if (!stored.error) return;

  const existing = await bucket.download(path);
  if (existing.error || !existing.data) {
    throw new Error("Unable to store an immutable memory asset.", { cause: stored.error });
  }
  const existingDigest = digest(await existing.data.arrayBuffer());
  const intendedDigest = digest(bytes);
  if (
    existingDigest.length !== intendedDigest.length ||
    !timingSafeEqual(existingDigest, intendedDigest)
  ) {
    throw new Error("An immutable memory asset already contains different bytes.");
  }
}

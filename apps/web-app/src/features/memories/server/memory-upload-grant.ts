import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ENVIRONMENT_VARIABLES } from "@/constants/environment-variables";

const GRANT_LIFETIME_SECONDS = 10 * 60;
const GRANT_VERSION = "v1";
const SIGNING_CONTEXT = "leonly:memory-upload-grant:v1";

const createAssetSchema = z
  .object({
    coverPath: z.string().min(1),
    detailPath: z.string().min(1),
    id: z.uuid(),
    isCover: z.boolean(),
    name: z.string().min(1),
    originalPath: z.string().min(1),
    position: z.number().int().min(0).max(9),
    temporaryPath: z.string().min(1),
  })
  .strict();

const detailsSchema = z.object({
  description: z.string().nullable(),
  location: z.string().nullable(),
  memoryDate: z.iso.date(),
  timezone: z.string().min(1),
  title: z.string().min(1),
  visibility: z.enum(["timeline", "vault"]),
});

const createPayloadSchema = detailsSchema
  .extend({
    actorId: z.string().min(1),
    assets: z.array(createAssetSchema).max(10),
    expiresAt: z.number().int().positive(),
    issuedAt: z.number().int().positive(),
    memoryId: z.uuid(),
    mutationId: z.uuid(),
    operation: z.literal("create"),
    spaceId: z.uuid(),
  })
  .strict()
  .refine((payload) =>
    payload.assets.every((asset, position) => {
      const basePath = `${payload.spaceId}/memories/${payload.memoryId}/${asset.id}`;
      return (
        asset.position === position &&
        asset.temporaryPath ===
          `${payload.spaceId}/temporary/${payload.mutationId}/${asset.id}/original` &&
        asset.originalPath === `${basePath}/original` &&
        asset.coverPath === `${basePath}/cover.webp` &&
        asset.detailPath === `${basePath}/detail.webp`
      );
    }),
  );

const editAssetSchema = z
  .object({
    coverPath: z.string().min(1),
    detailPath: z.string().min(1),
    id: z.uuid(),
    name: z.string().min(1),
    originalPath: z.string().min(1),
    temporaryPath: z.string().min(1),
  })
  .strict();

const editPayloadSchema = detailsSchema
  .extend({
    actorId: z.string().min(1),
    coverAssetId: z.uuid().nullable(),
    expiresAt: z.number().int().positive(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    finalAssetIds: z.array(z.uuid()).max(10),
    issuedAt: z.number().int().positive(),
    memoryId: z.uuid(),
    mutationId: z.uuid(),
    newAssets: z.array(editAssetSchema).max(10),
    operation: z.literal("edit"),
    retainedAssetIds: z.array(z.uuid()).max(10),
    spaceId: z.uuid(),
  })
  .strict()
  .refine((payload) => {
    const finalIds = new Set(payload.finalAssetIds);
    const retainedIds = new Set(payload.retainedAssetIds);
    const newIds = new Set(payload.newAssets.map((asset) => asset.id));
    return (
      finalIds.size === payload.finalAssetIds.length &&
      retainedIds.size === payload.retainedAssetIds.length &&
      newIds.size === payload.newAssets.length &&
      payload.finalAssetIds.length === retainedIds.size + newIds.size &&
      payload.finalAssetIds.every((id) => retainedIds.has(id) || newIds.has(id)) &&
      payload.retainedAssetIds.every((id) => !newIds.has(id)) &&
      (payload.finalAssetIds.length === 0
        ? payload.coverAssetId === null
        : payload.coverAssetId !== null && finalIds.has(payload.coverAssetId)) &&
      payload.newAssets.every((asset) => {
        const basePath = `${payload.spaceId}/memories/${payload.memoryId}/${asset.id}`;
        return (
          asset.temporaryPath ===
            `${payload.spaceId}/temporary/${payload.mutationId}/${asset.id}/original` &&
          asset.originalPath === `${basePath}/original` &&
          asset.coverPath === `${basePath}/cover.webp` &&
          asset.detailPath === `${basePath}/detail.webp`
        );
      })
    );
  });

const payloadSchema = z.discriminatedUnion("operation", [createPayloadSchema, editPayloadSchema]);

export type MemoryUploadGrantPayload = z.infer<typeof payloadSchema>;
export type CreateMemoryUploadGrantPayload = z.infer<typeof createPayloadSchema>;
export type EditMemoryUploadGrantPayload = z.infer<typeof editPayloadSchema>;
export type MemoryUploadGrantAsset = z.infer<typeof createAssetSchema>;
export type EditMemoryUploadGrantAsset = z.infer<typeof editAssetSchema>;
type UnsignedPayload<T> = T extends unknown ? Omit<T, "expiresAt" | "issuedAt"> : never;

export class MemoryUploadGrantError extends Error {}

function signingKey(): Buffer {
  const secret = ENVIRONMENT_VARIABLES.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for memory upload grants.");
  return createHmac("sha256", secret).update(SIGNING_CONTEXT).digest();
}

function signature(payload: string): Buffer {
  return createHmac("sha256", signingKey()).update(`${GRANT_VERSION}.${payload}`).digest();
}

export function createMemoryUploadGrant(
  payload: UnsignedPayload<MemoryUploadGrantPayload>,
  now = Date.now(),
): string {
  const issuedAt = Math.floor(now / 1000);
  const validated = payloadSchema.parse({
    ...payload,
    expiresAt: issuedAt + GRANT_LIFETIME_SECONDS,
    issuedAt,
  });
  const encodedPayload = Buffer.from(JSON.stringify(validated)).toString("base64url");
  return `${GRANT_VERSION}.${encodedPayload}.${signature(encodedPayload).toString("base64url")}`;
}

export function verifyMemoryUploadGrant(
  grant: string,
  actorId: string,
  operation: MemoryUploadGrantPayload["operation"],
  now = Date.now(),
): MemoryUploadGrantPayload {
  const [version, encodedPayload, encodedSignature, extra] = grant.split(".");
  if (version !== GRANT_VERSION || !encodedPayload || !encodedSignature || extra) {
    throw new MemoryUploadGrantError("The memory upload grant is invalid.");
  }

  const expected = signature(encodedPayload);
  const supplied = Buffer.from(encodedSignature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new MemoryUploadGrantError("The memory upload grant is invalid.");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new MemoryUploadGrantError("The memory upload grant is invalid.");
  }
  const parsed = payloadSchema.safeParse(decoded);
  if (!parsed.success || parsed.data.actorId !== actorId || parsed.data.operation !== operation) {
    throw new MemoryUploadGrantError("The memory upload grant is invalid.");
  }
  if (parsed.data.expiresAt <= Math.floor(now / 1000)) {
    throw new MemoryUploadGrantError("The memory upload grant has expired.");
  }
  return parsed.data;
}

export function deriveMemoryId(actorId: string, spaceId: string, mutationId: string): string {
  const bytes = createHmac("sha256", signingKey())
    .update(`memory-id\0${actorId}\0${spaceId}\0${mutationId}`)
    .digest()
    .subarray(0, 16);
  Buffer.from(mutationId.replaceAll("-", ""), "hex").copy(bytes, 0, 0, 6);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

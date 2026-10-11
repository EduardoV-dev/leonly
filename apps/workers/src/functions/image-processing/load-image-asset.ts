import type { Prisma, PrismaClient } from "@leonly/database/client";
import type { ImageEvent } from "@leonly/utils/contracts";
import {
  ImageProcessingError,
  MAX_ORIGINAL_BYTES,
  MAX_VARIANT_BYTES,
} from "../../services/image/image-recipe";

export const VARIANTS = ["cover", "detail"] as const;

type ImageAsset = Prisma.MemoryAssetGetPayload<{
  include: { objects: true; upload: true; memory: { include: { space: true } } };
}>;

type ImageAssetContext = {
  original: { mimeType: string; byteSize: number };
  baseKey: string;
  variants: ImageAsset["objects"];
  isReady: boolean;
};

export async function loadImageAsset(
  event: ImageEvent,
  prisma: PrismaClient,
): Promise<ImageAssetContext | null> {
  const asset = await prisma.memoryAsset.findUnique({
    where: { id: event.payload.assetId },
    include: { objects: true, upload: true, memory: { include: { space: true } } },
  });

  if (!asset || asset.memory.deletedAt || asset.memory.space.deletedAt) return null;

  const original = validateAssetMetadata(asset, event.payload);
  const baseKey = event.payload.originalKey.slice(0, -"original".length);
  const variants = validateVariantMetadata(asset, baseKey);

  return {
    original,
    baseKey,
    variants,
    isReady: variants.every(({ status }) => status === "ready"),
  };
}

function validateAssetMetadata(asset: ImageAsset, payload: ImageEvent["payload"]) {
  const { assetId, memoryId, spaceId, originalKey, generationRecipeVersion } = payload;
  const original = asset.objects.find(({ variantType }) => variantType === "original");
  const hasValidIdentity =
    asset.memoryId === memoryId &&
    asset.spaceId === spaceId &&
    asset.assetType === "image" &&
    asset.generationRecipeVersion === generationRecipeVersion;

  const hasValidOriginal =
    original?.status === "ready" &&
    original.objectPath === originalKey &&
    original.mimeType !== null &&
    original.byteSize !== null &&
    original.byteSize > 0 &&
    original.byteSize <= MAX_ORIGINAL_BYTES;

  const hasValidUpload =
    asset.upload.status === "consumed" &&
    asset.upload.id === assetId &&
    asset.upload.intendedFinalKey === originalKey &&
    asset.upload.verifiedMimeType === original?.mimeType &&
    asset.upload.verifiedByteSize === original?.byteSize;

  if (
    !hasValidIdentity ||
    !hasValidOriginal ||
    !hasValidUpload ||
    !original ||
    original.mimeType === null ||
    original.byteSize === null
  )
    throw new ImageProcessingError("ASSET_METADATA_MISMATCH");

  return { mimeType: original.mimeType, byteSize: original.byteSize };
}

function validateVariantMetadata(asset: ImageAsset, baseKey: string) {
  return VARIANTS.map((variant) => {
    const object = asset.objects.find(({ variantType }) => variantType === variant);
    const hasValidPath = object?.objectPath === `${baseKey}${variant}.webp`;

    if (!object || !hasValidPath) throw new ImageProcessingError("VARIANT_METADATA_MISMATCH");

    const hasInvalidReadyMetadata =
      object.status === "ready" &&
      (object.mimeType !== "image/webp" ||
        (object.byteSize ?? 0) <= 0 ||
        (object.byteSize ?? 0) > MAX_VARIANT_BYTES ||
        object.readyAt === null);

    if (hasInvalidReadyMetadata) throw new ImageProcessingError("VARIANT_METADATA_MISMATCH");

    return object;
  });
}

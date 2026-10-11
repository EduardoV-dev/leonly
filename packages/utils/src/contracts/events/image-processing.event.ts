export type ImageEvent = {
  id: string;
  aggregateType: "memory_asset";
  aggregateId: string;
  eventType: "ImageVariantsRequested";
  schemaVersion: 1;
  createdAt: string;
  payload: {
    memoryId: string;
    spaceId: string;
    assetId: string;
    originalKey: string;
    generationRecipeVersion: number;
  };
};

export class ImageEventError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseImageEvent(value: unknown): ImageEvent {
  if (!isRecord(value) || !isRecord(value.payload)) throw new ImageEventError("INVALID_EVENT");

  const payload = value.payload;
  const ids = [value.id, value.aggregateId, payload.memoryId, payload.spaceId, payload.assetId];
  const hasValidIds = ids.every((id) => typeof id === "string" && UUID_PATTERN.test(id));
  const hasValidDate =
    typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt));

  const hasValidIdentity =
    value.aggregateType === "memory_asset" &&
    value.eventType === "ImageVariantsRequested" &&
    value.aggregateId === payload.assetId;

  const hasValidKey =
    payload.originalKey === `memories/${payload.spaceId}/${payload.assetId}/original`;

  if (!hasValidIds || !hasValidDate || !hasValidIdentity || !hasValidKey)
    throw new ImageEventError("INVALID_EVENT");

  if (value.schemaVersion !== 1) throw new ImageEventError("UNSUPPORTED_SCHEMA");
  if (payload.generationRecipeVersion !== 1) throw new ImageEventError("UNSUPPORTED_RECIPE");

  return value as ImageEvent;
}

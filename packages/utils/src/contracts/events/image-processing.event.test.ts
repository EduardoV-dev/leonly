import { describe, expect, it } from "vitest";
import { parseImageEvent } from "./image-processing.event";

const assetId = "0199ceb0-0000-7000-8000-000000000001";
const spaceId = "0199ceb0-0000-7000-8000-000000000002";
const event = {
  id: "0199ceb0-0000-7000-8000-000000000003",
  aggregateType: "memory_asset",
  aggregateId: assetId,
  eventType: "ImageVariantsRequested",
  schemaVersion: 1,
  createdAt: "2026-10-11T00:00:00Z",
  payload: {
    memoryId: "0199ceb0-0000-7000-8000-000000000004",
    spaceId,
    assetId,
    originalKey: `memories/${spaceId}/${assetId}/original`,
    generationRecipeVersion: 1,
  },
};

describe("image processing event contract", () => {
  it("accepts a coordinated event and rejects incompatible versions and object identities", () => {
    expect(parseImageEvent(event)).toEqual(event);
    expect(() => parseImageEvent({ ...event, schemaVersion: 2 })).toThrow("UNSUPPORTED_SCHEMA");
    expect(() =>
      parseImageEvent({ ...event, payload: { ...event.payload, generationRecipeVersion: 2 } }),
    ).toThrow("UNSUPPORTED_RECIPE");
    expect(() =>
      parseImageEvent({ ...event, payload: { ...event.payload, originalKey: "foreign/original" } }),
    ).toThrow("INVALID_EVENT");
  });
});

import { describe, expect, it } from "vitest";
import {
  ImageEventError,
  imageProcessingEventSchema,
  parseImageEvent,
} from "./image-processing.event";

const fileId = "0199ceb0-0000-7000-8000-000000000001";
const spaceId = "0199ceb0-0000-7000-8000-000000000002";
const event = {
  id: "0199ceb0-0000-7000-8000-000000000003",
  entityType: "file",
  entityId: fileId,
  eventType: "ImageVariantsRequested",
  createdAt: "2026-10-11T00:00:00Z",
  payload: {
    memoryId: "0199ceb0-0000-7000-8000-000000000004",
    spaceId,
    variantNames: ["cover", "detail"],
  },
};

describe("image processing event contract", () => {
  it("accepts a versionless file-oriented event with the requested variant set", () => {
    expect(parseImageEvent(event)).toEqual(event);
  });

  it("rejects forged identity, context, or unsupported variants", () => {
    expect(() => parseImageEvent({ ...event, entityType: "memory_asset" })).toThrow(
      "INVALID_EVENT",
    );
    expect(() => parseImageEvent({ ...event, entityId: "foreign-file" })).toThrow("INVALID_EVENT");
    expect(() =>
      parseImageEvent({
        ...event,
        payload: { ...event.payload, spaceId: "foreign-space" },
      }),
    ).toThrow("INVALID_EVENT");
    expect(() =>
      parseImageEvent({
        ...event,
        payload: { ...event.payload, variantNames: ["cover", "thumbnail"] },
      }),
    ).toThrow("INVALID_EVENT");
    expect(() =>
      parseImageEvent({
        ...event,
        payload: { ...event.payload, variantNames: ["cover", "cover"] },
      }),
    ).toThrow("INVALID_EVENT");
  });

  it.each([
    null,
    [],
    { ...event, payload: [] },
    { ...event, id: "00000000-0000-0000-0000-000000000000" },
    { ...event, entityId: "ffffffff-ffff-ffff-ffff-ffffffffffff" },
    { ...event, eventType: "OtherEvent" },
    { ...event, createdAt: "invalid-date" },
    { ...event, createdAt: 0 },
    { ...event, payload: { ...event.payload, memoryId: "invalid-id" } },
    { ...event, payload: { ...event.payload, variantNames: [] } },
    { ...event, payload: { ...event.payload, variantNames: "cover" } },
  ])("rejects malformed event %j with the public error contract", (value) => {
    expect(imageProcessingEventSchema.safeParse(value).success).toBe(false);
    expect(() => parseImageEvent(value)).toThrow(ImageEventError);
    expect(() => parseImageEvent(value)).toThrow("INVALID_EVENT");
  });

  it("strips additional fields while preserving previously accepted timestamp formats", () => {
    const extended = {
      ...event,
      createdAt: "2026-10-11",
      correlationId: "request-1",
      payload: { ...event.payload, extraContext: { source: "api" } },
    };

    const expected = { ...event, createdAt: extended.createdAt };

    expect(imageProcessingEventSchema.parse(extended)).toEqual(expected);
    expect(parseImageEvent(extended)).toEqual(expected);
  });

  it("rejects legacy asset messages", () => {
    const legacyEvent = {
      id: event.id,
      aggregateType: "memory_asset",
      aggregateId: fileId,
      eventType: "ImageVariantsRequested",
      createdAt: event.createdAt,
      payload: {
        memoryId: event.payload.memoryId,
        spaceId,
        assetId: fileId,
        originalKey: `memories/${spaceId}/${fileId}/original`,
        generationRecipeVersion: 1,
      },
    };

    expect(() => parseImageEvent(legacyEvent)).toThrow("INVALID_EVENT");
  });
});

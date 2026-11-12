import { describe, expect, it } from "vitest";
import { apiValidationPipe } from "../../../common/http/pipes/api-validation.pipe";
import { MAX_IMAGE_COUNT } from "../../files/constants/uploads.constants";
import { EditMemoryDto } from "./edit-memory.dto";

const updatedAt = "2026-09-05T16:00:00.123456Z";
const retainedId = "0199CEB0-0000-7000-8000-000000000001";
const addedId = "0199CEB0-0000-7000-8000-000000000002";
const memoryId = "0199ceb0-0000-7000-8000-000000000003";

const validBody = {
  coverFileId: retainedId,
  description: "  Together at the lake.  ",
  lastKnownUpdatedAt: updatedAt,
  location: null,
  memoryDate: "2026-08-20",
  retainedPhotoIds: [retainedId],
  timezone: "UTC",
  title: "Our picnic",
  uploadIds: [addedId],
  visibility: "timeline",
};

const validate = (body: object) =>
  apiValidationPipe.transform(body, { type: "body", metatype: EditMemoryDto });

describe("edit save request validation", () => {
  it("accepts a complete body, preserves the exact timestamp, and lowercases photo references", async () => {
    await expect(validate(validBody)).resolves.toMatchObject({
      coverFileId: retainedId.toLowerCase(),
      description: "Together at the lake.",
      lastKnownUpdatedAt: updatedAt,
      retainedPhotoIds: [retainedId.toLowerCase()],
      uploadIds: [addedId.toLowerCase()],
    });
  });

  it("accepts required empty selections with a null cover", async () => {
    await expect(
      validate({ ...validBody, coverFileId: null, retainedPhotoIds: [], uploadIds: [] }),
    ).resolves.toMatchObject({ coverFileId: null, retainedPhotoIds: [], uploadIds: [] });
  });

  it("rejects unknown fields including an edit idempotency key or storage paths", async () => {
    await expect(validate({ ...validBody, idempotencyKey: retainedId })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      validate({ ...validBody, temporaryPath: "memories/x/original" }),
    ).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects duplicate references and retained/upload overlap", async () => {
    await expect(
      validate({ ...validBody, retainedPhotoIds: [retainedId, retainedId.toLowerCase()] }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validate({ ...validBody, retainedPhotoIds: [retainedId], uploadIds: [retainedId] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects more than ten final photos", async () => {
    const finalIds = Array.from({ length: MAX_IMAGE_COUNT + 1 }, () => crypto.randomUUID());
    await expect(
      validate({
        ...validBody,
        coverFileId: finalIds[0],
        retainedPhotoIds: finalIds.slice(0, 6),
        uploadIds: finalIds.slice(6),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an invalid cover and a missing cover while photos remain", async () => {
    await expect(validate({ ...validBody, coverFileId: memoryId })).rejects.toMatchObject({
      status: 400,
    });
    await expect(validate({ ...validBody, coverFileId: null })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects invalid references, timestamps, dates, timezones, and text", async () => {
    await expect(
      validate({ ...validBody, retainedPhotoIds: ["not-a-uuid"] }),
    ).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      validate({ ...validBody, lastKnownUpdatedAt: "2026-09-05T16:00:00.1234567Z" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(validate({ ...validBody, memoryDate: "2099-01-01" })).rejects.toMatchObject({
      status: 400,
    });
    await expect(validate({ ...validBody, timezone: "Mars/Olympus" })).rejects.toMatchObject({
      status: 400,
    });
    await expect(validate({ ...validBody, title: "   " })).rejects.toMatchObject({ status: 400 });
  });

  it("rejects missing strict fields and forged creator fields", async () => {
    const { description: _description, ...withoutDescription } = validBody;
    await expect(validate(withoutDescription)).rejects.toMatchObject({ status: 400 });

    const { coverFileId: _coverFileId, ...withoutCover } = validBody;
    await expect(validate(withoutCover)).rejects.toMatchObject({ status: 400 });

    await expect(validate({ ...validBody, createdByUserId: "forged" })).rejects.toMatchObject({
      status: 400,
    });
  });
});

import { FilePurpose, FileStatus } from "@leonly/database/client";
import { describe, expect, it } from "vitest";
import { createCreationFixtures, SPACE_ID } from "../../app/tests/creation-fixtures";

describe("file upload confirmation", () => {
  it("rejects active operation owners and reclaims expired claims", async () => {
    const fixtures = await createCreationFixtures();
    const file = fixtures.addUpload({
      bytes: Buffer.from("photo"),
      overrides: {
        operationLockToken: "active-owner",
        operationLockExpiresAt: new Date(Date.now() + 120_000),
      },
    });
    const input = {
      id: file.id,
      userId: "user-a",
      spaceId: SPACE_ID,
      purpose: FilePurpose.memory_image,
    };
    await expect(fixtures.finalization.confirmUploaded(input)).rejects.toMatchObject({
      status: 409,
    });
    expect(fixtures.storage.headObject).not.toHaveBeenCalled();
    file.operationLockExpiresAt = new Date(Date.now() - 1);
    await expect(fixtures.finalization.confirmUploaded(input)).resolves.toMatchObject({
      status: FileStatus.uploaded,
    });
  });
  it("confirms existence without downloading or validating content", async () => {
    const fixtures = await createCreationFixtures();
    const file = fixtures.addUpload({ bytes: Buffer.from("not an image") });
    const confirmed = await fixtures.finalization.confirmUploaded({
      id: file.id,
      userId: "user-a",
      spaceId: SPACE_ID,
      purpose: FilePurpose.memory_image,
    });

    expect(confirmed.status).toBe(FileStatus.uploaded);
    expect(fixtures.storage.headObject).toHaveBeenCalledWith(file.objectKey);
    expect(fixtures.storage.getObject).not.toHaveBeenCalled();
    await fixtures.finalization.release([confirmed]);
    await expect(
      fixtures.finalization.confirmUploaded({
        id: file.id,
        userId: "user-a",
        spaceId: SPACE_ID,
        purpose: FilePurpose.memory_image,
      }),
    ).resolves.toMatchObject({ status: FileStatus.uploaded });
    expect(fixtures.storage.headObject).toHaveBeenCalledTimes(1);
  });

  it("releases a missing or temporarily unavailable upload for retry", async () => {
    const fixtures = await createCreationFixtures();
    const file = fixtures.addUpload({ bytes: Buffer.from("photo") });
    fixtures.storage.headObject.mockResolvedValueOnce(null);
    const input = {
      id: file.id,
      userId: "user-a",
      spaceId: SPACE_ID,
      purpose: FilePurpose.memory_image,
    };
    await expect(fixtures.finalization.confirmUploaded(input)).rejects.toMatchObject({
      status: 404,
    });
    expect(fixtures.state.uploads.get(file.id)).toMatchObject({
      status: FileStatus.pending,
      operationLockToken: null,
    });
    fixtures.storage.headObject.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(fixtures.finalization.confirmUploaded(input)).rejects.toThrow(
      "storage unavailable",
    );
    expect(fixtures.state.uploads.get(file.id)).toMatchObject({
      status: FileStatus.pending,
      lastErrorCode: "UPLOAD_VERIFICATION_RETRYABLE",
      operationLockToken: null,
    });
    await expect(fixtures.finalization.confirmUploaded(input)).resolves.toMatchObject({
      status: FileStatus.uploaded,
    });
  });

  it("rejects foreign owners and fences a superseded claim", async () => {
    const fixtures = await createCreationFixtures();
    const file = fixtures.addUpload({ bytes: Buffer.from("photo") });
    const input = {
      id: file.id,
      userId: "user-a",
      spaceId: SPACE_ID,
      purpose: FilePurpose.memory_image,
    };
    await expect(
      fixtures.finalization.confirmUploaded({ ...input, userId: "other" }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fixtures.storage.headObject).not.toHaveBeenCalled();
    fixtures.storage.headObject.mockImplementationOnce(async () => {
      const current = fixtures.state.uploads.get(file.id);
      if (!current) throw new Error("Missing fixture");
      current.operationLockToken = "replacement";
      return { byteSize: 5, contentType: "image/png" };
    });
    await expect(fixtures.finalization.confirmUploaded(input)).rejects.toMatchObject({
      status: 409,
    });
    expect(fixtures.state.uploads.get(file.id)).toMatchObject({
      status: FileStatus.pending,
      operationLockToken: "replacement",
    });
  });
});

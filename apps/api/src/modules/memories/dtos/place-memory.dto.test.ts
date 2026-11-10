import { describe, expect, it } from "vitest";
import { apiValidationPipe } from "../../../common/http/pipes/api-validation.pipe";
import { PlaceMemoryDto } from "./place-memory.dto";

describe("placement request validation", () => {
  const lastKnownUpdatedAt = "2026-09-05T16:00:00.123456Z";
  const validate = (body: object) =>
    apiValidationPipe.transform(body, { type: "body", metatype: PlaceMemoryDto });

  it.each(["timeline", "vault"])(
    "accepts %s and preserves the exact timestamp",
    async (visibility) => {
      await expect(validate({ visibility, lastKnownUpdatedAt })).resolves.toMatchObject({
        visibility,
        lastKnownUpdatedAt,
      });
    },
  );

  it.each([
    {},
    { visibility: "vault" },
    { lastKnownUpdatedAt },
    { visibility: "public", lastKnownUpdatedAt },
    { visibility: "vault", lastKnownUpdatedAt: "invalid" },
    { visibility: "vault", lastKnownUpdatedAt, userId: "forged" },
    { visibility: "vault", lastKnownUpdatedAt, spaceId: "forged" },
    { visibility: "vault", lastKnownUpdatedAt, expectedVersion: "old" },
    { visibility: "vault", lastKnownUpdatedAt, targetVisibility: "vault" },
  ])("rejects invalid request %j", async (body) => {
    await expect(validate(body)).rejects.toMatchObject({ status: 400 });
  });
});

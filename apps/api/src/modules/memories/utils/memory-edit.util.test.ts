import { describe, expect, it } from "vitest";
import type { EditMemoryDto } from "../dtos/edit-memory.dto";
import { normalizeEditSave } from "./memory-edit.util";

describe("edit save normalization", () => {
  it("normalizes text and lowercases identifiers like creation", () => {
    expect(
      normalizeEditSave({
        title: "  Our picnic  ",
        description: "  \r\nTogether at the lake.  ",
        location: "",
        memoryDate: "2026-08-20",
        timezone: "UTC",
        visibility: "timeline",
        lastKnownUpdatedAt: "2026-09-05T16:00:00.123000Z",
        retainedPhotoIds: ["0199CEB0-0000-7000-8000-000000000001"],
        uploadIds: ["0199CEB0-0000-7000-8000-000000000002"],
        coverFileId: "0199CEB0-0000-7000-8000-000000000002",
      } as EditMemoryDto),
    ).toEqual({
      title: "Our picnic",
      description: "Together at the lake.",
      location: null,
      memoryDate: "2026-08-20",
      timezone: "UTC",
      visibility: "timeline",
      lastKnownUpdatedAt: "2026-09-05T16:00:00.123000Z",
      retainedPhotoIds: ["0199ceb0-0000-7000-8000-000000000001"],
      uploadIds: ["0199ceb0-0000-7000-8000-000000000002"],
      coverFileId: "0199ceb0-0000-7000-8000-000000000002",
    });
  });
});

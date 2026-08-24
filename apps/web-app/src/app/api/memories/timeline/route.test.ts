import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const getTimelinePageMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/memories/server/get-timeline-page", () => ({
  getTimelinePage: getTimelinePageMock,
}));

describe("GET /api/memories/timeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses only the cursor URL parameter and returns the authorized page", async () => {
    getTimelinePageMock.mockResolvedValue({
      cursorReset: false,
      memories: [
        {
          coverPhotoUrl: "https://storage.example/signed-cover",
          createdAt: "2026-08-23T10:00:00.000Z",
          description: null,
          id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
          location: null,
          memoryDate: "2026-08-20",
          title: "Our picnic",
        },
      ],
      nextCursor: null,
    });
    const response = await GET(new Request("http://localhost/api/memories/timeline?cursor=opaque"));

    expect(getTimelinePageMock).toHaveBeenCalledWith("opaque");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cursorReset: false,
      memories: [
        {
          coverPhotoUrl: "https://storage.example/signed-cover",
          createdAt: "2026-08-23T10:00:00.000Z",
          description: null,
          id: "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0",
          location: null,
          memoryDate: "2026-08-20",
          title: "Our picnic",
        },
      ],
      nextCursor: null,
    });
  });

  it("passes a bounded recent-memory limit to the timeline query", async () => {
    getTimelinePageMock.mockResolvedValue({ cursorReset: false, memories: [], nextCursor: null });

    const response = await GET(new Request("http://localhost/api/memories/timeline?limit=4"));

    expect(getTimelinePageMock).toHaveBeenCalledWith(null, 4);
    expect(response.status).toBe(200);
  });

  it("rejects timeline limits outside the supported range", async () => {
    const response = await GET(new Request("http://localhost/api/memories/timeline?limit=21"));

    expect(response.status).toBe(400);
    expect(getTimelinePageMock).not.toHaveBeenCalled();
  });

  it("returns a generic retryable error when the authorized query fails", async () => {
    getTimelinePageMock.mockRejectedValue(new Error("database details"));
    const response = await GET(new Request("http://localhost/api/memories/timeline"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We could not load your memories. Please try again.",
    });
  });
});

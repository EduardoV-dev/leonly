import type { SQSEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";

const { createAdapter, PrismaClient, ObjectStorage, concurrency, cache } = vi.hoisted(() => ({
  createAdapter: vi.fn(() => ({})),
  PrismaClient: vi.fn(),
  ObjectStorage: vi.fn(),
  concurrency: vi.fn(),
  cache: vi.fn(),
}));

vi.mock("@leonly/database", () => ({ PrismaConnection: { createAdapter } }));
vi.mock("@leonly/database/client", () => ({ PrismaClient }));
vi.mock("@leonly/utils/storage", () => ({
  ObjectStorage,
  ObjectSizeError: class extends Error {},
}));
vi.mock("sharp", () => ({ default: { concurrency, cache } }));

describe("image Lambda initialization", () => {
  it("reuses initialized clients and Sharp settings across warm invocations", async () => {
    const { handler } = await import("./handler");
    const event = { Records: [] } as SQSEvent;

    await expect(handler(event)).resolves.toEqual({ batchItemFailures: [] });
    await expect(handler(event)).resolves.toEqual({ batchItemFailures: [] });

    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(ObjectStorage).toHaveBeenCalledTimes(1);
    expect(createAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ max: 2, connectionTimeoutMillis: 5_000, query_timeout: 10_000 }),
    );
    expect(concurrency).toHaveBeenCalledTimes(1);
    expect(concurrency).toHaveBeenCalledWith(1);
    expect(cache).toHaveBeenCalledTimes(1);
    expect(cache).toHaveBeenCalledWith(false);
  });
});

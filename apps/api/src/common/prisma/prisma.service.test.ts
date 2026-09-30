import { Logger } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { connect, disconnect, clientConstructor, onQuery } = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  clientConstructor: vi.fn(),
  onQuery: vi.fn(),
}));

vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: vi.fn() }));
vi.mock("../../generated/prisma/client", () => ({
  PrismaClient: class {
    constructor(options: unknown) {
      clientConstructor(options);
    }
    $connect = connect;
    $disconnect = disconnect;
    $on = onQuery;
  },
}));

const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("PrismaService", () => {
  it("refuses a missing database URL before creating the adapter", async () => {
    delete process.env.DATABASE_URL;
    const { PrismaService } = await import("./prisma.service");
    expect(() => new PrismaService()).toThrow("DATABASE_URL is required");
    expect(PrismaPg).not.toHaveBeenCalled();
  });

  it("connects and disconnects through the Nest lifecycle", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/auth";
    const { PrismaService } = await import("./prisma.service");
    const service = new PrismaService();
    expect(PrismaPg).toHaveBeenCalledWith({ connectionString: process.env.DATABASE_URL });
    expect(clientConstructor).toHaveBeenCalledWith({ adapter: expect.anything(), log: [] });
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("logs SQL and duration without bound parameters in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.DATABASE_URL = "postgresql://localhost/auth";
    const debug = vi.spyOn(Logger.prototype, "debug").mockImplementation(() => {});
    const { PrismaService } = await import("./prisma.service");
    new PrismaService();

    expect(clientConstructor).toHaveBeenCalledWith({
      adapter: expect.anything(),
      log: [{ emit: "event", level: "query" }],
    });
    const [event, callback] = onQuery.mock.calls[0];
    expect(event).toBe("query");
    callback({ query: "SELECT id FROM users WHERE id = $1", duration: 12, params: '["secret"]' });
    expect(debug).toHaveBeenCalledWith(
      { query: "SELECT id FROM users WHERE id = $1", durationMs: 12 },
      "prisma_query",
    );
  });

  it("does not enable query events in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DATABASE_URL = "postgresql://localhost/auth";
    const { PrismaService } = await import("./prisma.service");
    new PrismaService();
    expect(clientConstructor).toHaveBeenCalledWith({ adapter: expect.anything(), log: [] });
    expect(onQuery).not.toHaveBeenCalled();
  });
});

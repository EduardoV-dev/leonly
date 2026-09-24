import { PrismaPg } from "@prisma/adapter-pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { connect, disconnect, clientConstructor } = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  clientConstructor: vi.fn(),
}));

vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: vi.fn() }));
vi.mock("../../../generated/prisma/client", () => ({
  PrismaClient: class {
    constructor(options: unknown) {
      clientConstructor(options);
    }
    $connect = connect;
    $disconnect = disconnect;
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
    expect(clientConstructor).toHaveBeenCalledWith({ adapter: expect.anything() });
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});

import { PrismaPg } from "@prisma/adapter-pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrismaConnection } from "./connection";

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(() => ({ provider: "postgres", adapterName: "@prisma/adapter-pg" })),
}));

afterEach(() => vi.clearAllMocks());

describe("shared Prisma connection configuration", () => {
  it.each(["", "   "])("rejects an empty connection string before creating a driver", (url) => {
    expect(() => PrismaConnection.createAdapter({ connectionString: url })).toThrow(
      "DATABASE_URL is required",
    );
    expect(PrismaPg).not.toHaveBeenCalled();
  });

  it("preserves the caller's connection pool and timeout limits", () => {
    const configuration = {
      connectionString: "postgresql://localhost/leonly",
      max: 2,
      connectionTimeoutMillis: 5_000,
      query_timeout: 10_000,
    };
    const adapter = PrismaConnection.createAdapter(configuration);
    expect(adapter).toMatchObject({ provider: "postgres", adapterName: "@prisma/adapter-pg" });
    expect(PrismaPg).toHaveBeenCalledWith(configuration);
  });

  it("leaves driver defaults intact for the API", () => {
    PrismaConnection.createAdapter({ connectionString: "postgresql://localhost/leonly" });
    expect(PrismaPg).toHaveBeenCalledWith({ connectionString: "postgresql://localhost/leonly" });
  });
});

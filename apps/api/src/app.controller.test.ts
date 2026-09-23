import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { createApp } from "./create-app";

describe("GET /health", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns an OK health status", async () => {
    await request(app.getHttpServer()).get("/health").expect(200).expect({ status: "ok" });
  });
});

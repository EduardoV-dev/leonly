import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { expect, it } from "vitest";
import { AuthService } from "../auth/auth.service";
import { mountApiDocs } from "./api-docs";

const authOptions = { baseURL: "http://localhost:3000" };

@Module({
  providers: [{ provide: AuthService, useValue: { auth: { options: authOptions } } }],
})
class ApiDocsTestModule {}

it.each([
  ["http://localhost:3000", "better-auth.session_token"],
  ["https://app.example.com", "__Secure-better-auth.session_token"],
])("documents the configured session cookie for %s", async (baseURL, cookieName) => {
  authOptions.baseURL = baseURL;
  const app = await NestFactory.create<NestExpressApplication>(ApiDocsTestModule, {
    logger: false,
  });

  try {
    mountApiDocs(app);
    await app.init();
    const { body } = await request(app.getHttpServer()).get("/openapi.json").expect(200);
    expect(body.components.securitySchemes.session).toEqual({
      type: "apiKey",
      in: "cookie",
      name: cookieName,
    });
  } finally {
    await app.close();
  }
});

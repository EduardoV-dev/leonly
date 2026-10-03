import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { getCookies } from "better-auth/cookies";
import type { Request, Response } from "express";
import { AuthService } from "../auth/auth.service";

export function mountApiDocs(app: NestExpressApplication): void {
  const { sessionToken } = getCookies(app.get(AuthService).auth.options);
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Leonly API")
      .setDescription(
        "Nest endpoints use { ok, data, error, message } response bodies. Authentication uses a Better Auth session cookie. Errors include a code, message, and optional request field. Health failures preserve dependency status in data. Better Auth routes under /api/auth/* use their own protocol and are not included in this document.",
      )
      .setVersion("1.0")
      .addCookieAuth(sessionToken.name, { type: "apiKey", in: "cookie" }, "session")
      .build(),
  );
  const express = app.getHttpAdapter().getInstance();
  express.get("/openapi.json", (_request: Request, response: Response) => {
    response.json(document);
  });
  express.use("/docs", apiReference({ url: "/openapi.json" }));
}

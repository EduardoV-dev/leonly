import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import type { Request, Response } from "express";

export function mountApiDocs(app: NestExpressApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle("Leonly API").setVersion("1.0").build(),
  );
  const express = app.getHttpAdapter().getInstance();
  express.get("/openapi.json", (_request: Request, response: Response) => {
    response.json(document);
  });
  express.use("/docs", apiReference({ url: "/openapi.json" }));
}

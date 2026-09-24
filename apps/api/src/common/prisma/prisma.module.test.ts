import { GLOBAL_MODULE_METADATA, MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { AppModule } from "../../app.module";
import { PrismaModule } from "./prisma.module";
import { PrismaService } from "./prisma.service";

describe("PrismaModule", () => {
  it("exports the service to the app for authentication", () => {
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, PrismaModule)).toBe(true);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, PrismaModule)).toContain(PrismaService);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, PrismaModule)).toContain(PrismaService);
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule)).toContain(PrismaModule);
  });
});

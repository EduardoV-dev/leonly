import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { ApiErrorResponses } from "../common/http/docs/api-response.docs";
import { SkipRateLimit } from "../common/rate-limit/decorators/skip-rate-limit.decorator";
import { HealthService } from "./health.service";

const HEALTH_SCHEMA = {
  type: "object" as const,
  required: ["status", "checks"],
  properties: {
    status: { type: "string" as const, enum: ["ok", "degraded", "down"] },
    checks: {
      type: "object" as const,
      required: ["database", "redis"],
      properties: {
        database: { type: "string" as const, enum: ["up", "down"] },
        redis: { type: "string" as const, enum: ["up", "down"] },
      },
    },
  },
};

@Controller()
@ApiTags("Health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("health")
  @Public()
  @SkipRateLimit()
  @ApiOperation({
    summary: "Check API health",
    description:
      "Public, uncached dependency check, independent of rate-limit storage. Returns a direct { status, checks } body: ok/200 when all dependencies are up, degraded/503 for mixed results, or down/503 when all are down.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "All dependencies are healthy",
    schema: {
      ...HEALTH_SCHEMA,
      example: { status: "ok", checks: { database: "up", redis: "up" } },
    },
  })
  @ApiServiceUnavailableResponse({
    description: "At least one dependency is unhealthy",
    schema: {
      ...HEALTH_SCHEMA,
      example: { status: "degraded", checks: { database: "down", redis: "up" } },
    },
  })
  @ApiErrorResponses(HttpStatus.INTERNAL_SERVER_ERROR)
  async getHealth(@Res() response: Response): Promise<void> {
    const health = await this.healthService.check();
    const status = health.status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    response.setHeader("Cache-Control", "no-store");
    response.status(status).json(health);
  }
}

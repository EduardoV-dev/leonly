import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../auth/decorators/public";
import { createApiError } from "../common/http/api-response";
import {
  ApiErrorResponses,
  ApiSuccessResponse,
  apiResponseSchema,
} from "../common/http/api-response.docs";
import { type DependencyHealth, HealthService } from "./health.service";

const HEALTH_SCHEMA = {
  type: "object" as const,
  required: ["database", "redis"],
  properties: { database: { type: "boolean" as const }, redis: { type: "boolean" as const } },
};
const UNAVAILABLE_ERROR = createApiError(HttpStatus.SERVICE_UNAVAILABLE);

@Controller()
@ApiTags("Health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get("health")
  @Public()
  @ApiOperation({
    summary: "Check API health",
    description:
      "Public, uncached dependency check. Returns 200 when PostgreSQL and Redis are healthy, otherwise 503 with ok: false and both dependency statuses preserved in data.",
  })
  @ApiSuccessResponse({
    description: "All dependencies are healthy",
    data: HEALTH_SCHEMA,
    example: { database: true, redis: true },
  })
  @ApiServiceUnavailableResponse({
    description: "At least one dependency is unhealthy",
    schema: apiResponseSchema({
      data: HEALTH_SCHEMA,
      ok: false,
      example: {
        ok: false,
        data: { database: false, redis: true },
        error: [UNAVAILABLE_ERROR],
        message: UNAVAILABLE_ERROR.message,
      },
    }),
  })
  @ApiErrorResponses(HttpStatus.INTERNAL_SERVER_ERROR)
  async getHealth(@Res({ passthrough: true }) response: Response): Promise<DependencyHealth> {
    const health = await this.health.check();
    const isHealthy = health.database && health.redis;
    response.setHeader("Cache-Control", "no-store");
    response.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return health;
  }
}

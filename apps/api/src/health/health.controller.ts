import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { type ApiError, createApiError } from "../common/http/api-response";
import {
  ApiErrorResponses,
  ApiSuccessResponse,
  apiResponseSchema,
} from "../common/http/api-response.docs";
import { ApiServiceUnavailableError } from "../common/http/errors/api-service-unavailable.error";
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
  constructor(private readonly healthService: HealthService) {}

  @Get("health")
  @Public()
  @ApiOperation({
    summary: "Check API health",
    description:
      "Public, uncached dependency check. Returns 200 when PostgreSQL and Redis are healthy, otherwise 503 with data: null and a structured error for each unhealthy dependency.",
  })
  @ApiSuccessResponse({
    description: "All dependencies are healthy",
    data: HEALTH_SCHEMA,
    example: { database: true, redis: true },
  })
  @ApiServiceUnavailableResponse({
    description: "At least one dependency is unhealthy",
    schema: apiResponseSchema({
      data: { type: "object", nullable: true, enum: [null] },
      ok: false,
      example: {
        ok: false,
        data: null,
        error: [{ ...UNAVAILABLE_ERROR, field: "database" }],
        message: UNAVAILABLE_ERROR.message,
      },
    }),
  })
  @ApiErrorResponses(HttpStatus.INTERNAL_SERVER_ERROR)
  async getHealth(@Res({ passthrough: true }) response: Response): Promise<DependencyHealth> {
    const health = await this.healthService.check();
    const errors: ApiError[] = [];

    if (!health.database) errors.push({ ...UNAVAILABLE_ERROR, field: "database" });
    if (!health.redis) errors.push({ ...UNAVAILABLE_ERROR, field: "redis" });

    response.setHeader("Cache-Control", "no-store");
    if (errors.length > 0) throw new ApiServiceUnavailableError(errors);

    return health;
  }
}

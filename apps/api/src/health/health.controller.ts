import { Controller, Get, Res } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../auth/decorators/public";
import { HealthService } from "./health.service";

@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get("health")
  @Public()
  @ApiOperation({ summary: "Check API health" })
  @ApiOkResponse({
    schema: {
      example: { database: true, redis: true },
    },
  })
  @ApiServiceUnavailableResponse({
    schema: { example: { database: false, redis: true } },
  })
  async getHealth(@Res() response: Response): Promise<void> {
    const health = await this.health.check();
    response.setHeader("Cache-Control", "no-store");
    response.status(health.database && health.redis ? 200 : 503).json(health);
  }
}

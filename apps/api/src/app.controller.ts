import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { Public } from "./auth/decorators/public";

@Controller()
export class AppController {
  @Get("health")
  @Public()
  @ApiOperation({ summary: "Check API health" })
  @ApiOkResponse({
    schema: {
      example: {
        ok: true,
        data: { status: "ok" },
        error: [],
        message: "Request completed successfully",
      },
    },
  })
  getHealth(): Readonly<{ status: "ok" }> {
    return { status: "ok" };
  }
}

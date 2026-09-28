import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/auth.guard";
import { CreateSpaceDto } from "./dtos/create-space.dto";
import { SpacesService } from "./spaces.service";

@Controller("spaces")
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: "Create a space" })
  @ApiBody({ type: CreateSpaceDto })
  @ApiResponse({
    status: 200,
    description: "Space created",
    schema: {
      example: {
        ok: true,
        data: { space_id: "0199a9aa-1234-7000-8000-111111111111" },
        error: [],
        message: "Request completed successfully",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid request" })
  @ApiResponse({ status: 401, description: "Authentication required" })
  @ApiResponse({ status: 409, description: "Already belongs to an active space" })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() details: CreateSpaceDto,
  ): Promise<{ space_id: string }> {
    return this.spacesService.create({
      userId: request.authUser.id,
      accountName: request.authUser.name,
      details: {
        spaceName: details.space_name,
        displayName: details.display_name ?? "",
        startDate: new Date(`${details.start_date}T00:00:00.000Z`),
      },
    });
  }
}

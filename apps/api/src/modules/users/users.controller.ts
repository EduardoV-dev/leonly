import { Controller, Get, Req } from "@nestjs/common";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/auth.guard";
import { SpacesService } from "../spaces/spaces.service";

@Controller("users/me")
export class UsersController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get("space")
  @ApiOperation({ summary: "Read the current user's active space" })
  @ApiResponse({ status: 200, description: "Active space or null" })
  @ApiResponse({ status: 401, description: "Authentication required" })
  async getCurrentUserSpace(@Req() request: AuthenticatedRequest) {
    return this.spacesService.getActiveSpace(request.authUser.id);
  }
}

import { Controller, Get, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../common/http/api-response.docs";
import { ACTIVE_SPACE_EXAMPLE, ACTIVE_SPACE_SCHEMA } from "../spaces/dtos/space-response.docs";
import { SpacesService } from "../spaces/spaces.service";

@Controller("users/me")
@ApiTags("Users")
@ApiCookieAuth("session")
@ApiErrorResponses(401, 500)
export class UsersController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get("space")
  @ApiOperation({
    summary: "Read the current user's active space",
    description:
      "Return the active space and its members, or data: null when no membership exists.",
  })
  @ApiSuccessResponse({
    description: "Active space or null",
    data: ACTIVE_SPACE_SCHEMA,
    example: ACTIVE_SPACE_EXAMPLE,
  })
  async getCurrentUserSpace(@Req() request: AuthenticatedRequest) {
    return this.spacesService.getActiveSpace(request.authUser.id);
  }
}

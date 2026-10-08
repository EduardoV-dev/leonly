import { Body, Controller, HttpCode, Patch, Post, Req, Res } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../../auth/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../../common/http/api-response.docs";
import { EditResponse } from "../../../common/http/edit-response.docs";
import { SPACE_ID_EXAMPLE, SPACE_ID_SCHEMA } from "../../spaces/dtos/space-response.docs";
import { EditDisplayNameDto } from "../dtos/edit-display-name.dto";
import { JoinSpaceDto } from "../dtos/join-space.dto";
import type { DisplayNameEditResult } from "../memberships.types";
import { MembershipsService } from "../services/memberships.service";
import { throwJoinError } from "../utils/throw-join-error";

@Controller("memberships")
@ApiTags("Memberships")
@ApiCookieAuth("session")
@ApiErrorResponses(401, 500)
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Patch("display-name")
  @ApiOperation({ summary: "Update the current membership's display name" })
  @ApiErrorResponses(400, 404)
  @EditResponse("displayName")
  async displayName(
    @Req() request: AuthenticatedRequest,
    @Body() body: EditDisplayNameDto,
  ): Promise<DisplayNameEditResult> {
    return this.memberships.updateDisplayName({
      userId: request.authUser.id,
      displayName: body.displayName,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
  }

  @Post("onboarding")
  @HttpCode(200)
  @ApiOperation({
    summary: "Complete space setup",
    description: "Record onboarding completion for the authenticated user's active membership.",
  })
  @ApiSuccessResponse({
    description: "Space setup completed",
    data: {
      type: "object",
      required: ["completed"],
      properties: { completed: { type: "boolean", enum: [true] } },
    },
    example: { completed: true },
  })
  @ApiErrorResponses(403, 409)
  async completeSetup(@Req() request: AuthenticatedRequest): Promise<{ completed: true }> {
    return this.memberships.completeSetup(request.authUser.id);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: "Join a space with an invite",
    description:
      "Create a partner membership and consume the invite. Expired, full, self-owned, or otherwise unavailable invites return 404. Locked attempts return 429 with Retry-After.",
  })
  @ApiBody({ type: JoinSpaceDto })
  @ApiSuccessResponse({
    description: "Space joined",
    data: SPACE_ID_SCHEMA,
    example: SPACE_ID_EXAMPLE,
  })
  @ApiErrorResponses(400, 403, 404, 429)
  async join(
    @Req() request: AuthenticatedRequest,
    @Body() body: JoinSpaceDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ space_id: string }> {
    const result = await this.memberships.join({
      userId: request.authUser.id,
      accountName: request.authUser.name,
      inviteCode: body.invite_code,
      displayName: body.display_name,
    });
    if (result.status === "joined") return { space_id: result.space_id };
    throwJoinError(result, response);
  }
}

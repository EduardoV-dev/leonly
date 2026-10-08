import { Body, Controller, HttpCode, HttpException, Patch, Post, Req, Res } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../../auth/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../../common/http/api-response.docs";
import { EditResponse } from "../../../common/http/edit-response.docs";
import { ValidateSpaceInviteDto } from "../../memberships/dtos/join-space.dto";
import { MembershipsService } from "../../memberships/services/memberships.service";
import { throwJoinError } from "../../memberships/utils/throw-join-error";
import { CreateSpaceDto } from "../dtos/create-space.dto";
import { EditStartDateDto, RenameSpaceDto } from "../dtos/edit-space.dto";
import { INVITE_SCHEMA } from "../dtos/edit-space-response.docs";
import { SPACE_ID_EXAMPLE, SPACE_ID_SCHEMA } from "../dtos/space-response.docs";
import { InviteRegenerationService } from "../services/invite-regeneration.service";
import { SpacesService } from "../services/spaces.service";
import type { SpaceEditResult } from "../spaces.types";

@Controller("spaces")
@ApiTags("Spaces")
@ApiCookieAuth("session")
@ApiErrorResponses(401, 403, 500)
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly invitesService: InviteRegenerationService,
    private readonly membershipsService: MembershipsService,
  ) { }

  @Patch("name")
  @ApiOperation({ summary: "Rename the current shared space" })
  @ApiErrorResponses(400, 404)
  @EditResponse("name")
  async rename(
    @Req() request: AuthenticatedRequest,
    @Body() body: RenameSpaceDto,
  ): Promise<SpaceEditResult> {
    return this.spacesService.updateName({
      userId: request.authUser.id,
      name: body.name,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
  }

  @Patch("start-date")
  @ApiOperation({ summary: "Update the current shared space's start date" })
  @ApiErrorResponses(400, 404)
  @EditResponse("startDate")
  async startDate(
    @Req() request: AuthenticatedRequest,
    @Body() body: EditStartDateDto,
  ): Promise<SpaceEditResult> {
    return this.spacesService.updateStartDate({
      userId: request.authUser.id,
      startDate: body.startDate,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
  }

  @Post("invites/validations")
  @HttpCode(200)
  @ApiOperation({
    summary: "Validate a space invite",
    description:
      "Check whether an invite is usable without joining. Invalid attempts count toward the join limit. Unavailable invites return 404; locked attempts return 429 with Retry-After.",
  })
  @ApiBody({ type: ValidateSpaceInviteDto })
  @ApiSuccessResponse({
    description: "Invite is usable",
    data: {
      type: "object",
      required: ["valid"],
      properties: { valid: { type: "boolean", enum: [true] } },
    },
    example: { valid: true },
  })
  @ApiErrorResponses(400, 404, 429)
  async validateInvite(
    @Req() request: AuthenticatedRequest,
    @Body() body: ValidateSpaceInviteDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ valid: true }> {
    const result = await this.membershipsService.validateInvite({
      userId: request.authUser.id,
      inviteCode: body.invite_code,
    });
    if (result.status === "valid") return { valid: true };
    throwJoinError(result, response);
  }

  @Post("invites/regenerations")
  @HttpCode(200)
  @ApiOperation({
    summary: "Regenerate an unavailable partner invite",
    description:
      "Five requests per ten minutes. Valid invites cannot be replaced. Partner-joined conflicts use error code joined.",
  })
  @ApiErrorResponses(404, 409, 429)
  @ApiSuccessResponse({
    description: "New invite, valid for 24 hours",
    data: INVITE_SCHEMA,
    example: undefined,
  })
  async regenerate(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ invite_code: string; invite_code_expires_at: string }> {
    try {
      return await this.invitesService.regenerate(request.authUser.id);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 429) {
        const details = error.getResponse();
        if (typeof details === "object" && "retryAfter" in details) {
          response.setHeader("Retry-After", String(details.retryAfter));
        }
      }
      throw error;
    }
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: "Create a space",
    description: "Create a space and its owner membership for the authenticated user.",
  })
  @ApiBody({ type: CreateSpaceDto })
  @ApiSuccessResponse({
    description: "Space created",
    data: SPACE_ID_SCHEMA,
    example: SPACE_ID_EXAMPLE,
  })
  @ApiErrorResponses(400, 409)
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

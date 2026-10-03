import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../common/http/api-response.docs";
import { JOIN_LOCK_MESSAGE } from "./constants/spaces.constants";
import { CreateSpaceDto } from "./dtos/create-space.dto";
import { JoinSpaceDto, ValidateSpaceInviteDto } from "./dtos/join-space.dto";
import { SPACE_ID_EXAMPLE, SPACE_ID_SCHEMA } from "./dtos/space-response.docs";
import { SpacesService } from "./spaces.service";

@Controller("spaces")
@ApiTags("Spaces")
@ApiCookieAuth("session")
@ApiErrorResponses(401, 403, 500)
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

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

  @Post("memberships/onboarding")
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
  @ApiErrorResponses(409)
  async completeSetup(@Req() request: AuthenticatedRequest): Promise<{ completed: true }> {
    const didComplete = await this.spacesService.completeSetup(request.authUser.id);
    if (!didComplete) {
      throw new ConflictException({ error: "You do not belong to an active space." });
    }

    return { completed: true };
  }

  @Post("invite-validations")
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
    const result = await this.spacesService.validateInvite({
      userId: request.authUser.id,
      inviteCode: body.invite_code,
    });
    if (result.status === "valid") return { valid: true };
    this.throwJoinError(result, response);
  }

  @Post("memberships")
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
  @ApiErrorResponses(400, 404, 429)
  async join(
    @Req() request: AuthenticatedRequest,
    @Body() body: JoinSpaceDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ space_id: string }> {
    const result = await this.spacesService.join({
      userId: request.authUser.id,
      accountName: request.authUser.name,
      inviteCode: body.invite_code,
      displayName: body.display_name,
    });
    if (result.status === "joined") return { space_id: result.space_id };
    this.throwJoinError(result, response);
  }

  private throwJoinError(
    result:
      | { status: "invalid_name" | "malformed" | "unavailable" }
      | { status: "locked"; retryAfter: number }
      | { status: "valid" },
    response: Response,
  ): never {
    if (result.status === "locked") {
      response.setHeader("Retry-After", String(result.retryAfter));
      throw new HttpException(JOIN_LOCK_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (result.status === "malformed") {
      throw new BadRequestException({ error: "The format of the code provided is invalid." });
    }
    if (result.status === "invalid_name") {
      throw new BadRequestException({
        errors: [
          {
            code: "VALIDATION_ERROR",
            field: "display_name",
            message: "Your name must contain 2 to 100 characters.",
          },
        ],
      });
    }
    throw new NotFoundException({ error: "This invite is invalid or unavailable." });
  }
}

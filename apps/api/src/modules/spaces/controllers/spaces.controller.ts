import { Body, Controller, HttpCode, HttpStatus, Patch, Post, Req } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../../auth/auth.guard";
import {
  ApiErrorResponses,
  ApiSuccessResponse,
  apiResponseSchema,
} from "../../../common/http/api-response.docs";
import { EditResponse } from "../../../common/http/edit-response.docs";
import { SETTINGS_WRITE_RATE_LIMIT } from "../../../common/rate-limit/rate-limit.constants";
import { RateLimit } from "../../../common/rate-limit/rate-limit.decorator";
import { JOIN_RATE_LIMIT } from "../constants/memberships.constants";
import { CreateSpaceDto } from "../dtos/create-space.dto";
import { EditStartDateDto, RenameSpaceDto } from "../dtos/edit-space.dto";
import { INVITE_SCHEMA } from "../dtos/edit-space-response.docs";
import { ValidateSpaceInviteDto } from "../dtos/join-space.dto";
import { SPACE_ID_EXAMPLE, SPACE_ID_SCHEMA } from "../dtos/space-response.docs";
import { InviteRegenerationService } from "../services/invite-regeneration.service";
import { MembershipsService } from "../services/memberships.service";
import { SpacesService } from "../services/spaces.service";
import type { SpaceEditResult } from "../types/spaces.types";
import { throwJoinError } from "../utils/throw-join-error";

@Controller("spaces")
@ApiTags("Spaces")
@ApiCookieAuth("session")
@ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.INTERNAL_SERVER_ERROR)
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly invitesService: InviteRegenerationService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @Patch("name")
  @RateLimit(SETTINGS_WRITE_RATE_LIMIT)
  @ApiOperation({
    summary: "Rename the current shared space",
    description:
      "Settings mutations share thirty requests per minute per user, using a sliding window.",
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
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
  @RateLimit(SETTINGS_WRITE_RATE_LIMIT)
  @ApiOperation({
    summary: "Update the current shared space's start date",
    description:
      "Settings mutations share thirty requests per minute per user, using a sliding window.",
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
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
  @RateLimit(JOIN_RATE_LIMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Validate a space invite",
    description:
      "Check whether an invite is usable without joining. Validation and joining share five requests per ten-minute fixed window, including successful requests. Unavailable invites return 404; throttled requests return 429 with Retry-After.",
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
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
  async validateInvite(
    @Req() request: AuthenticatedRequest,
    @Body() body: ValidateSpaceInviteDto,
  ): Promise<{ valid: true }> {
    const result = await this.membershipsService.validateInvite({
      userId: request.authUser.id,
      inviteCode: body.invite_code,
    });
    if (result.status === "valid") return { valid: true };
    throwJoinError(result);
  }

  @Post("invites/regenerations")
  @RateLimit({
    limit: 5,
    window: "10 m",
    strategy: "fixed-window",
    scope: "user",
    key: "invite-regeneration",
    message: "Too many invite requests. Try again in 10 minutes.",
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Regenerate an unavailable partner invite",
    description:
      "Five requests per ten minutes. Valid invites cannot be replaced. Partner-joined conflicts use error code joined.",
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Your partner has already joined this space.",
    schema: apiResponseSchema({
      data: { type: "object", nullable: true, enum: [null] },
      ok: false,
      example: {
        ok: false,
        data: null,
        error: [{ code: "joined", message: "Your partner has already joined this space." }],
        message: "Your partner has already joined this space.",
      },
    }),
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    description: "New invite, valid for 24 hours",
    data: INVITE_SCHEMA,
    example: { invite_code: "lny7kmp2", invite_code_expires_at: "2026-07-23T12:00:00.000Z" },
  })
  async regenerate(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ invite_code: string; invite_code_expires_at: string }> {
    return this.invitesService.regenerate(request.authUser.id);
  }

  @Post()
  @RateLimit({ limit: 5, window: "10 m", strategy: "fixed-window", scope: "user" })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a space",
    description:
      "Create a space and its owner membership for the authenticated user. Five requests per ten-minute fixed window per user.",
  })
  @ApiBody({ type: CreateSpaceDto })
  @ApiSuccessResponse({
    description: "Space created",
    status: HttpStatus.CREATED,
    data: SPACE_ID_SCHEMA,
    example: SPACE_ID_EXAMPLE,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.TOO_MANY_REQUESTS)
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "You already belong to an active space.",
    schema: apiResponseSchema({
      data: { type: "object", nullable: true, enum: [null] },
      ok: false,
      example: {
        ok: false,
        data: null,
        error: [{ code: "HTTP_409", message: "You already belong to an active space." }],
        message: "You already belong to an active space.",
      },
    }),
  })
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

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
import { EditDisplayNameDto } from "../dtos/edit-display-name.dto";
import { JoinSpaceDto } from "../dtos/join-space.dto";
import { SPACE_ID_EXAMPLE, SPACE_ID_SCHEMA } from "../dtos/space-response.docs";
import { MembershipsService } from "../services/memberships.service";
import type { DisplayNameEditResult } from "../types/memberships.types";
import { throwJoinError } from "../utils/throw-join-error";

@Controller("spaces/memberships")
@ApiTags("Memberships")
@ApiCookieAuth("session")
@ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.INTERNAL_SERVER_ERROR)
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Patch("display-name")
  @RateLimit(SETTINGS_WRITE_RATE_LIMIT)
  @ApiOperation({
    summary: "Update the current membership's display name",
    description:
      "Settings mutations share thirty requests per minute per user, using a sliding window.",
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
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
  @HttpCode(HttpStatus.OK)
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
  @ApiErrorResponses(HttpStatus.FORBIDDEN)
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "You do not belong to an active space.",
    schema: apiResponseSchema({
      data: { type: "object", nullable: true, enum: [null] },
      ok: false,
      example: {
        ok: false,
        data: null,
        error: [{ code: "HTTP_409", message: "You do not belong to an active space." }],
        message: "You do not belong to an active space.",
      },
    }),
  })
  async completeSetup(@Req() request: AuthenticatedRequest): Promise<{ completed: true }> {
    return this.memberships.completeSetup(request.authUser.id);
  }

  @Post()
  @RateLimit(JOIN_RATE_LIMIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Join a space with an invite",
    description:
      "Create a partner membership and consume the invite. Validation and joining share five requests per ten-minute fixed window, including successful requests. Expired, full, self-owned, or otherwise unavailable invites return 404. Throttled requests return 429 with Retry-After.",
  })
  @ApiBody({ type: JoinSpaceDto })
  @ApiSuccessResponse({
    description: "Space joined",
    status: HttpStatus.CREATED,
    data: SPACE_ID_SCHEMA,
    example: SPACE_ID_EXAMPLE,
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.TOO_MANY_REQUESTS,
  )
  async join(
    @Req() request: AuthenticatedRequest,
    @Body() body: JoinSpaceDto,
  ): Promise<{ space_id: string }> {
    const result = await this.memberships.join({
      userId: request.authUser.id,
      accountName: request.authUser.name,
      inviteCode: body.invite_code,
      displayName: body.display_name,
    });
    if (result.status === "joined") return { space_id: result.space_id };
    throwJoinError(result);
  }
}

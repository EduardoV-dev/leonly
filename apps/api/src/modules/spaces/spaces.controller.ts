import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse } from "@nestjs/swagger";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/auth.guard";
import { JOIN_LOCK_MESSAGE } from "./constants/spaces.constants";
import { CreateSpaceDto } from "./dtos/create-space.dto";
import { JoinSpaceDto, ValidateSpaceInviteDto } from "./dtos/join-space.dto";
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

  @Post("invite-validations")
  @HttpCode(200)
  @ApiOperation({ summary: "Validate a space invite" })
  @ApiBody({ type: ValidateSpaceInviteDto })
  @ApiResponse({ status: 200, description: "Invite is usable" })
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
  @ApiOperation({ summary: "Join a space with an invite" })
  @ApiBody({ type: JoinSpaceDto })
  @ApiResponse({ status: 200, description: "Space joined" })
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

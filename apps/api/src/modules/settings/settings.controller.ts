import { Controller, Get, HttpStatus, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/guards/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../common/http/docs/api-response.docs";
import { SETTINGS_EXAMPLE, SETTINGS_SCHEMA } from "./docs/settings-response.docs";
import { SettingsService } from "./settings.service";
import type { SettingsReadModel } from "./types/settings.types";

@Controller()
@ApiTags("Settings")
@ApiCookieAuth("session")
@ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.INTERNAL_SERVER_ERROR)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("users/me/settings")
  @ApiOperation({ summary: "Read current user's settings" })
  @ApiSuccessResponse({
    description: "Settings, or null without an active space",
    data: SETTINGS_SCHEMA,
    example: SETTINGS_EXAMPLE,
  })
  getSettings(@Req() request: AuthenticatedRequest): Promise<SettingsReadModel | null> {
    return this.settingsService.getSettings(request.authUser.id);
  }
}

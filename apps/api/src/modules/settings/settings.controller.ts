import { Controller, Get, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../common/http/api-response.docs";
import { SETTINGS_SCHEMA } from "./dtos/settings-response.docs";
import { SettingsService } from "./services/settings.service";
import type { SettingsReadModel } from "./settings.types";

@Controller()
@ApiTags("Settings")
@ApiCookieAuth("session")
@ApiErrorResponses(401, 500)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("users/me/settings")
  @ApiOperation({ summary: "Read current user's settings" })
  @ApiSuccessResponse({
    description: "Settings, or null without an active space",
    data: SETTINGS_SCHEMA,
    example: null,
  })
  getSettings(@Req() request: AuthenticatedRequest): Promise<SettingsReadModel | null> {
    return this.settings.getSettings(request.authUser.id);
  }
}

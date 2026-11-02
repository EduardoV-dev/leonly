import { Body, Controller, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/guards/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../common/http/docs/api-response.docs";
import { MAX_IMAGE_COUNT } from "./constants/uploads.constants";
import { IssueUploadsDto } from "./dtos/issue-uploads.dto";
import { FilesService, type UploadIssuanceResult } from "./files.service";

@Controller("files")
@ApiTags("Files")
@ApiCookieAuth("session")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("uploads")
  @ApiOperation({ summary: "Issue private staging upload capabilities" })
  @ApiBody({ type: IssueUploadsDto })
  @ApiErrorResponses(400, 401, 403, 404, 500)
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    description: "Upload identities persisted before capabilities are issued",
    data: {
      type: "object",
      required: ["uploads"],
      properties: {
        uploads: {
          type: "array",
          minItems: 1,
          maxItems: MAX_IMAGE_COUNT,
          items: {
            type: "object",
            required: ["id", "putUrl", "requiredHeaders", "expiresAt", "attachmentDeadline"],
            properties: {
              id: { type: "string", format: "uuid" },
              putUrl: { type: "string", format: "uri" },
              requiredHeaders: {
                type: "object",
                required: ["Content-Type"],
                properties: { "Content-Type": { type: "string" } },
              },
              expiresAt: { type: "string", format: "date-time" },
              attachmentDeadline: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    example: {
      uploads: [
        {
          id: "01900000-0000-7000-8000-000000000001",
          putUrl: "https://storage.example.com/signed-staging-object",
          requiredHeaders: { "Content-Type": "image/jpeg" },
          expiresAt: "2026-10-11T00:10:00.000Z",
          attachmentDeadline: "2026-10-11T01:10:00.000Z",
        },
      ],
    },
  })
  async issue(
    @Req() request: AuthenticatedRequest,
    @Body() body: IssueUploadsDto,
  ): Promise<UploadIssuanceResult> {
    return this.filesService.issue({ userId: request.authUser.id, body });
  }
}

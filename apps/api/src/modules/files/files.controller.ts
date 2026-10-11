import { Body, Controller, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../common/http/api-response.docs";
import { FilesService, type UploadIssuanceResult } from "./files.service";

@Controller("files")
@ApiTags("Files")
@ApiCookieAuth("session")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("uploads")
  @ApiOperation({ summary: "Issue private staging upload capabilities" })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["purpose", "files"],
      properties: {
        purpose: { type: "string", enum: ["memory_image"] },
        files: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["filename", "contentType", "byteSize"],
            properties: {
              filename: { type: "string", example: "photo.jpg" },
              contentType: { type: "string", enum: ["image/jpeg", "image/png", "image/webp"] },
              byteSize: { type: "integer", minimum: 1, maximum: 5_242_880 },
            },
          },
        },
      },
    },
  })
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
          maxItems: 10,
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
    @Body() body: unknown,
  ): Promise<UploadIssuanceResult> {
    return this.files.issue(request.authUser.id, body);
  }
}

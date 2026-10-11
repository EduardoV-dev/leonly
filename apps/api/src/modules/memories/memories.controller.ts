import { Body, Controller, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../common/http/api-response.docs";
import { type CreationResult, MemoriesService } from "./memories.service";

@Controller("memories")
@ApiTags("Memories")
@ApiCookieAuth("session")
export class MemoriesController {
  constructor(private readonly memories: MemoriesService) {}

  @Post()
  @ApiOperation({ summary: "Create a memory from immutable finalized originals" })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "memoryDate", "timezone", "visibility", "uploadIds", "idempotencyKey"],
      properties: {
        title: { type: "string", minLength: 1, maxLength: 120 },
        description: { type: "string", nullable: true, maxLength: 2000 },
        location: { type: "string", nullable: true, maxLength: 150 },
        memoryDate: {
          type: "string",
          format: "date",
          description: "Real calendar date, no later than today in timezone",
        },
        timezone: { type: "string", example: "UTC" },
        visibility: { type: "string", enum: ["timeline", "vault"] },
        uploadIds: {
          type: "array",
          maxItems: 10,
          uniqueItems: true,
          items: { type: "string", format: "uuid" },
        },
        coverUploadId: { type: "string", format: "uuid", nullable: true },
        idempotencyKey: { type: "string", format: "uuid" },
      },
    },
  })
  @ApiErrorResponses(400, 401, 403, 404, 409, 500)
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    description: "Memory and generation events committed with pending variants",
    data: {
      type: "object",
      required: ["id", "visibility"],
      properties: {
        id: { type: "string", format: "uuid" },
        visibility: { type: "string", enum: ["timeline", "vault"] },
      },
    },
    example: { id: "01900000-0000-7000-8000-000000000004", visibility: "timeline" },
  })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<CreationResult> {
    return this.memories.create({ userId: request.authUser.id, body });
  }
}

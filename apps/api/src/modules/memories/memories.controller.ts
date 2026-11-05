import { Body, Controller, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/guards/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../common/http/docs/api-response.docs";
import { CreateMemoryDto } from "./dtos/create-memory.dto";
import { type CreationResult, MemoriesService } from "./services/memories.service";

@Controller("memories")
@ApiTags("Memories")
@ApiCookieAuth("session")
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  @ApiOperation({ summary: "Create a memory from uploaded files pending asynchronous validation" })
  @ApiBody({ type: CreateMemoryDto })
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
    @Body() body: CreateMemoryDto,
  ): Promise<CreationResult> {
    return this.memoriesService.create({ userId: request.authUser.id, body });
  }
}

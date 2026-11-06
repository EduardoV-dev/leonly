import type { MemoryDetail, MemoryListPage } from "@leonly/utils/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../auth/guards/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../common/http/docs/api-response.docs";
import { MEMORY_DETAIL_EXAMPLE, MEMORY_DETAIL_SCHEMA } from "./docs/memory-detail.docs";
import { MEMORY_LIST_EXAMPLE, MEMORY_LIST_SCHEMA } from "./docs/memory-list.docs";
import { CreateMemoryDto } from "./dtos/create-memory.dto";
import { ListMemoriesDto } from "./dtos/list-memories.dto";
import { type CreationResult, MemoriesService } from "./services/memories.service";
import { MemoryDetailService } from "./services/memory-detail.service";
import { MemoryListService } from "./services/memory-list.service";

const INVALID_MEMORY_ID_MESSAGE = "Memory id is not valid.";

const UUID_PARAM_VALIDATOR = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException({ error: INVALID_MEMORY_ID_MESSAGE }),
})

@Controller("memories")
@ApiTags("Memories")
@ApiCookieAuth("session")
export class MemoriesController {
  constructor(
    private readonly memoriesService: MemoriesService,
    private readonly memoryListService: MemoryListService,
    private readonly memoryDetailService: MemoryDetailService,
  ) { }

  @Get("timeline")
  @ApiOperation({ summary: "List active-space Timeline memories" })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  @ApiSuccessResponse({
    description: "Memory page",
    data: MEMORY_LIST_SCHEMA,
    example: MEMORY_LIST_EXAMPLE,
  })
  async timeline(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListMemoriesDto,
  ): Promise<MemoryListPage> {
    return this.memoryListService.list({
      userId: request.authUser.id,
      visibility: "timeline",
      query,
      limit: query.limit === undefined ? undefined : Number(query.limit),
    });
  }

  @Get("timeline/:memoryId")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Read active-space Timeline memory" })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  @ApiSuccessResponse({
    description: "Memory detail",
    data: MEMORY_DETAIL_SCHEMA,
    example: MEMORY_DETAIL_EXAMPLE,
  })
  async getTimelineDetail(
    @Req() request: AuthenticatedRequest,
    @Param(
      "memoryId",
      UUID_PARAM_VALIDATOR,
    )
    memoryId: string,
  ): Promise<MemoryDetail> {
    return this.memoryDetailService.getDetail({
      userId: request.authUser.id,
      memoryId,
      visibility: "timeline",
    });
  }

  @Get("vault/:memoryId")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Read active-space Vault memory" })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  @ApiSuccessResponse({
    description: "Memory detail",
    data: MEMORY_DETAIL_SCHEMA,
    example: { ...MEMORY_DETAIL_EXAMPLE, visibility: "vault" },
  })
  async getVaultDetail(
    @Req() request: AuthenticatedRequest,
    @Param(
      "memoryId",
      UUID_PARAM_VALIDATOR,
    )
    memoryId: string,
  ): Promise<MemoryDetail> {
    return this.memoryDetailService.getDetail({
      userId: request.authUser.id,
      memoryId,
      visibility: "vault",
    });
  }

  @Get("vault")
  @ApiOperation({ summary: "List active-space Vault memories" })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  @ApiSuccessResponse({
    description: "Memory page",
    data: MEMORY_LIST_SCHEMA,
    example: MEMORY_LIST_EXAMPLE,
  })
  async vault(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListMemoriesDto,
  ): Promise<MemoryListPage> {
    return this.memoryListService.list({
      userId: request.authUser.id,
      visibility: "vault",
      query,
      limit: query.limit === undefined ? undefined : Number(query.limit),
    });
  }

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

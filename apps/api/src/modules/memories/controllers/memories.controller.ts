import type {
  MemoryDetail,
  MemoryEditorSnapshot,
  MemoryListPage,
  MemoryPlacementResult,
} from "@leonly/utils/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../../auth/guards/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../../common/http/docs/api-response.docs";
import { createUuidValidationPipe } from "../../../common/utils/validation-pipes";
import { MEMORY_DETAIL_EXAMPLE, MEMORY_DETAIL_SCHEMA } from "../docs/memory-detail.docs";
import {
  MEMORY_EDIT_SAVE_RESULT_EXAMPLE,
  MEMORY_EDITOR_SNAPSHOT_EXAMPLE,
  MEMORY_EDITOR_SNAPSHOT_SCHEMA,
} from "../docs/memory-editor.docs";
import { MEMORY_LIST_EXAMPLE, MEMORY_LIST_SCHEMA } from "../docs/memory-list.docs";
import { CreateMemoryDto } from "../dtos/create-memory.dto";
import { EditMemoryDto } from "../dtos/edit-memory.dto";
import { ListMemoriesDto } from "../dtos/list-memories.dto";
import { PlaceMemoryDto } from "../dtos/place-memory.dto";
import { type CreationResult, MemoriesService } from "../services/memories.service";
import { MemoryDetailService } from "../services/memory-detail.service";
import { MemoryEditService } from "../services/memory-edit.service";
import { MemoryListService } from "../services/memory-list.service";

const UUID_PARAM_VALIDATOR = createUuidValidationPipe("Memory id is not valid.");

@Controller("memories")
@ApiTags("Memories")
@ApiCookieAuth("session")
export class MemoriesController {
  constructor(
    private readonly memoriesService: MemoriesService,
    private readonly memoryListService: MemoryListService,
    private readonly memoryDetailService: MemoryDetailService,
    private readonly memoryEditService: MemoryEditService,
  ) {}

  @Get(":memoryId/edit")
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary: "Load the authorized editable snapshot of an active-space memory",
    description:
      "Returns editable metadata, the exact updatedAt token, all attached photo IDs in persisted position order, and nullable 300-second signed previews. Independent of current placement.",
  })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  @ApiSuccessResponse({
    description: "Editable memory snapshot",
    data: MEMORY_EDITOR_SNAPSHOT_SCHEMA,
    example: MEMORY_EDITOR_SNAPSHOT_EXAMPLE,
  })
  async getEditSnapshot(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", UUID_PARAM_VALIDATOR) memoryId: string,
  ): Promise<MemoryEditorSnapshot> {
    return this.memoryEditService.getEditableSnapshot({
      userId: request.authUser.id,
      memoryId,
    });
  }

  @Patch(":memoryId")
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary: "Commit an edit to an active-space memory",
    description:
      "Atomically commits metadata, placement, final ordered photo selection, cover, removals, and new-photo processing events. Success means persistence, not image readiness; new photos process after commit as in creation. No edit idempotency key or status resource exists.",
  })
  @ApiBody({ type: EditMemoryDto })
  @ApiErrorResponses(400, 401, 404, 409, 500)
  @ApiSuccessResponse({
    description: "Edit committed; new photo variants may still be processing",
    data: {
      type: "object",
      required: ["id", "visibility", "updatedAt"],
      properties: {
        id: { type: "string", format: "uuid" },
        visibility: { type: "string", enum: ["timeline", "vault"] },
        updatedAt: {
          type: "string",
          format: "date-time",
          description:
            "Persisted advanced token; reload the editor before any later deliberate save.",
        },
      },
    },
    example: MEMORY_EDIT_SAVE_RESULT_EXAMPLE,
  })
  async saveEdit(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", UUID_PARAM_VALIDATOR) memoryId: string,
    @Body() body: EditMemoryDto,
  ): Promise<MemoryPlacementResult> {
    return this.memoryEditService.save({ userId: request.authUser.id, memoryId, body });
  }

  @Patch(":memoryId/placement")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Move an active-space memory between Timeline and Vault" })
  @ApiBody({ type: PlaceMemoryDto })
  @ApiErrorResponses(400, 401, 404, 409, 500)
  @ApiSuccessResponse({
    description: "Memory placement updated",
    data: {
      type: "object",
      required: ["id", "visibility", "updatedAt"],
      properties: {
        id: { type: "string", format: "uuid" },
        visibility: { type: "string", enum: ["timeline", "vault"] },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    example: {
      id: "01900000-0000-7000-8000-000000000004",
      visibility: "vault",
      updatedAt: "2026-09-05T16:00:00.123Z",
    },
  })
  async updateVisibility(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", UUID_PARAM_VALIDATOR)
    memoryId: string,
    @Body() body: PlaceMemoryDto,
  ): Promise<MemoryPlacementResult> {
    return this.memoriesService.updateVisibility({
      userId: request.authUser.id,
      memoryId,
      ...body,
    });
  }

  @Delete(":memoryId")
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary: "Soft-delete an active-space memory with its comments, reactions, and attached files",
  })
  @ApiErrorResponses(400, 401, 404, 500)
  @ApiSuccessResponse({
    description: "Memory and its children soft-deleted",
    data: { type: "object", nullable: true, enum: [null] },
    example: null,
  })
  async delete(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", UUID_PARAM_VALIDATOR) memoryId: string,
  ): Promise<null> {
    await this.memoriesService.delete({ userId: request.authUser.id, memoryId });
    return null;
  }

  @Get("timeline")
  @ApiOperation({ summary: "List active-space Timeline memories" })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  @ApiSuccessResponse({
    description: "Memory page",
    data: MEMORY_LIST_SCHEMA,
    example: MEMORY_LIST_EXAMPLE,
  })
  async listTimeline(
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
    @Param("memoryId", UUID_PARAM_VALIDATOR)
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
    @Param("memoryId", UUID_PARAM_VALIDATOR)
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
  async listVault(
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

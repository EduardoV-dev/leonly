import type { MemoryReactionSummary } from "@leonly/utils/contracts";
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../../auth/guards/auth.guard";
import { ApiErrorResponses, ApiSuccessResponse } from "../../../common/http/docs/api-response.docs";
import { createUuidValidationPipe } from "../../../common/utils/validation-pipes";
import { MEMORY_REACTION_EXAMPLE, MEMORY_REACTION_SCHEMA } from "../docs/memory-reactions.docs";
import { ToggleMemoryReactionDto } from "../dtos/toggle-memory-reaction.dto";
import { MemoryReactionsService } from "../services/memory-reactions.service";

const memoryIdPipe = createUuidValidationPipe("Memory id is not valid.");

@Controller("memories/:memoryId/reactions")
@ApiTags("Memories")
@ApiCookieAuth("session")
export class MemoryReactionsController {
  constructor(private readonly memoryReactionsService: MemoryReactionsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Read memory reactions" })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  @ApiSuccessResponse({
    description: "Reaction summary",
    data: MEMORY_REACTION_SCHEMA,
    example: MEMORY_REACTION_EXAMPLE,
  })
  getReactions(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", memoryIdPipe) memoryId: string,
  ): Promise<MemoryReactionSummary> {
    return this.memoryReactionsService.read({ userId: request.authUser.id, memoryId });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Add, replace, or remove a reaction" })
  @ApiBody({ type: ToggleMemoryReactionDto })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  @ApiSuccessResponse({
    description: "Updated reaction summary",
    data: MEMORY_REACTION_SCHEMA,
    example: MEMORY_REACTION_EXAMPLE,
  })
  toggleReaction(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", memoryIdPipe) memoryId: string,
    @Body() body: ToggleMemoryReactionDto,
  ): Promise<MemoryReactionSummary> {
    return this.memoryReactionsService.toggle({
      userId: request.authUser.id,
      memoryId,
      reactionType: body.reactionType,
    });
  }
}

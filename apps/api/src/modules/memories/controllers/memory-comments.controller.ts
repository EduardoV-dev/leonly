import type { CommentPage, MemoryComment, RootComment } from "@leonly/utils/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../../../auth/guards/auth.guard";
import { OptimisticLockDto } from "../../../common/dtos/optimistic-lock.dto";
import { ApiErrorResponses, ApiSuccessResponse } from "../../../common/http/docs/api-response.docs";
import { createUuidValidationPipe } from "../../../common/utils/validation-pipes";
import { COMMENT_EXAMPLE, COMMENT_PAGE_SCHEMA, COMMENT_SCHEMA } from "../docs/memory-comments.docs";
import { CreateCommentDto } from "../dtos/create-comment.dto";
import { EditCommentDto } from "../dtos/edit-comment.dto";
import { ListCommentsDto } from "../dtos/list-comments.dto";
import { MemoryCommentsService } from "../services/memory-comments.service";

const memoryIdPipe = createUuidValidationPipe("Memory id is not valid.");
const commentIdPipe = createUuidValidationPipe("Comment id is not valid.");

@Controller("memories/:memoryId/comments")
@ApiTags("Memories")
@ApiCookieAuth("session")
export class MemoryCommentsController {
  constructor(private readonly memoryCommentsService: MemoryCommentsService) {}

  @Post()
  @ApiOperation({ summary: "Create a comment or reply" })
  @ApiSuccessResponse({
    status: 201,
    description: "Created comment",
    data: COMMENT_SCHEMA,
    example: COMMENT_EXAMPLE,
  })
  @ApiErrorResponses(400, 401, 404, 409, 429, 500, 503)
  create(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", memoryIdPipe) memoryId: string,
    @Body() body: CreateCommentDto,
  ): Promise<MemoryComment> {
    return this.memoryCommentsService.create({
      userId: request.authUser.id,
      memoryId,
      body: body.body,
      parentCommentId: body.parentCommentId ?? null,
    });
  }

  @Patch(":commentId")
  @ApiOperation({ summary: "Edit an authored comment" })
  @ApiSuccessResponse({
    description: "Updated comment",
    data: COMMENT_SCHEMA,
    example: COMMENT_EXAMPLE,
  })
  @ApiErrorResponses(400, 401, 404, 409, 429, 500, 503)
  edit(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", memoryIdPipe) memoryId: string,
    @Param("commentId", commentIdPipe) commentId: string,
    @Body() body: EditCommentDto,
  ): Promise<MemoryComment> {
    return this.memoryCommentsService.edit({
      userId: request.authUser.id,
      memoryId,
      commentId,
      body: body.body,
      lastKnownUpdatedAt: body.lastKnownUpdatedAt,
    });
  }

  @Delete(":commentId")
  @ApiOperation({ summary: "Delete an authored comment" })
  @ApiSuccessResponse({
    description: "Deleted comment",
    data: {
      type: "object",
      required: ["deletedCommentId"],
      properties: { deletedCommentId: { type: "string", format: "uuid" } },
    },
    example: { deletedCommentId: COMMENT_EXAMPLE.id },
  })
  @ApiErrorResponses(400, 401, 404, 409, 429, 500, 503)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", memoryIdPipe) memoryId: string,
    @Param("commentId", commentIdPipe) commentId: string,
    @Body() body: OptimisticLockDto,
  ): Promise<{ deletedCommentId: string }> {
    return this.memoryCommentsService.remove({
      userId: request.authUser.id,
      memoryId,
      commentId,
      lastKnownUpdatedAt: body.lastKnownUpdatedAt,
    });
  }

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "List memory comments" })
  @ApiSuccessResponse({
    description: "Comment page, including deleted-root placeholders",
    data: COMMENT_PAGE_SCHEMA,
    example: { data: [COMMENT_EXAMPLE], meta: { nextCursor: null, resetCursor: false } },
  })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  read(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", memoryIdPipe) memoryId: string,
    @Query() query: ListCommentsDto,
  ): Promise<CommentPage<RootComment>> {
    return this.memoryCommentsService.read({
      userId: request.authUser.id,
      memoryId,
      parentCommentId: null,
      cursor: query.cursor,
    });
  }

  @Get(":commentId/replies")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "List replies to a memory comment" })
  @ApiSuccessResponse({
    description: "Reply page, oldest first",
    data: COMMENT_PAGE_SCHEMA,
    example: { data: [COMMENT_EXAMPLE], meta: { nextCursor: null, resetCursor: false } },
  })
  @ApiErrorResponses(400, 401, 404, 429, 500, 503)
  readReplies(
    @Req() request: AuthenticatedRequest,
    @Param("memoryId", memoryIdPipe) memoryId: string,
    @Param("commentId", commentIdPipe) parentCommentId: string,
    @Query() query: ListCommentsDto,
  ): Promise<CommentPage<RootComment>> {
    return this.memoryCommentsService.read({
      userId: request.authUser.id,
      memoryId,
      parentCommentId,
      cursor: query.cursor,
    });
  }
}

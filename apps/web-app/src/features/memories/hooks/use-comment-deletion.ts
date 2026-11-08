import type { ApiResponse, CommentPage, RootComment } from "@leonly/utils/contracts";
import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/axios/api";
import { memoryQueryKeys } from "../constants/query-keys";
import type { MemoryComment } from "../types/comment";
import {
  flattenCommentPages,
  type MemoryCommentsData,
  removeCommentFromData,
} from "./use-memory-comments";

type CommentDeletionErrorCode = "conflict" | "failed" | "indeterminate" | "unavailable";
export type CommentDeletionOutcome = "conflict" | "failed" | "success" | "unavailable";

class CommentDeletionError extends Error {
  constructor(readonly code: CommentDeletionErrorCode) {
    super(code);
  }
}

type DeleteCommentPayload = Pick<MemoryComment, "id" | "memoryId" | "updatedAt">;

async function deleteComment(payload: DeleteCommentPayload): Promise<void> {
  let response: AxiosResponse<ApiResponse<{ deletedCommentId: string }>>;
  try {
    response = await api.delete<ApiResponse<{ deletedCommentId: string }>>(
      `/memories/${payload.memoryId}/comments/${payload.id}`,
      {
        data: { lastKnownUpdatedAt: payload.updatedAt },
        validateStatus: () => true,
      },
    );
  } catch {
    throw new CommentDeletionError("indeterminate");
  }

  if (!response.data || typeof response.data.ok !== "boolean") {
    throw new CommentDeletionError("indeterminate");
  }
  if (!response.data.ok) {
    if (response.status === 404) throw new CommentDeletionError("unavailable");
    if (response.status === 409) throw new CommentDeletionError("conflict");
    throw new CommentDeletionError("failed");
  }
  if (response.data.data.deletedCommentId !== payload.id) {
    throw new CommentDeletionError("indeterminate");
  }
}

type UseCommentDeletionOptions = {
  comment: MemoryComment;
  onOutcome?: (outcome: CommentDeletionOutcome) => void;
  onUnavailable?: () => void;
};

export function useCommentDeletion({
  comment,
  onOutcome,
  onUnavailable,
}: UseCommentDeletionOptions) {
  const { t } = useTranslation("memories");
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<CommentDeletionOutcome | null>(null);
  const queryKey = memoryQueryKeys.comments(comment.memoryId);
  const mutation = useMutation<void, CommentDeletionError, DeleteCommentPayload>({
    mutationFn: deleteComment,
    onError: async (error) => {
      if (error.code === "unavailable") {
        queryClient.removeQueries({ queryKey });
        onUnavailable?.();
        setOutcome("unavailable");
        onOutcome?.("unavailable");
        return;
      }

      if (error.code === "conflict") {
        await queryClient.refetchQueries({ queryKey });
        setOutcome("conflict");
        onOutcome?.("conflict");
        return;
      }

      if (error.code === "indeterminate") {
        const targetKey = comment.parentCommentId
          ? [...queryKey, "replies", comment.parentCommentId]
          : queryKey;
        if (queryClient.getQueryState(targetKey)) {
          try {
            await queryClient.refetchQueries(
              { queryKey: targetKey, exact: true, type: "all" },
              { throwOnError: true },
            );
            const replyPages =
              queryClient.getQueryData<InfiniteData<CommentPage<RootComment>>>(targetKey);
            const rootPages = queryClient.getQueryData<MemoryCommentsData>(targetKey);
            const comments = comment.parentCommentId
              ? replyPages?.pages.flatMap((page) => page.data)
              : rootPages && flattenCommentPages(rootPages);
            const hasPlaceholder = comments?.some(
              (entry) => entry.id === comment.id && entry.deletedAt !== null,
            );
            const hasComment = comments?.some(
              (entry) => entry.id === comment.id && entry.deletedAt === null,
            );
            const reachedEnd = comment.parentCommentId
              ? replyPages?.pages.at(-1)?.meta.nextCursor === null
              : rootPages?.pages.at(-1)?.nextCursor === null;
            if (hasPlaceholder || (comments && !hasComment && reachedEnd)) {
              setOutcome("success");
              onOutcome?.("success");
              return;
            }
          } catch {
            // A failed refresh cannot establish whether deletion committed.
          }
        }
      }

      setOutcome("failed");
      onOutcome?.("failed");
    },
    onSuccess: async () => {
      queryClient.setQueryData<MemoryCommentsData>(queryKey, (data) =>
        removeCommentFromData(data, comment.id),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all }),
      ]);
      setOutcome("success");
      onOutcome?.("success");
    },
  });

  const remove = async () => {
    if (mutation.isPending) return;
    setOutcome(null);
    try {
      await mutation.mutateAsync({
        id: comment.id,
        memoryId: comment.memoryId,
        updatedAt: comment.updatedAt,
      });
    } catch {
      // Mutation callbacks reconcile and expose recoverable outcomes.
    }
  };

  let errorMessage: string | null = null;
  if (outcome === "conflict") errorMessage = t("detail.comments.delete.conflict");
  if (outcome === "failed") errorMessage = t("detail.comments.delete.failed");

  return {
    errorMessage,
    isDeleting: mutation.isPending,
    outcome,
    remove,
  };
}

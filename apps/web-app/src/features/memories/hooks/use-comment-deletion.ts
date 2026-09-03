import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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

type DeleteCommentPayload = Pick<MemoryComment, "id" | "memoryId" | "version">;

async function deleteComment(payload: DeleteCommentPayload): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/memories/${payload.memoryId}/comments/${payload.id}`, {
      body: JSON.stringify({ expectedVersion: payload.version }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
  } catch {
    throw new CommentDeletionError("indeterminate");
  }

  const responsePayload = (await response.json().catch(() => null)) as {
    code?: CommentDeletionErrorCode;
    deletedCommentId?: string;
  } | null;
  if (!response.ok) {
    throw new CommentDeletionError(
      responsePayload?.code ?? (response.status === 404 ? "unavailable" : "failed"),
    );
  }
  if (responsePayload?.deletedCommentId !== payload.id) {
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
        await queryClient.refetchQueries({ queryKey });
        const comments = flattenCommentPages(
          queryClient.getQueryData<MemoryCommentsData>(queryKey),
        );
        if (!comments.some((entry) => entry.id === comment.id)) {
          setOutcome("success");
          onOutcome?.("success");
          return;
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
        version: comment.version,
      });
    } catch {
      // Mutation callbacks reconcile and expose recoverable outcomes.
    }
  };

  return {
    errorMessage:
      outcome === "conflict"
        ? t("detail.comments.delete.conflict")
        : outcome === "failed"
          ? t("detail.comments.delete.failed")
          : null,
    isDeleting: mutation.isPending,
    outcome,
    remove,
  };
}

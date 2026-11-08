import type { ApiResponse } from "@leonly/utils/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/axios/api";
import { memoryQueryKeys } from "../constants/query-keys";
import type { MemoryComment } from "../types/comment";
import { cropCommentDraft, getCommentDraftState } from "./use-comment-composer";
import { type MemoryCommentsData, replaceCommentInData } from "./use-memory-comments";

type CommentEditErrorCode = "conflict" | "failed" | "unavailable";

class CommentEditError extends Error {
  constructor(
    readonly code: CommentEditErrorCode,
    message: string,
  ) {
    super(message);
  }
}

type UpdateCommentPayload = {
  body: string;
  commentId: string;
  lastKnownUpdatedAt: string;
  memoryId: string;
};

async function submitCommentEdit(payload: UpdateCommentPayload): Promise<MemoryComment> {
  const response = await api.patch<ApiResponse<MemoryComment>>(
    `/memories/${payload.memoryId}/comments/${payload.commentId}`,
    { body: payload.body, lastKnownUpdatedAt: payload.lastKnownUpdatedAt },
    { validateStatus: () => true },
  );
  if (!response.data.ok) {
    let code: CommentEditErrorCode = "failed";
    if (response.status === 404) code = "unavailable";
    if (response.status === 409) code = "conflict";
    throw new CommentEditError(code, code);
  }

  return response.data.data;
}

type UseCommentEditorOptions = {
  comment: MemoryComment;
  onUnavailable?: () => void;
};

export function useCommentEditor({ comment, onUnavailable }: UseCommentEditorOptions) {
  const { t } = useTranslation("memories");
  const queryClient = useQueryClient();
  const expectedVersionRef = useRef<string | null>(null);
  const [draft, setDraft] = useState("");
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConflict, setIsConflict] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<"success" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const draftState = getCommentDraftState(draft);
  const mutation = useMutation<MemoryComment, CommentEditError, UpdateCommentPayload>({
    mutationFn: submitCommentEdit,
    onError: (error) => {
      if (error.code === "unavailable") {
        queryClient.removeQueries({ queryKey: memoryQueryKeys.comments(comment.memoryId) });
        onUnavailable?.();
        return;
      }

      if (error.code === "conflict") {
        expectedVersionRef.current = null;
        setIsConflict(true);
        return;
      }

      setSubmitError(t("detail.comments.edit.submitError"));
    },
    onSuccess: async (updatedComment) => {
      queryClient.setQueryData<MemoryCommentsData>(
        memoryQueryKeys.comments(comment.memoryId),
        (data) => replaceCommentInData(data, updatedComment),
      );
      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.comments(comment.memoryId) });
      expectedVersionRef.current = null;
      setDraft("");
      setHasAttemptedSave(false);
      setIsConflict(false);
      setIsEditing(false);
      setLastOutcome("success");
      setSubmitError(null);
    },
  });

  const startEditing = () => {
    expectedVersionRef.current = comment.updatedAt;
    setDraft(comment.body);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setLastOutcome(null);
    setSubmitError(null);
    setIsEditing(true);
  };

  const updateDraft = (value: string) => {
    if (mutation.isPending) return;
    setDraft(cropCommentDraft(value));
    setLastOutcome(null);
    setSubmitError(null);
  };

  const cancel = () => {
    expectedVersionRef.current = null;
    setDraft("");
    setHasAttemptedSave(false);
    setIsConflict(false);
    setLastOutcome(null);
    setSubmitError(null);
    setIsEditing(false);
  };

  const refresh = async () => {
    const rootKey = memoryQueryKeys.comments(comment.memoryId);
    const queryKey = comment.parentCommentId
      ? [...rootKey, "replies", comment.parentCommentId]
      : rootKey;
    try {
      await queryClient.refetchQueries({ queryKey, exact: true }, { throwOnError: true });
    } catch {
      setSubmitError(t("detail.comments.edit.submitError"));
      return;
    }
    expectedVersionRef.current = null;
    setIsConflict(false);
    setIsEditing(false);
    setSubmitError(null);
  };

  const save = async () => {
    if (mutation.isPending || isConflict) return;
    if (!draftState.isValid) {
      setHasAttemptedSave(true);
      return;
    }

    setIsConflict(false);
    setLastOutcome(null);
    setSubmitError(null);
    try {
      await mutation.mutateAsync({
        body: draft,
        commentId: comment.id,
        lastKnownUpdatedAt: expectedVersionRef.current ?? comment.updatedAt,
        memoryId: comment.memoryId,
      });
    } catch {
      // Mutation callbacks expose recoverable failures in the inline editor.
    }
  };

  return {
    cancel,
    draft,
    draftState,
    hasAttemptedSave,
    isConflict,
    isEditing,
    isSaving: mutation.isPending,
    lastOutcome,
    refresh,
    save,
    startEditing,
    submitError,
    updateDraft,
  };
}

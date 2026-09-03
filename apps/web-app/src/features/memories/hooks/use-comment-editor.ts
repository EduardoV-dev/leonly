import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { memoryQueryKeys } from "../constants/query-keys";
import type { MemoryComment } from "../types/comment";
import { getCommentDraftState } from "./use-comment-composer";
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
  expectedVersion: number;
  memoryId: string;
};

async function submitCommentEdit(payload: UpdateCommentPayload): Promise<MemoryComment> {
  const response = await fetch(`/api/memories/${payload.memoryId}/comments/${payload.commentId}`, {
    body: JSON.stringify({ body: payload.body, expectedVersion: payload.expectedVersion }),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
  const responsePayload = (await response.json().catch(() => null)) as {
    code?: CommentEditErrorCode;
    comment?: MemoryComment;
  } | null;

  if (!response.ok || !responsePayload?.comment) {
    const code = responsePayload?.code ?? (response.status === 404 ? "unavailable" : "failed");
    throw new CommentEditError(code, code);
  }

  return responsePayload.comment;
}

type UseCommentEditorOptions = {
  comment: MemoryComment;
  onUnavailable?: () => void;
};

export function useCommentEditor({ comment, onUnavailable }: UseCommentEditorOptions) {
  const { t } = useTranslation("memories");
  const queryClient = useQueryClient();
  const expectedVersionRef = useRef<number | null>(null);
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
    expectedVersionRef.current = comment.version;
    setDraft(comment.body);
    setHasAttemptedSave(false);
    setIsConflict(false);
    setLastOutcome(null);
    setSubmitError(null);
    setIsEditing(true);
  };

  const updateDraft = (value: string) => {
    if (mutation.isPending) return;
    setDraft(value);
    setIsConflict(false);
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
    expectedVersionRef.current = null;
    setIsConflict(false);
    await queryClient.refetchQueries({ queryKey: memoryQueryKeys.comments(comment.memoryId) });
  };

  const save = async () => {
    if (mutation.isPending) return;
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
        expectedVersion: expectedVersionRef.current ?? comment.version,
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

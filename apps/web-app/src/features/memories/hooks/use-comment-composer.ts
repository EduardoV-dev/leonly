import type { ApiResponse } from "@leonly/utils/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/axios/api";
import { MAX_COMMENT_LENGTH } from "../constants/comments";
import { memoryQueryKeys } from "../constants/query-keys";
import type { MemoryComment } from "../types/comment";
import { type MemoryCommentsData, prependCommentToData } from "./use-memory-comments";

type CommentMutationErrorCode = "failed" | "unavailable";

class CommentMutationError extends Error {
  constructor(
    readonly code: CommentMutationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type CommentDraftState = {
  count: number;
  error: "overLimit" | "required" | null;
  isValid: boolean;
  normalizedCount: number;
  remaining: number;
};

export type CommentComposerState = ReturnType<typeof useCommentComposer>;

export function cropCommentDraft(draft: string): string {
  return Array.from(draft).slice(0, MAX_COMMENT_LENGTH).join("");
}

export function getCommentDraftState(draft: string): CommentDraftState {
  const count = Array.from(draft).length;
  const trimmedCount = Array.from(draft.trim()).length;
  let error: CommentDraftState["error"] = null;
  if (trimmedCount > MAX_COMMENT_LENGTH) error = "overLimit";
  if (trimmedCount === 0) error = "required";

  return {
    count,
    error,
    isValid: error === null,
    normalizedCount: trimmedCount,
    remaining: MAX_COMMENT_LENGTH - trimmedCount,
  };
}

type CreateCommentPayload = {
  body: string;
  memoryId: string;
  parentCommentId?: string;
};

async function submitComment(payload: CreateCommentPayload): Promise<MemoryComment> {
  const response = await api.post<ApiResponse<MemoryComment>>(
    `/memories/${payload.memoryId}/comments`,
    {
      body: payload.body,
      parentCommentId: payload.parentCommentId,
    },
    { validateStatus: () => true },
  );
  if (!response.data.ok) {
    const code = response.status === 404 ? "unavailable" : "failed";
    throw new CommentMutationError(code, code);
  }

  return response.data.data;
}

type UseCommentComposerParams = {
  memoryId: string;
  onUnavailable?: () => void;
  parentCommentId?: string;
};

export function useCommentComposer({
  memoryId,
  onUnavailable,
  parentCommentId,
}: UseCommentComposerParams) {
  const { t } = useTranslation("memories");
  const queryClient = useQueryClient();
  const submittingRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<"success" | null>(null);
  const draftState = getCommentDraftState(draft);
  const mutation = useMutation<MemoryComment, CommentMutationError, CreateCommentPayload>({
    mutationFn: submitComment,
    onError: (error) => {
      if (error.code === "unavailable") {
        queryClient.removeQueries({ queryKey: memoryQueryKeys.comments(memoryId) });
        onUnavailable?.();
        return;
      }

      setSubmitError(t("detail.comments.submitError"));
    },
    onSuccess: async (comment) => {
      if (!parentCommentId) {
        queryClient.setQueryData<MemoryCommentsData>(memoryQueryKeys.comments(memoryId), (data) =>
          prependCommentToData(data, comment),
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: memoryQueryKeys.comments(memoryId) }),
        queryClient.invalidateQueries({ queryKey: memoryQueryKeys.timeline("full") }),
        queryClient.invalidateQueries({ queryKey: memoryQueryKeys.timeline("recent") }),
        queryClient.invalidateQueries({ queryKey: memoryQueryKeys.vault() }),
      ]);
      setDraft("");
      setHasInteracted(false);
      setHasBlurred(false);
      setHasAttemptedSubmit(false);
      setSubmitError(null);
      setLastOutcome("success");
    },
  });

  const updateDraft = useCallback(
    (value: string) => {
      if (mutation.isPending) return;
      setHasInteracted(true);
      setDraft(cropCommentDraft(value));
      setSubmitError(null);
      setLastOutcome(null);
    },
    [mutation.isPending],
  );

  const markBlurred = useCallback(() => {
    if (hasInteracted) setHasBlurred(true);
  }, [hasInteracted]);

  const submit = useCallback(async () => {
    if (mutation.isPending || submittingRef.current) return "ignored" as const;

    const nextState = getCommentDraftState(draft);
    if (!nextState.isValid) {
      setHasAttemptedSubmit(true);
      return "invalid" as const;
    }

    setSubmitError(null);
    setLastOutcome(null);
    submittingRef.current = true;

    try {
      await mutation.mutateAsync({
        body: draft,
        memoryId,
        parentCommentId,
      });
      return "submitted" as const;
    } catch {
      return "submitted" as const;
    } finally {
      submittingRef.current = false;
    }
  }, [draft, memoryId, mutation, parentCommentId]);

  return {
    draft,
    draftState,
    hasAttemptedSubmit: hasAttemptedSubmit || hasBlurred,
    isSubmitting: mutation.isPending,
    lastOutcome,
    submit,
    submitError,
    markBlurred,
    updateDraft,
  };
}

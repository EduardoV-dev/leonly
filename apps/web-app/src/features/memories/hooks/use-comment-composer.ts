import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAX_COMMENT_LENGTH } from "../constants/comments";
import { memoryQueryKeys } from "../constants/query-keys";
import type { MemoryComment } from "../types/comment";
import { type MemoryCommentsData, prependCommentToData } from "./use-memory-comments";

type CommentMutationErrorCode = "failed" | "mismatch" | "unavailable";

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

export function getCommentDraftState(draft: string): CommentDraftState {
  const count = Array.from(draft).length;
  const trimmedCount = Array.from(draft.trim()).length;
  const error =
    trimmedCount === 0 ? "required" : trimmedCount > MAX_COMMENT_LENGTH ? "overLimit" : null;

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
  idempotencyKey: string;
  memoryId: string;
};

async function submitComment(payload: CreateCommentPayload): Promise<MemoryComment> {
  const response = await fetch(`/api/memories/${payload.memoryId}/comments`, {
    body: JSON.stringify({ body: payload.body }),
    headers: {
      "content-type": "application/json",
      "Idempotency-Key": payload.idempotencyKey,
    },
    method: "POST",
  });
  const responsePayload = (await response.json().catch(() => null)) as {
    code?: CommentMutationErrorCode;
    comment?: MemoryComment;
  } | null;

  if (!response.ok || !responsePayload?.comment) {
    const code = responsePayload?.code ?? (response.status === 404 ? "unavailable" : "failed");
    throw new CommentMutationError(code, code);
  }

  return responsePayload.comment;
}

export function useCommentComposer(memoryId: string, onUnavailable?: () => void) {
  const { t } = useTranslation("memories");
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string | null>(null);
  const submittedBodyRef = useRef<string | null>(null);
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
      queryClient.setQueryData<MemoryCommentsData>(memoryQueryKeys.comments(memoryId), (data) =>
        prependCommentToData(data, comment),
      );
      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.comments(memoryId) });
      setDraft("");
      setHasInteracted(false);
      setHasBlurred(false);
      setHasAttemptedSubmit(false);
      setSubmitError(null);
      idempotencyKeyRef.current = null;
      submittedBodyRef.current = null;
      setLastOutcome("success");
    },
  });

  const updateDraft = useCallback(
    (value: string) => {
      if (mutation.isPending) return;
      idempotencyKeyRef.current = null;
      submittedBodyRef.current = null;
      setHasInteracted(true);
      setDraft(value);
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

    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    submittedBodyRef.current ??= draft;
    setSubmitError(null);
    setLastOutcome(null);
    submittingRef.current = true;

    try {
      await mutation.mutateAsync({ body: submittedBodyRef.current, idempotencyKey, memoryId });
      return "submitted" as const;
    } catch {
      return "submitted" as const;
    } finally {
      submittingRef.current = false;
    }
  }, [draft, memoryId, mutation]);

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

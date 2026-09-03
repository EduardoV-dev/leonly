import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { memoryQueryKeys } from "../constants/query-keys";
import type { MemoryReactionSummary, MemoryReactionType } from "../types/memory-reaction";

type MemoryReactionErrorCode = "failed" | "unavailable";

export class MemoryReactionMutationError extends Error {
  constructor(readonly code: MemoryReactionErrorCode) {
    super(code);
  }
}

async function submitMemoryReaction(
  memoryId: string,
  reactionType: MemoryReactionType,
): Promise<MemoryReactionSummary> {
  let response: Response;
  try {
    response = await fetch(`/api/memories/${memoryId}/reactions`, {
      body: JSON.stringify({ reactionType }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  } catch {
    throw new MemoryReactionMutationError("failed");
  }
  const payload = (await response.json().catch(() => null)) as {
    code?: MemoryReactionErrorCode;
    reaction?: MemoryReactionSummary;
  } | null;

  if (!response.ok || !payload?.reaction) {
    throw new MemoryReactionMutationError(
      payload?.code ?? (response.status === 404 ? "unavailable" : "failed"),
    );
  }

  return payload.reaction;
}

export function useMemoryReaction(memoryId: string, onUnavailable: () => void) {
  const queryClient = useQueryClient();
  const [errorCode, setErrorCode] = useState<MemoryReactionErrorCode | null>(null);
  const [lastOutcome, setLastOutcome] = useState<"success" | null>(null);
  const mutation = useMutation<
    MemoryReactionSummary,
    MemoryReactionMutationError,
    MemoryReactionType
  >({
    mutationKey: memoryQueryKeys.reactions(memoryId),
    mutationFn: (reactionType) => submitMemoryReaction(memoryId, reactionType),
    onError: (error) => {
      setLastOutcome(null);
      setErrorCode(error.code);
      if (error.code === "unavailable") onUnavailable();
    },
    onSettled: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: memoryQueryKeys.timeline("full") }),
        queryClient.invalidateQueries({ queryKey: memoryQueryKeys.timeline("recent") }),
        queryClient.invalidateQueries({ queryKey: memoryQueryKeys.vault() }),
      ]);
    },
    onSuccess: () => {
      setErrorCode(null);
      setLastOutcome("success");
    },
    scope: { id: `memory-reaction:${memoryId}` },
  });

  const react = async (reactionType: MemoryReactionType) => {
    if (mutation.isPending) return null;

    setErrorCode(null);
    setLastOutcome(null);
    try {
      return await mutation.mutateAsync(reactionType);
    } catch {
      return null;
    }
  };

  return { errorCode, isPending: mutation.isPending, lastOutcome, react };
}

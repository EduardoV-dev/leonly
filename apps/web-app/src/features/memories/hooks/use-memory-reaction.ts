import type {
  ApiResponse,
  MemoryReactionSummary,
  MemoryReactionType,
} from "@leonly/utils/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APP_ROUTES } from "@/constants/routes";
import { api, isAxiosError } from "@/lib/axios/api";
import { memoryQueryKeys } from "../constants/query-keys";

export function useMemoryReaction(memoryId: string, initial: MemoryReactionSummary) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = memoryQueryKeys.reactions(memoryId);
  const [failed, setFailed] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const pending = useRef(false);
  const previousInitial = useRef(initial);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get<ApiResponse<MemoryReactionSummary>>(
        `/memories/${memoryId}/reactions`,
      );
      if (!response.data.ok) throw new Error("Reaction summary unavailable");
      return response.data.data;
    },
    initialData: initial,
    enabled: false,
  });

  useEffect(() => {
    if (previousInitial.current === initial) return;
    previousInitial.current = initial;
    queryClient.setQueryData(memoryQueryKeys.reactions(memoryId), initial);
  }, [queryClient, memoryId, initial]);

  const handleError = (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) router.push(APP_ROUTES.AUTH);
    if (isAxiosError(error) && error.response?.status === 404) {
      setUnavailable(true);
      router.refresh();
    }
    setFailed(true);
  };

  const mutation = useMutation({
    mutationKey: queryKey,
    retry: false,
    mutationFn: async (reactionType: MemoryReactionType) => {
      const response = await api.post<ApiResponse<MemoryReactionSummary>>(
        `/memories/${memoryId}/reactions`,
        { reactionType },
      );
      if (!response.data.ok) throw new Error("Reaction update failed");
      return response.data.data;
    },
    scope: { id: `memory-reaction:${memoryId}` },
  });

  const react = async (reactionType: MemoryReactionType) => {
    if (pending.current) return null;
    pending.current = true;
    setIsReconciling(true);
    setFailed(false);
    setSucceeded(false);
    let result: MemoryReactionSummary | null = null;
    try {
      result = await mutation.mutateAsync(reactionType);
      queryClient.setQueryData(queryKey, result);
      setSucceeded(true);
    } catch (error) {
      handleError(error);
    }
    try {
      const refreshed = await query.refetch();
      if (refreshed.isError) handleError(refreshed.error);
      return result;
    } finally {
      pending.current = false;
      setIsReconciling(false);
    }
  };

  return { summary: query.data, failed, succeeded, unavailable, isPending: isReconciling, react };
}

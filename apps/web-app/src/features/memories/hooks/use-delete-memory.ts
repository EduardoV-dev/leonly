import type { ApiResponse } from "@leonly/utils/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { APP_ROUTES } from "@/constants/routes";
import { api } from "@/lib/axios/api";
import { memoryQueryKeys } from "../constants/query-keys";

export type MemoryDeletionStatus = "idle" | "pending" | "unavailable" | "failed";

type DeleteMemoryInput = {
  memoryId: string;
  visibility: "timeline" | "vault";
};

type DeleteOutcome = "completed" | "unauthorized" | "unavailable" | "failed";

async function isMemoryReadable(
  memoryId: string,
  visibility: "timeline" | "vault",
): Promise<boolean | null> {
  try {
    const response = await api.get<ApiResponse<unknown>>(`/memories/${visibility}/${memoryId}`, {
      validateStatus: () => true,
    });
    return response.status === 200 && response.data?.ok === true;
  } catch {
    return null;
  }
}

async function reconcileUncertainDeletion(memoryId: string): Promise<DeleteOutcome> {
  // Reconciliation goes through both detail routes: either readable means retryable
  // failure, neither readable means the memory is gone. Neither outcome claims this
  // request succeeded, so deletion-success feedback stays reserved for 200 responses.
  const [timeline, vault] = await Promise.all([
    isMemoryReadable(memoryId, "timeline"),
    isMemoryReadable(memoryId, "vault"),
  ]);
  if (timeline === null || vault === null) return "failed";
  return timeline || vault ? "failed" : "unavailable";
}

async function requestMemoryDeletion(memoryId: string): Promise<DeleteOutcome> {
  let response: AxiosResponse<ApiResponse<null>>;
  try {
    response = await api.delete<ApiResponse<null>>(`/memories/${memoryId}`, {
      validateStatus: () => true,
    });
  } catch {
    return reconcileUncertainDeletion(memoryId);
  }

  if (!response.data || typeof response.data.ok !== "boolean") {
    return reconcileUncertainDeletion(memoryId);
  }
  if (response.status === 401) return "unauthorized";
  if (response.data.ok) return "completed";
  if (response.status === 404) return "unavailable";
  return "failed";
}

export function useDeleteMemory({ memoryId, visibility }: Readonly<DeleteMemoryInput>) {
  const { t } = useTranslation("memories");
  const queryClient = useQueryClient();
  const router = useRouter();
  const inFlight = useRef(false);
  const [status, setStatus] = useState<MemoryDeletionStatus>("idle");
  const destination = visibility === "vault" ? APP_ROUTES.VAULT : APP_ROUTES.TIMELINE;

  const mutation = useMutation({
    mutationFn: () => requestMemoryDeletion(memoryId),
    mutationKey: [...memoryQueryKeys.all, "delete", memoryId],
    onSettled: () => {
      inFlight.current = false;
    },
    onSuccess: async (outcome) => {
      if (outcome === "unauthorized") {
        setStatus("failed");
        router.push(APP_ROUTES.AUTH);
        return;
      }
      if (outcome === "unavailable") {
        await queryClient.cancelQueries({ queryKey: memoryQueryKeys.all });
        queryClient.removeQueries({ queryKey: memoryQueryKeys.comments(memoryId) });
        queryClient.removeQueries({ queryKey: memoryQueryKeys.reactions(memoryId) });
        setStatus("unavailable");
        router.refresh();
        return;
      }
      if (outcome === "failed") {
        setStatus("failed");
        return;
      }

      await queryClient.cancelQueries({ queryKey: memoryQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all, refetchType: "none" });
      queryClient.removeQueries({ queryKey: memoryQueryKeys.all });
      toast.success(t("detail.delete.success"));
      router.refresh();
      router.push(destination);
    },
    scope: { id: `memory-delete:${memoryId}` },
  });

  const remove = () => {
    if (inFlight.current || mutation.isPending) return;
    inFlight.current = true;
    setStatus("pending");
    mutation.mutate();
  };

  const reset = () => {
    if (!inFlight.current && !mutation.isPending) setStatus("idle");
  };

  return { isPending: mutation.isPending || status === "pending", remove, reset, status };
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { APP_ROUTES } from "@/constants/routes";
import { memoryQueryKeys } from "../constants/query-keys";

export type MemoryDeletionStatus = "idle" | "pending" | "conflict" | "unavailable" | "failed";

type DeleteMemoryInput = {
  memoryId: string;
  version: string;
  visibility: "timeline" | "vault";
};

type DeleteOutcome = "completed" | "conflict" | "unavailable" | "failed";

async function reconcileUncertainDeletion(memoryId: string): Promise<DeleteOutcome> {
  try {
    const response = await fetch(`/api/memories/${memoryId}`, {
      cache: "no-store",
      method: "GET",
    });
    if (response.status === 404) return "completed";
    return "failed";
  } catch {
    return "failed";
  }
}

async function requestMemoryDeletion(memoryId: string, version: string): Promise<DeleteOutcome> {
  let response: Response;
  try {
    response = await fetch(`/api/memories/${memoryId}`, {
      body: JSON.stringify({ expectedVersion: version }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
  } catch {
    return reconcileUncertainDeletion(memoryId);
  }

  if (response.status === 204) return "completed";
  const payload = (await response.json().catch(() => null)) as {
    code?: "conflict" | "unavailable";
  } | null;
  if (response.status === 409 && payload?.code === "conflict") return "conflict";
  if (response.status === 404 && payload?.code === "unavailable") return "unavailable";
  return reconcileUncertainDeletion(memoryId);
}

export function useDeleteMemory({ memoryId, version, visibility }: Readonly<DeleteMemoryInput>) {
  const { t } = useTranslation("memories");
  const queryClient = useQueryClient();
  const router = useRouter();
  const inFlight = useRef(false);
  const [status, setStatus] = useState<MemoryDeletionStatus>("idle");
  const destination = visibility === "vault" ? APP_ROUTES.VAULT : APP_ROUTES.TIMELINE;

  const mutation = useMutation({
    mutationFn: () => requestMemoryDeletion(memoryId, version),
    mutationKey: [...memoryQueryKeys.all, "delete", memoryId],
    onSettled: () => {
      inFlight.current = false;
    },
    onSuccess: async (outcome) => {
      if (outcome === "conflict") {
        setStatus("conflict");
        router.refresh();
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

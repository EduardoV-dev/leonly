import type { ApiResponse, MemoryDetail, MemoryPlacementResult } from "@leonly/utils/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { APP_ROUTES } from "@/constants/routes";
import { api } from "@/lib/axios/api";
import { memoryQueryKeys } from "../../constants/query-keys";
import { revalidatePlacementViews } from "../../server/revalidate-placement-views";

type UseMemoryPlacementParams = {
  memoryId: string;
  version: string;
  visibility: "timeline" | "vault";
};

export function useMemoryPlacement({ memoryId, version, visibility }: UseMemoryPlacementParams) {
  const { t } = useTranslation("memories");
  const router = useRouter();
  const queryClient = useQueryClient();
  const pending = useRef(false);
  const currentVersion = useRef(version);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const target = visibility === "timeline" ? "vault" : "timeline";

  useEffect(() => {
    currentVersion.current = version;
  }, [version]);

  async function reconcile(): Promise<void> {
    const response = await api.get<ApiResponse<MemoryDetail>>(
      `/memories/${visibility}/${memoryId}`,
      {
        validateStatus: () => true,
      },
    );
    if (response.status === 401) {
      setNeedsRefresh(true);
      router.replace(APP_ROUTES.AUTH);
      return;
    }
    if (response.status === 404) {
      setNeedsRefresh(true);
      router.refresh();
      return;
    }
    if (!response.data.ok) throw new Error("Memory refresh failed.");
    currentVersion.current = response.data.data.updatedAt;
    setNeedsRefresh(false);
    router.refresh();
  }

  async function refresh(): Promise<void> {
    if (pending.current) return;
    pending.current = true;
    setIsSubmitting(true);
    try {
      await reconcile();
      setError(null);
    } catch {
      setError(t("detail.placement.failed"));
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  }

  async function place(): Promise<void> {
    if (pending.current || needsRefresh) return;
    pending.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await api.patch<ApiResponse<MemoryPlacementResult>>(
        `/memories/${memoryId}/placement`,
        { visibility: target, lastKnownUpdatedAt: currentVersion.current },
        { validateStatus: () => true },
      );
      if (response.status === 401) {
        router.replace(APP_ROUTES.AUTH);
        return;
      }
      if (!response.data.ok) {
        if (response.status === 409) {
          toast.error(t("detail.placement.conflict"));
        } else {
          setError(t("detail.placement.failed"));
        }
        await reconcile();
        return;
      }
      await queryClient.invalidateQueries({ queryKey: memoryQueryKeys.all });
      try {
        await revalidatePlacementViews({ memoryId, visibility: target });
      } catch {
        toast.error(t("detail.placement.refreshFailed"));
      }
      toast.success(
        t(
          target === "vault" ? "detail.placement.successVault" : "detail.placement.successTimeline",
        ),
      );
      router.replace(
        target === "vault"
          ? APP_ROUTES.VAULT_MEMORY_DETAIL(memoryId)
          : APP_ROUTES.MEMORY_DETAIL(memoryId),
      );
      router.refresh();
    } catch {
      setError(t("detail.placement.failed"));
      try {
        await reconcile();
      } catch {
        setNeedsRefresh(true);
        return;
      }
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  }

  return { error, isSubmitting, needsRefresh, place, refresh, target };
}

import "server-only";

import type { ApiResponse, MemoryDetail } from "@leonly/utils/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { APP_ROUTES } from "@/constants/routes";
import { isAxiosError, serverApi } from "@/lib/axios/server-api";

type GetCurrentMemoryDetailParams = {
  memoryId: string;
  visibility: "timeline" | "vault";
};

const getCachedMemoryDetail = cache(
  async (memoryId: string, visibility: "timeline" | "vault"): Promise<MemoryDetail | null> => {
    const requestHeaders = await headers();
    try {
      const { data } = await serverApi.get<ApiResponse<MemoryDetail>>(
        `/memories/${visibility}/${encodeURIComponent(memoryId)}`,
        { headers: { cookie: requestHeaders.get("cookie") ?? "" } },
      );
      if (!data.ok) throw new Error("Failed to load memory detail.");
      return data.data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null;
      if (isAxiosError(error) && error.response?.status === 401) redirect(APP_ROUTES.AUTH);
      throw new Error("Failed to load memory detail.", { cause: error });
    }
  },
);

export function getCurrentMemoryDetail({
  memoryId,
  visibility,
}: GetCurrentMemoryDetailParams): Promise<MemoryDetail | null> {
  return getCachedMemoryDetail(memoryId, visibility);
}

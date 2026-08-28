import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { memoryQueryKeys } from "../../constants/query-keys";
import type { VaultPage } from "../../types/vault";

type VaultQueryKey = ReturnType<typeof memoryQueryKeys.vault>;

async function fetchVaultPage(cursor: string | null): Promise<VaultPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(`/api/memories/vault${query}`);

  if (!response.ok) {
    throw new Error("Failed to load the Private Vault.");
  }

  return response.json() as Promise<VaultPage>;
}

export function useVaultMemories() {
  return useInfiniteQuery<VaultPage, Error, InfiniteData<VaultPage>, VaultQueryKey, string | null>({
    gcTime: 0,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) => fetchVaultPage(pageParam),
    queryKey: memoryQueryKeys.vault(),
    retry: false,
  });
}

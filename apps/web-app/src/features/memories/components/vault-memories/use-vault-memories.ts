import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import type { MemorySort } from "../../constants/memory-sort";
import { memoryQueryKeys } from "../../constants/query-keys";
import type { VaultPage } from "../../types/vault";

type VaultQueryKey = ReturnType<typeof memoryQueryKeys.vault>;

async function fetchVaultPage(cursor: string | null, sort: MemorySort): Promise<VaultPage> {
  const searchParams = new URLSearchParams();
  if (cursor) {
    searchParams.set("cursor", cursor);
  }
  if (sort === "oldest") {
    searchParams.set("sort", sort);
  }
  const query = searchParams.size > 0 ? `?${searchParams}` : "";
  const response = await fetch(`/api/memories/vault${query}`);

  if (!response.ok) {
    throw new Error("Failed to load the Private Vault.");
  }

  return response.json() as Promise<VaultPage>;
}

export function useVaultMemories(sort: MemorySort) {
  return useInfiniteQuery<VaultPage, Error, InfiniteData<VaultPage>, VaultQueryKey, string | null>({
    gcTime: 0,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) => fetchVaultPage(pageParam, sort),
    queryKey: memoryQueryKeys.vault(sort),
    retry: false,
  });
}

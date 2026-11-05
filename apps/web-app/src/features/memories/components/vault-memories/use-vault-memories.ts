import type { MemoryListPage } from "@leonly/utils/contracts";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { listMemories } from "../../api/list-memories";
import type { MemorySort } from "../../constants/memory-sort";
import { memoryQueryKeys } from "../../constants/query-keys";

type VaultQueryKey = ReturnType<typeof memoryQueryKeys.vault>;

export function useVaultMemories(sort: MemorySort) {
  return useInfiniteQuery<
    MemoryListPage,
    Error,
    InfiniteData<MemoryListPage>,
    VaultQueryKey,
    string | null
  >({
    gcTime: 0,
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) => listMemories({ visibility: "vault", cursor: pageParam, sort }),
    queryKey: memoryQueryKeys.vault(sort),
    retry: false,
  });
}

import type { ApiResponse, MemoryListPage } from "@leonly/utils/contracts";
import { api } from "@/lib/axios/api";
import type { MemorySort } from "../constants/memory-sort";

type ListMemoriesParams = {
  visibility: "timeline" | "vault";
  cursor: string | null;
  sort: MemorySort;
  limit?: number;
};

export async function listMemories({
  visibility,
  cursor,
  sort,
  limit,
}: ListMemoriesParams): Promise<MemoryListPage> {
  const response = await api.get<ApiResponse<MemoryListPage>>(`/memories/${visibility}`, {
    params: { cursor: cursor ?? undefined, sort, limit },
  });
  if (!response.data.ok) throw new Error(response.data.message);
  return response.data.data;
}

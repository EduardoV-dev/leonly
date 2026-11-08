import type { ApiResponse, CommentPage, RootComment } from "@leonly/utils/contracts";
import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { api } from "@/lib/axios/api";
import { memoryQueryKeys } from "../../constants/query-keys";

type UseCommentRepliesParams = {
  memoryId: string;
  commentId: string;
  isExpanded: boolean;
};

export function useCommentReplies({
  memoryId,
  commentId,
  isExpanded,
}: UseCommentRepliesParams): UseInfiniteQueryResult<
  InfiniteData<CommentPage<RootComment>, string | null>,
  Error
> {
  return useInfiniteQuery({
    queryKey: [...memoryQueryKeys.comments(memoryId), "replies", commentId],
    enabled: isExpanded,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const url = `/memories/${memoryId}/comments/${commentId}/replies`;
      const response = await api.get<ApiResponse<CommentPage<RootComment>>>(url, {
        params: pageParam ? { cursor: pageParam } : undefined,
      });
      if (!response.data.ok) throw new Error("Unable to load replies");
      if (!response.data.data.meta.resetCursor) return response.data.data;

      const restarted = await api.get<ApiResponse<CommentPage<RootComment>>>(url);
      if (!restarted.data.ok) throw new Error("Unable to load replies");
      return { ...restarted.data.data, meta: { ...restarted.data.data.meta, resetCursor: true } };
    },
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
    select: (data) => {
      let resetIndex = -1;
      data.pages.forEach((page, index) => {
        if (page.meta.resetCursor) resetIndex = index;
      });
      return resetIndex < 0
        ? data
        : { pages: data.pages.slice(resetIndex), pageParams: data.pageParams.slice(resetIndex) };
    },
  });
}

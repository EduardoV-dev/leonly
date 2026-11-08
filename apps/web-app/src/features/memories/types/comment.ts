export type { MemoryComment, RootComment } from "@leonly/utils/contracts";

import type { RootComment } from "@leonly/utils/contracts";

export type MemoryCommentPage = {
  comments: RootComment[];
  cursorReset: boolean;
  nextCursor: string | null;
};

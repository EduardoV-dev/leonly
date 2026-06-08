import { QueryClient } from "@tanstack/react-query";

const FIVE_MINS_STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: FIVE_MINS_STALE_TIME,
    },
  },
});

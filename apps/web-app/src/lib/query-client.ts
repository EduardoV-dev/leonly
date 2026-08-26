import { QueryClient } from "@tanstack/react-query";

const FIVE_MINS_STALE_TIME = 1000 * 60 * 5; // 5 minutes

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: FIVE_MINS_STALE_TIME,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}

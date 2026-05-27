import { getDemoPost } from '@/features/demo/api/get-demo';
import { useQuery } from '@tanstack/react-query';

export const DEMO_POST_QUERY_KEY = ['demo', 'post'] as const;

export function useDemoQuery() {
  return useQuery({
    queryKey: DEMO_POST_QUERY_KEY,
    queryFn: getDemoPost,
    enabled: false,
  });
}

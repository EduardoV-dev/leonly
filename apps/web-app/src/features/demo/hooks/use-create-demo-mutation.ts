import { createDemoPost } from '@/features/demo/api/create-demo';
import { DEMO_POST_QUERY_KEY } from '@/features/demo/hooks/use-demo-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateDemoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDemoPost,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DEMO_POST_QUERY_KEY });
    },
  });
}

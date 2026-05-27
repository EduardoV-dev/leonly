import type { DemoPost } from '@/features/demo/types/demo';
import { apiClient } from '@/lib/axios';

export async function getDemoPost(): Promise<DemoPost> {
  const response = await apiClient.get<DemoPost>('/posts/1');
  return response.data;
}

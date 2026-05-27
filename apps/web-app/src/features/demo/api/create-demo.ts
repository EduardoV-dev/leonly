import type { CreateDemoPostPayload, DemoPost } from '@/features/demo/types/demo';
import { apiClient } from '@/lib/axios';

export async function createDemoPost(payload: CreateDemoPostPayload): Promise<DemoPost> {
  const response = await apiClient.post<DemoPost>('/posts', payload);
  return response.data;
}

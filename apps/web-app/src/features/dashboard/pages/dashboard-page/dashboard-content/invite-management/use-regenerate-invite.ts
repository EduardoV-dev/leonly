import { useMutation } from "@tanstack/react-query";
import axios, { isAxiosError } from "axios";
import { z } from "zod";

const MAX_RETRY_DELAY = 30_000;

const regeneratedInviteSchema = z.object({
  invite_code: z.string().min(1),
  invite_code_expires_at: z.string().min(1),
});

export type RegeneratedInvite = z.infer<typeof regeneratedInviteSchema>;

const regenerateInvite = async (): Promise<RegeneratedInvite> => {
  const response = await axios.post("/api/spaces/invite/regenerate");

  return regeneratedInviteSchema.parse(response.data);
};

const shouldRetry = (_failureCount: number, error: unknown) => {
  if (!isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  return status === undefined || status === 408 || status === 429 || status >= 500;
};

export function useRegenerateInvite() {
  return useMutation({
    mutationFn: regenerateInvite,
    retry: shouldRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** Math.min(attemptIndex, 5), MAX_RETRY_DELAY),
  });
}

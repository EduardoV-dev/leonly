import { api, isAxiosError } from "@/lib/axios/api";
import type { ApiResponse } from "@/types/api-response";

type RegeneratedInvite = { invite_code: string; invite_code_expires_at: string };

export type PartnerInviteRegenerationResult =
  | { code: string; expiresAt: string; status: "regenerated" }
  | { status: "joined" }
  | { retryAfter: number; status: "locked" }
  | { status: "unavailable" }
  | { status: "failed" };

function getRetryAfter(value: unknown): number {
  const parsedValue = typeof value === "string" ? Number(value) : value;
  return typeof parsedValue === "number" && Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : 1;
}

export async function regeneratePartnerInvite(): Promise<PartnerInviteRegenerationResult> {
  try {
    const { data: payload } = await api.post<ApiResponse<RegeneratedInvite>>(
      "/spaces/invites/regenerations",
    );
    if (payload.data === null) return { status: "failed" };
    return {
      code: payload.data.invite_code,
      expiresAt: payload.data.invite_code_expires_at,
      status: "regenerated",
    };
  } catch (error) {
    const isApiError = isAxiosError<ApiResponse<null>>(error);
    if (!isApiError) return { status: "failed" };
    const status = error.response?.status;
    const isPartnerJoined =
      status === 409 && error.response?.data.error?.some(({ code }) => code === "joined");
    if (isPartnerJoined) return { status: "joined" };
    if (status === 429)
      return {
        retryAfter: getRetryAfter(error.response?.headers["retry-after"]),
        status: "locked",
      };
    if (status === 404) return { status: "unavailable" };
    return { status: "failed" };
  }
}

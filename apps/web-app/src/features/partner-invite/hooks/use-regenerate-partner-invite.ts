import axios from "axios";
import { z } from "zod";
import { isAxiosError } from "@/lib/axios/is-axios-error";

const regeneratedInviteSchema = z.object({
  invite_code: z.string().min(1),
  invite_code_expires_at: z.string().datetime({ offset: true }),
});

const errorCodeSchema = z.object({ code: z.string().optional() });

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
    const response = await axios.post("/api/spaces/invite/regenerate");

    if (response.status === 200) {
      const invite = regeneratedInviteSchema.safeParse(response.data);

      return invite.success
        ? {
            code: invite.data.invite_code,
            expiresAt: invite.data.invite_code_expires_at,
            status: "regenerated",
          }
        : { status: "failed" };
    }

    return { status: "failed" };
  } catch (error) {
    const isApiError = isAxiosError(error);
    if (!isApiError) return { status: "failed" };

    const status = error.response?.status;
    const errorCode = errorCodeSchema.safeParse(error.response?.data);

    const isPartnerJoined = status === 409 && errorCode.success && errorCode.data.code === "joined";
    if (isPartnerJoined) {
      return { status: "joined" };
    }

    if (status === 429) {
      return {
        retryAfter: getRetryAfter(error.response?.headers["retry-after"]),
        status: "locked",
      };
    }

    if (status === 404) return { status: "unavailable" };

    return { status: "failed" };
  }
}

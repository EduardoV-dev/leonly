import type { ApiError, ApiResponse } from "@/types/api-response";
import type { SettingsReadModel } from "../../types/settings";

type SettingsEditTestResponse = {
  status: number;
  data: {
    ok: boolean;
    data: Record<string, unknown> | null;
    error: ApiError[];
    message: string;
  };
};

export function settingsEditResponse(
  status: number,
  values: Record<string, unknown> = {},
): SettingsEditTestResponse {
  return {
    status,
    data: {
      ok: status === 200,
      data: status === 200 ? { ...values, status: "updated" } : null,
      error: status === 409 ? [{ code: "HTTP_409", message: "Stale revision." }] : [],
      message: "Settings response",
    },
  };
}

export function settingsReadResponse(values: {
  displayName?: string;
  name?: string;
  startDate?: string;
  updatedAt: string;
}): { data: ApiResponse<SettingsReadModel> } {
  return {
    data: {
      ok: true,
      data: {
        account: { email: "leo@example.com", providerLabel: "Google" },
        activeMembers: [
          {
            avatarUrl: null,
            displayName: values.displayName ?? "Leo",
            id: "current-member",
            isCurrentMember: true,
            joinedAt: "2025-04-27T10:00:00.000Z",
            role: "owner",
            updatedAt: values.updatedAt,
          },
        ],
        invite: { code: null, expiresAt: null, isAvailable: false },
        membershipState: "one-member",
        space: {
          name: values.name ?? "Our space",
          startDate: values.startDate ?? "2025-04-27",
          updatedAt: values.updatedAt,
        },
      },
      error: [],
      message: "Settings response",
    },
  };
}

import "server-only";

import { headers } from "next/headers";
import { isAxiosError, serverApi } from "@/lib/axios/server-api";
import type { ApiResponse } from "@/types/api-response";
import type { SettingsReadModel } from "../types/settings";

export type { SettingsMember, SettingsReadModel } from "../types/settings";

export type SettingsReadResult =
  | { status: "unauthenticated" }
  | { status: "no-active-space" }
  | { settings: SettingsReadModel; status: "success" };

export async function getSettingsForCurrentUser(): Promise<SettingsReadResult> {
  const requestHeaders = await headers();
  try {
    const { data: payload } = await serverApi.get<ApiResponse<SettingsReadModel | null>>(
      "/users/me/settings",
      {
        headers: { cookie: requestHeaders.get("cookie") ?? "" },
      },
    );
    if (payload.data === null) return { status: "no-active-space" };
    return { settings: payload.data, status: "success" };
  } catch (error) {
    const isApiError = isAxiosError(error);
    if (isApiError && error.response?.status === 401) return { status: "unauthenticated" };
    throw new Error("Failed to load Settings.", { cause: error });
  }
}

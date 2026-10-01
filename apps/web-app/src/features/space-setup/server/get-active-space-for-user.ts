import { headers } from "next/headers";
import { cache } from "react";
import { isAxiosError, serverApi } from "@/lib/axios/server-api";
import type { ApiResponse } from "@/types/api-response";
import type { ActiveSpace } from "../types/active-space";

export type { ActiveSpace } from "../types/active-space";

export class ActiveSpaceAuthenticationError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "ActiveSpaceAuthenticationError";
  }
}

export const getActiveSpaceForCurrentUser = cache(async (): Promise<ActiveSpace | null> => {
  const requestHeaders = await headers();
  let payload: ApiResponse<ActiveSpace>;

  try {
    const response = await serverApi.get<ApiResponse<ActiveSpace>>("/users/me/space", {
      headers: { cookie: requestHeaders.get("cookie") ?? "" },
    });
    payload = response.data;
  } catch (error) {
    const isApiError = isAxiosError<ApiResponse<ActiveSpace>>(error);
    if (!isApiError) throw error;

    if (error.response?.status === 401) throw new ActiveSpaceAuthenticationError();
    if (error.response) throw new Error("Failed to load the active space.", { cause: error });

    throw error;
  }

  return payload.data;
});

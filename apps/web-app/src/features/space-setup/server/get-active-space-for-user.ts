import { headers } from "next/headers";
import { cache } from "react";
import { serverApi } from "@/lib/axios/server-api";
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
  const response = await serverApi.get<ApiResponse<ActiveSpace>>("/users/me/space", {
    headers: { cookie: requestHeaders.get("cookie") ?? "" },
    validateStatus: () => true,
  });

  if (response.status === 401) throw new ActiveSpaceAuthenticationError();

  if (response.status !== 200 || response.data.ok !== true) {
    throw new Error("Failed to load the active space.");
  }

  return response.data.data;
});

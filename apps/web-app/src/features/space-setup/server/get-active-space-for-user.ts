import { headers } from "next/headers";
import { cache } from "react";
import { api } from "@/lib/axios/api";

export type ActiveSpace = {
  active_members: { avatar_url: string | null; display_name: string }[];
  id: string;
  invite_code: string | null;
  invite_code_expires_at: string | null;
  member_names: string[];
  name: string;
  onboarding_completed_at: string | null;
  start_date: string;
};

type ActiveSpaceResponse = {
  data: ActiveSpace | null;
  error: [];
  message: string;
  ok: true;
};

export class ActiveSpaceAuthenticationError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "ActiveSpaceAuthenticationError";
  }
}

export const getActiveSpaceForCurrentUser = cache(async (): Promise<ActiveSpace | null> => {
  const requestHeaders = await headers();
  const response = await api.get<ActiveSpaceResponse>("/api/users/me/space", {
    headers: { cookie: requestHeaders.get("cookie") ?? "" },
    validateStatus: () => true,
  });

  if (response.status === 401) throw new ActiveSpaceAuthenticationError();

  if (response.status !== 200 || response.data.ok !== true) {
    throw new Error("Failed to load the active space.");
  }

  return response.data.data;
});

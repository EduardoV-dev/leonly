import { api } from "@/lib/axios/api";
import type { ApiResponse } from "@/types/api-response";
import type { SettingsReadModel } from "../types/settings";

export async function getCurrentSettings(): Promise<SettingsReadModel> {
  const response = await api.get<ApiResponse<SettingsReadModel | null>>("/users/me/settings");
  const settings = response.data.data;
  if (!settings) throw new Error("Current settings are unavailable.");
  return settings;
}

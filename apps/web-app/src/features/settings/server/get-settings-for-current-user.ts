import "server-only";

import { z } from "zod";
import { logServerError } from "@/lib/server-logger";
import { createClient } from "@/lib/supabase/server";

const providerLabels: Readonly<Record<string, string>> = {
  google: "Google",
};

const settingsRpcSchema = z
  .object({
    active_members: z
      .array(
        z
          .object({
            avatar_url: z.string().url().nullable().catch(null),
            created_at: z.string().datetime({ offset: true }),
            display_name: z.string().min(1),
            is_current_member: z.boolean(),
            membership_id: z.uuid(),
            role: z.enum(["owner", "partner"]),
          })
          .strict(),
      )
      .min(1)
      .max(2),
    id: z.uuid(),
    invite_code: z.string().min(1).nullable(),
    invite_code_expires_at: z.string().datetime({ offset: true }).nullable(),
    invite_code_is_available: z.boolean(),
    name: z.string().min(1),
    start_date: z.iso.date(),
  })
  .strict()
  .superRefine((settings, context) => {
    if (settings.active_members.filter((member) => member.is_current_member).length !== 1) {
      context.addIssue({ code: "custom", message: "Expected exactly one current member." });
    }
  });

export type SettingsMember = {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  isCurrentMember: boolean;
  joinedAt: string;
  role: "owner" | "partner";
};

export type SettingsReadModel = {
  account: {
    email: string | null;
    providerLabel: string | null;
  };
  activeMembers: SettingsMember[];
  invite: {
    code: string | null;
    expiresAt: string | null;
    isAvailable: boolean;
  };
  membershipState: "one-member" | "two-member";
  space: {
    name: string;
    startDate: string;
  };
};

export type SettingsReadResult =
  | { status: "unauthenticated" }
  | { status: "no-active-space" }
  | { settings: SettingsReadModel; status: "success" };

function getAccountValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function getProviderLabel(provider: unknown): string | null {
  return typeof provider === "string" ? (providerLabels[provider] ?? null) : null;
}

export async function getSettingsForCurrentUser(): Promise<SettingsReadResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    logServerError(
      { event: "supabase_operation_failed", operation: "get_settings_current_user" },
      authError,
    );
    throw new Error("Failed to load Settings account context.");
  }

  if (!authData.user) {
    return { status: "unauthenticated" };
  }

  const { data, error } = await supabase.rpc("get_active_space_settings");
  if (error) {
    logServerError(
      { event: "supabase_operation_failed", operation: "get_active_space_settings" },
      error,
    );
    throw new Error("Failed to load Settings.");
  }

  if (data === null) {
    return { status: "no-active-space" };
  }

  const parsedSettings = settingsRpcSchema.safeParse(data);
  if (!parsedSettings.success) {
    logServerError(
      { event: "supabase_operation_failed", operation: "parse_active_space_settings" },
      parsedSettings.error,
    );
    throw new Error("Failed to load Settings.");
  }

  const rpcSettings = parsedSettings.data;
  const activeMembers = rpcSettings.active_members.map((member) => ({
    avatarUrl: member.avatar_url,
    displayName: member.display_name,
    id: member.membership_id,
    isCurrentMember: member.is_current_member,
    joinedAt: member.created_at,
    role: member.role,
  }));
  return {
    settings: {
      account: {
        email: getAccountValue(authData.user.email),
        providerLabel: getProviderLabel(authData.user.app_metadata.provider),
      },
      activeMembers,
      invite: {
        code: rpcSettings.invite_code,
        expiresAt: rpcSettings.invite_code_expires_at,
        isAvailable: rpcSettings.invite_code_is_available,
      },
      membershipState: activeMembers.length === 1 ? "one-member" : "two-member",
      space: {
        name: rpcSettings.name,
        startDate: rpcSettings.start_date,
      },
    },
    status: "success",
  };
}

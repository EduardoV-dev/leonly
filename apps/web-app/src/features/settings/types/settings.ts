export type SettingsMember = {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  isCurrentMember: boolean;
  joinedAt: string;
  role: "owner" | "partner";
  updatedAt: string;
};

export type SettingsReadModel = {
  account: { email: string | null; providerLabel: string | null };
  activeMembers: SettingsMember[];
  invite: { code: string | null; expiresAt: string | null; isAvailable: boolean };
  membershipState: "one-member" | "two-member";
  space: { name: string; startDate: string; updatedAt: string };
};

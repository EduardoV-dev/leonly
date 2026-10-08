export type ValidateInviteParams = { userId: string; inviteCode: string };
export type JoinParams = ValidateInviteParams & {
  accountName: string | undefined;
  displayName?: string | null;
};

export type JoinResult =
  | { status: "joined"; space_id: string }
  | { status: "invalid_name" | "malformed" | "unavailable" };

export type DisplayNameEditResult = {
  displayName: string;
  status: "updated";
  updatedAt: string;
};

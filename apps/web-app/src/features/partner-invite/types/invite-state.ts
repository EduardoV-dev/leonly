export type InviteState =
  | { code: string; expiresAt: string; status: "valid" }
  | { status: "unavailable" }
  | { status: "joined" };

export type InviteFeedback =
  | { status: "copied" }
  | { status: "manual-copy" }
  | { status: "regenerated" }
  | { status: "joined" }
  | { retryAfter: number; status: "rate-limited" }
  | { status: "failed" }
  | null;

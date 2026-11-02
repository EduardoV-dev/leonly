export const REVISION = "2026-09-05T16:00:00.123456Z";
export const NEXT_REVISION = "2026-09-05T16:00:00.123457Z";
export const SPACE_ID = "0199a9aa-1234-7000-8000-111111111111";
export const member = {
  id: "0199a9aa-1234-7000-8000-222222222222",
  displayName: "Leo",
  role: "owner",
  avatarUrl: null,
  isCurrentMember: true,
  joinedAt: REVISION,
  updatedAt: REVISION,
  spaceName: "Our Space",
  startDate: "2025-04-27",
  spaceUpdatedAt: REVISION,
  inviteCode: "twofw3k3",
  inviteExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
};
export const lockedSettings = {
  spaceId: SPACE_ID,
  memberId: member.id,
  name: "Our Space",
  startDate: "2025-04-27",
  displayName: "Leo",
  spaceUpdatedAt: REVISION,
  memberUpdatedAt: REVISION,
};
export const edits = [
  { path: "/api/spaces/name", field: "name", value: "New Space" },
  { path: "/api/spaces/start-date", field: "startDate", value: "2025-04-28", timezone: "UTC" },
  { path: "/api/spaces/memberships/display-name", field: "displayName", value: "Leo Hart" },
];

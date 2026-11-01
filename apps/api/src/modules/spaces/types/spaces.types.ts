export type SpaceEditResult = {
  status: "updated";
  updatedAt: string;
} & ({ name: string } | { startDate: string });

export type SpaceEditOptions = {
  userId: string;
  expectedUpdatedAt: string;
};

export type RegenerateReturn = { invite_code: string; invite_code_expires_at: string };

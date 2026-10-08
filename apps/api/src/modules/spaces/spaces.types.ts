export type SpaceEditResult = {
  status: "updated";
  updatedAt: string;
} & ({ name: string } | { startDate: string });

export type SpaceEditOptions = {
  userId: string;
  expectedUpdatedAt: string;
};

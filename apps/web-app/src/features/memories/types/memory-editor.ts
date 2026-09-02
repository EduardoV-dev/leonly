export type MemoryPlacement = "timeline" | "vault";

export type MemoryEditorValues = {
  description: string;
  location: string;
  memoryDate: string;
  title: string;
  visibility: MemoryPlacement;
};

export type MemoryEditorPhoto =
  | {
      file: File;
      key: string;
      kind: "new";
      name: string;
      previewUrl: string;
    }
  | {
      id: string;
      key: string;
      kind: "retained";
      name: string;
      previewUrl: string | null;
    };

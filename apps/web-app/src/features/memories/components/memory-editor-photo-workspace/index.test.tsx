import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryEditorPhotoWorkspace } from ".";

const previewUrl =
  "/api/memories/0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0/photos/22a6c4ed-10c7-42a9-a7a8-b31d210ea2bf/detail";

describe("MemoryEditorPhotoWorkspace", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("loads retained previews directly and renders the accessible fallback on failure", () => {
    render(
      <MemoryEditorPhotoWorkspace
        coverPhotoKey="retained-photo"
        isDisabled={false}
        maxPhotos={5}
        mode="edit"
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onSelectCover={vi.fn()}
        photos={[
          {
            id: "22a6c4ed-10c7-42a9-a7a8-b31d210ea2bf",
            key: "retained-photo",
            kind: "retained",
            name: "photo 1",
            previewUrl,
          },
        ]}
      />,
    );

    const preview = screen.getByRole("img", { name: "Memory photo 1" });
    expect(preview).toHaveAttribute("src", previewUrl);
    expect(preview).not.toHaveAttribute("src", expect.stringContaining("/_next/image"));

    fireEvent.error(preview);
    expect(screen.getByRole("img", { name: "Photo preview unavailable" })).toBeInTheDocument();
  });
});

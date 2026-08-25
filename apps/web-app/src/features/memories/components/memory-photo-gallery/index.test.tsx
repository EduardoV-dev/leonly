import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryPhotoGallery } from ".";

const photos = [
  { id: "64d44f34-c5fe-482a-b65b-f91d0173b7fe", url: "https://storage.example/cover" },
  { id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452", url: "https://storage.example/second" },
  { id: "cc2df916-833a-4f1b-b744-b7b4c176ae93", url: null },
];

describe("MemoryPhotoGallery", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders a calm no-photo presentation", () => {
    render(<MemoryPhotoGallery photos={[]} title="Our picnic" />);

    expect(screen.getByText("A memory held in words")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows one meaningful photo without unnecessary navigation", () => {
    render(<MemoryPhotoGallery photos={[photos[0]]} title="Our picnic" />);

    expect(screen.getByRole("img", { name: "Photo 1 of 1 from Our picnic" })).toHaveAttribute(
      "src",
      "https://storage.example/cover",
    );
    expect(screen.queryByRole("button", { name: "Previous photo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
  });

  it("wraps navigation and exposes direct selected state", () => {
    render(<MemoryPhotoGallery photos={photos} title="Our picnic" />);

    const previous = screen.getByRole("button", { name: "Previous photo" });
    const next = screen.getByRole("button", { name: "Next photo" });
    fireEvent.click(previous);
    expect(screen.getByRole("img", { name: "Photo 3 is unavailable" })).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByRole("img", { name: "Photo 1 of 3 from Our picnic" })).toBeInTheDocument();

    const secondSelector = screen.getByRole("button", { name: "Show photo 2 of 3" });
    fireEvent.click(secondSelector);
    expect(secondSelector).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: "Photo 2 of 3 from Our picnic" })).toBeInTheDocument();
  });

  it("falls back for a failed image while other photos remain selectable", () => {
    render(<MemoryPhotoGallery photos={photos.slice(0, 2)} title="Our picnic" />);

    fireEvent.error(screen.getByRole("img", { name: "Photo 1 of 2 from Our picnic" }));
    expect(screen.getByRole("img", { name: "Photo 1 is unavailable" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show photo 2 of 2" }));
    expect(screen.getByRole("img", { name: "Photo 2 of 2 from Our picnic" })).toHaveAttribute(
      "src",
      "https://storage.example/second",
    );
  });
});

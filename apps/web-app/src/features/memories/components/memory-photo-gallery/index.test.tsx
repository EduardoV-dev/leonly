import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { MemoryPhotoGallery } from ".";

const photos = [
  {
    coverUrl: "https://storage.example/cover-card",
    detailUrl: "https://storage.example/cover-detail",
    id: "64d44f34-c5fe-482a-b65b-f91d0173b7fe",
  },
  {
    coverUrl: "https://storage.example/second-card",
    detailUrl: "https://storage.example/second-detail",
    id: "2505a6a1-0d34-48f7-8d0d-e7cf9a62e452",
  },
  {
    coverUrl: null,
    detailUrl: null,
    id: "cc2df916-833a-4f1b-b744-b7b4c176ae93",
  },
];

const galleryProps = {
  dateLabel: "August 20, 2026",
  dateTime: "2026-08-20",
  description: "A sunny afternoon together.",
  title: "Our picnic",
};

const scrollIntoViewMock = vi.fn();

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, eventInit: PointerEventInit = {}) {
    super(type, eventInit);
    this.pointerId = eventInit.pointerId ?? 0;
  }
}

function swipe(element: Element, fromX: number, toX: number, fromY = 100, toY = 100) {
  fireEvent.pointerDown(element, {
    button: 0,
    clientX: fromX,
    clientY: fromY,
    pointerId: 1,
  });
  fireEvent.pointerUp(element, {
    button: 0,
    clientX: toX,
    clientY: toY,
    pointerId: 1,
  });
}

describe("MemoryPhotoGallery", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    scrollIntoViewMock.mockClear();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    window.PointerEvent = TestPointerEvent as typeof PointerEvent;
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  it("renders a calm no-photo presentation", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={[]} />);

    expect(screen.getByText("A memory held in words")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows one meaningful photo without unnecessary navigation", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={[photos[0]]} />);

    expect(screen.getByRole("img", { name: "Photo 1 of 1 from Our picnic" })).toHaveAttribute(
      "src",
      "https://storage.example/cover-detail",
    );
    expect(screen.queryByRole("button", { name: "Previous photo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
  });

  it("renders ambient decorations behind the selected photo", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={[photos[0]]} />);

    const image = screen.getByRole("img", { name: "Photo 1 of 1 from Our picnic" });
    const stage = image.parentElement?.parentElement;
    expect(stage?.querySelectorAll('[aria-hidden="true"] svg')).toHaveLength(16);
  });

  it("opens a lightbox with details hidden and closes it", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={photos.slice(0, 2)} />);

    fireEvent.click(screen.getByRole("button", { name: "Open photo 1 in full screen" }));

    const dialog = screen.getByRole("dialog", { name: "Photo viewer for Our picnic" });
    expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();
    expect(within(dialog).queryByText(galleryProps.description)).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("img", { name: "Photo 1 of 2 from Our picnic" }));
    expect(within(dialog).getByRole("heading", { name: galleryProps.title })).toBeInTheDocument();
    expect(within(dialog).getByText(galleryProps.dateLabel)).toHaveAttribute(
      "datetime",
      galleryProps.dateTime,
    );
    expect(within(dialog).getByText(galleryProps.description)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("img", { name: "Photo 1 of 2 from Our picnic" }));
    expect(within(dialog).queryByText(galleryProps.description)).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close photo viewer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("wraps lightbox controls and supports arrow-key navigation", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={photos.slice(0, 2)} />);

    fireEvent.click(screen.getByRole("button", { name: "Open photo 1 in full screen" }));
    const dialog = screen.getByRole("dialog", { name: "Photo viewer for Our picnic" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Previous photo" }));
    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
    expect(within(dialog).queryByText(galleryProps.description)).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("img", { name: "Photo 2 of 2 from Our picnic" }),
    ).toHaveAttribute("src", "https://storage.example/second-detail");

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Show photo 2 of 2" }));
    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
    expect(within(dialog).queryByText(galleryProps.description)).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("img", { name: "Photo 2 of 2 from Our picnic" }));
    expect(within(dialog).getByText(galleryProps.description)).toBeInTheDocument();
  });

  it("wraps navigation and exposes direct selected state", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={photos} />);

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

  it("changes photos with horizontal swipes without opening the lightbox", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={photos.slice(0, 2)} />);

    const photo = screen.getByRole("button", { name: "Open photo 1 in full screen" });
    swipe(photo, 180, 80);
    fireEvent.click(photo);

    expect(screen.getByRole("img", { name: "Photo 2 of 2 from Our picnic" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    swipe(photo, 80, 180);
    expect(screen.getByRole("img", { name: "Photo 1 of 2 from Our picnic" })).toBeInTheDocument();
  });

  it("ignores short and mostly vertical pointer movements", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={photos.slice(0, 2)} />);

    const photo = screen.getByRole("button", { name: "Open photo 1 in full screen" });
    swipe(photo, 100, 130);
    swipe(photo, 100, 160, 100, 180);

    expect(screen.getByRole("img", { name: "Photo 1 of 2 from Our picnic" })).toBeInTheDocument();
  });

  it("keeps the selected thumbnail visible after selection changes", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={photos.slice(0, 2)} />);

    const secondSelector = screen.getByRole("button", { name: "Show photo 2 of 2" });
    fireEvent.click(secondSelector);

    expect(scrollIntoViewMock).toHaveBeenLastCalledWith({
      block: "nearest",
      inline: "nearest",
    });
    expect(scrollIntoViewMock.mock.contexts.at(-1)).toBe(secondSelector);
  });

  it("changes lightbox photos with swipes without toggling details", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={photos.slice(0, 2)} />);

    fireEvent.click(screen.getByRole("button", { name: "Open photo 1 in full screen" }));
    const dialog = screen.getByRole("dialog", { name: "Photo viewer for Our picnic" });
    const photoToggle = within(dialog)
      .getByRole("img", { name: "Photo 1 of 2 from Our picnic" })
      .closest("button");
    if (!photoToggle) {
      throw new Error("Expected the lightbox photo to be interactive.");
    }

    swipe(photoToggle, 180, 80);
    fireEvent.click(photoToggle);

    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
    expect(within(dialog).queryByText(galleryProps.description)).not.toBeInTheDocument();

    swipe(photoToggle, 80, 180);
    expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();
  });

  it("falls back for a failed image while other photos remain selectable", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={photos.slice(0, 2)} />);

    fireEvent.error(screen.getByRole("img", { name: "Photo 1 of 2 from Our picnic" }));
    expect(screen.getByRole("img", { name: "Photo 1 of 2 from Our picnic" })).toHaveAttribute(
      "src",
      "https://storage.example/cover-card",
    );

    fireEvent.error(screen.getByRole("img", { name: "Photo 1 of 2 from Our picnic" }));
    expect(screen.getByRole("img", { name: "Photo 1 is unavailable" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show photo 2 of 2" }));
    expect(screen.getByRole("img", { name: "Photo 2 of 2 from Our picnic" })).toHaveAttribute(
      "src",
      "https://storage.example/second-detail",
    );
  });

  it("uses cover variants for thumbnail selectors", () => {
    render(<MemoryPhotoGallery {...galleryProps} photos={photos.slice(0, 2)} />);

    expect(
      screen.getByRole("button", { name: "Show photo 2 of 2" }).querySelector("img"),
    ).toHaveAttribute("src", "https://storage.example/second-card");
  });
});

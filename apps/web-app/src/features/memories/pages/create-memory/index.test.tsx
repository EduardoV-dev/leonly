import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { CreateMemoryPage } from ".";

function renderCreateMemoryPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateMemoryPage />
    </QueryClientProvider>,
  );
}

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/components/past-date-picker", () => ({
  PastDatePicker: ({
    label,
    onChange,
    value,
  }: {
    label: string;
    onChange: (value: string) => void;
    value: string;
  }) => (
    <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

describe("CreateMemoryPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("crypto", { randomUUID: () => "0f45254e-5c9d-4a25-b17f-5e0ce1c5d0b0" });
    Object.defineProperties(URL, {
      createObjectURL: {
        configurable: true,
        value: vi.fn((file: File) => `blob:${file.name}`),
      },
      revokeObjectURL: {
        configurable: true,
        value: vi.fn(),
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("submits only once while the creation request is pending", async () => {
    let resolveRequest: (response: Response) => void = () => {};
    vi.mocked(fetch).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderCreateMemoryPage();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Our picnic" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2020-08-20" } });
    const form = screen.getByRole("button", { name: "Preserve Memory" }).closest("form");
    if (!form) {
      throw new Error("Create-memory form is missing.");
    }

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetch).toHaveBeenCalledTimes(1);
    resolveRequest(new Response(JSON.stringify({ id: "memory-id" }), { status: 201 }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/timeline"));
  });

  it("keeps valid input and navigates to the timeline after a success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "memory-id" }), { status: 201 }),
    );
    renderCreateMemoryPage();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Our picnic" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2020-08-20" } });
    const form = screen.getByRole("button", { name: "Preserve Memory" }).closest("form");
    if (!form) {
      throw new Error("Create-memory form is missing.");
    }

    fireEvent.submit(form);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/timeline"));
    expect(screen.getByLabelText("Title")).toHaveValue("Our picnic");
  });

  it("submits through application validation instead of browser validation", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Please review the highlighted fields.",
          fields: { memoryDate: "Choose a valid date.", title: "Required." },
        }),
        { status: 400 },
      ),
    );
    renderCreateMemoryPage();

    const preserveButton = screen.getByRole("button", { name: "Preserve Memory" });
    expect(preserveButton.closest("form")).toHaveAttribute("novalidate");
    fireEvent.click(preserveButton);

    expect(await screen.findByText("Required.")).toBeInTheDocument();
    expect(screen.getByText("Choose a valid date.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps a visible route back to the timeline", () => {
    renderCreateMemoryPage();

    expect(screen.getByRole("link", { name: "Go back to timeline" })).toHaveAttribute(
      "href",
      "/timeline",
    );
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/timeline");
  });

  it("renders translated creation controls in spanish", async () => {
    await i18n.changeLanguage("es");
    renderCreateMemoryPage();

    expect(screen.getByRole("heading", { name: "Conservar un momento" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a la línea de tiempo" })).toHaveAttribute(
      "href",
      "/timeline",
    );
    expect(screen.getByLabelText("Título")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conservar recuerdo" })).toBeInTheDocument();
    expect(
      screen.getByText("Hasta 10 imágenes JPEG, PNG o WebP de 5 MB cada una."),
    ).toBeInTheDocument();
  });

  it("adds photo previews, changes the cover, and removes photos", () => {
    renderCreateMemoryPage();
    const photoInput = screen.getByLabelText(/Drag and drop your photos/i);
    const firstPhoto = new File(["first"], "first.png", { type: "image/png" });
    const secondPhoto = new File(["second"], "second.webp", { type: "image/webp" });

    fireEvent.change(photoInput, { target: { files: [firstPhoto, secondPhoto] } });

    expect(screen.getByText("2/10")).toBeInTheDocument();
    const coverChoices = screen.getAllByRole("radio", { name: /cover/i });
    expect(coverChoices[0]).toBeChecked();
    fireEvent.click(coverChoices[1]);
    expect(coverChoices[1]).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Remove first.png" }));
    expect(screen.getByText("1/10")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove first.png" })).not.toBeInTheDocument();
  });

  it("rejects more than ten selected photos before submission", () => {
    renderCreateMemoryPage();
    const photos = Array.from(
      { length: 11 },
      (_, index) => new File([String(index)], `${index}.png`, { type: "image/png" }),
    );

    fireEvent.change(screen.getByLabelText(/Drag and drop your photos/i), {
      target: { files: photos },
    });

    expect(screen.getByText("Choose up to 10 photos.")).toBeInTheDocument();
    expect(screen.getByText("0/10")).toBeInTheDocument();
  });
});

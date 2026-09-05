import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { PartnerInviteStatus } from "./index";

const axiosPostMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({ default: { post: axiosPostMock } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

describe("PartnerInviteStatus", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await act(() => i18n.changeLanguage("en"));
  });

  it("shows a formatted selectable code and copies only its normalized value", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <PartnerInviteStatus
        code="twofw3k3"
        expiresAt="2099-01-01T00:00:00.000Z"
        membershipState="one-member"
      />,
    );

    expect(screen.getByLabelText("Partner invitation code")).toHaveValue("TWO-FW3K3");
    await fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    expect(writeText).toHaveBeenCalledWith("twofw3k3");
    expect(
      await screen.findByRole("button", { name: "Invitation code copied." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("restores the copy label three seconds after a successful copy", async () => {
    vi.useFakeTimers();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    render(
      <PartnerInviteStatus
        code="twofw3k3"
        expiresAt="2099-01-01T00:00:00.000Z"
        membershipState="one-member"
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Invitation code copied." })).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(3_000));

    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("selects the code when automatic copy is unavailable", async () => {
    Object.assign(navigator, { clipboard: undefined });
    render(
      <PartnerInviteStatus
        code="twofw3k3"
        expiresAt="2099-01-01T00:00:00.000Z"
        membershipState="one-member"
      />,
    );

    const code = screen.getByLabelText<HTMLInputElement>("Partner invitation code");
    await fireEvent.click(screen.getByRole("button", { name: "Copy code" }));

    expect(code).toHaveFocus();
    expect(code.selectionStart).toBe(0);
    expect(code.selectionEnd).toBe(code.value.length);
    expect(screen.getByText(/Automatic copy is unavailable/)).toBeInTheDocument();
  });

  it("creates an invite only after the explicit action and keeps the result visible", async () => {
    axiosPostMock.mockResolvedValue({
      data: {
        invite_code: "lny7kmp2",
        invite_code_expires_at: "2099-01-02T00:00:00.000Z",
      },
      headers: {},
      status: 200,
    });
    render(<PartnerInviteStatus code={null} expiresAt={null} membershipState="one-member" />);

    expect(axiosPostMock).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "Create a new invitation" }));

    expect(axiosPostMock).toHaveBeenCalledOnce();
    expect(await screen.findByLabelText("Partner invitation code")).toHaveValue("LNY-7KMP2");
    expect(await screen.findByText("A new invitation code is ready to share.")).toBeInTheDocument();
    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
  });

  it("prevents duplicate regeneration requests while one is pending", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    axiosPostMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<PartnerInviteStatus code={null} expiresAt={null} membershipState="one-member" />);

    const regenerate = screen.getByRole("button", { name: "Create a new invitation" });
    fireEvent.click(regenerate);
    fireEvent.click(regenerate);

    expect(axiosPostMock).toHaveBeenCalledOnce();
    expect(regenerate).toBeDisabled();

    if (!resolveRequest) {
      throw new Error("Expected the regeneration request to be pending.");
    }

    resolveRequest({
      data: { invite_code: "lny7kmp2", invite_code_expires_at: "2099-01-02T00:00:00.000Z" },
      headers: {},
      status: 200,
    });

    expect(await screen.findByLabelText("Partner invitation code")).toHaveValue("LNY-7KMP2");
  });

  it("announces a rate limit without retrying the mutation", async () => {
    axiosPostMock.mockResolvedValue({
      data: {},
      headers: { "retry-after": "413" },
      status: 429,
    });
    render(<PartnerInviteStatus code={null} expiresAt={null} membershipState="one-member" />);

    await fireEvent.click(screen.getByRole("button", { name: "Create a new invitation" }));

    expect(
      await screen.findByText("Too many invitation requests. Try again in 413 seconds."),
    ).toBeInTheDocument();
    expect(axiosPostMock).toHaveBeenCalledOnce();
  });

  it("updates an expired code to the unavailable action at the exact expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    render(
      <PartnerInviteStatus
        code="twofw3k3"
        expiresAt="2026-01-01T00:00:01.000Z"
        membershipState="one-member"
      />,
    );

    expect(screen.getByLabelText("Partner invitation code")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(1000));

    expect(screen.getByRole("button", { name: "Create a new invitation" })).toBeEnabled();
    vi.useRealTimers();
  });

  it("shows joined state and refreshes without exposing code after a stale response", async () => {
    axiosPostMock.mockResolvedValue({ data: { code: "joined" }, headers: {}, status: 409 });
    render(<PartnerInviteStatus code={null} expiresAt={null} membershipState="one-member" />);

    await fireEvent.click(screen.getByRole("button", { name: "Create a new invitation" }));

    expect(await screen.findByRole("heading", { name: "You are both here" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create a new invitation" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(refreshMock).toHaveBeenCalledOnce());
  });
});

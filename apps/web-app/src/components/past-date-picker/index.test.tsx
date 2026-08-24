import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/lib/i18n";
import { PastDatePicker } from ".";

describe("PastDatePicker", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("selects the latest allowed date and disables future dates", () => {
    const handleChange = vi.fn();
    render(
      <PastDatePicker
        id="memory-date"
        label="Memory date"
        latestDate={new Date(2026, 7, 24)}
        onChange={handleChange}
        placeholder="Choose a date"
        value=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Memory date" }));

    const futureDate = screen.getByRole("button", { name: /Tuesday, August 25th, 2026/i });
    expect(futureDate).toBeDisabled();
    fireEvent.click(futureDate);
    expect(handleChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Monday, August 24th, 2026/i }));
    expect(handleChange).toHaveBeenCalledWith("2026-08-24");
  });

  it("formats the selected date using the active language", async () => {
    await i18n.changeLanguage("es");

    render(
      <PastDatePicker
        id="memory-date"
        label="Fecha del recuerdo"
        latestDate={new Date(2026, 7, 24)}
        onChange={vi.fn()}
        placeholder="Elige una fecha"
        value="2026-08-24"
      />,
    );

    expect(screen.getByText("24 de agosto de 2026")).toBeInTheDocument();
  });
});

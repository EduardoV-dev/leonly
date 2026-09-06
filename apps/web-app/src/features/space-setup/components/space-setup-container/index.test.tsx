import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n, setLanguage } from "@/lib/i18n";
import { SPACE_SETUP_STEPS } from "../../constants/welcome-steps";
import { SpaceSetupContainer } from ".";

describe("SpaceSetupContainer", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("keeps the story panel synchronized through consecutive language changes", async () => {
    render(
      <SpaceSetupContainer screen={SPACE_SETUP_STEPS.CREATE_START}>
        <p>Setup content</p>
      </SpaceSetupContainer>,
    );

    expect(screen.getByText("Every great story has a beginning.")).toBeInTheDocument();

    await act(async () => {
      await setLanguage("es");
      await setLanguage("en");
      await setLanguage("es");
    });

    expect(screen.getByText("Toda gran historia tiene un comienzo.")).toBeInTheDocument();
  });
});

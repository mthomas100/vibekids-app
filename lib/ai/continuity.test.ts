import { describe, expect, it } from "vitest";
import { buildTurnPrompt } from "./continuity";

describe("buildTurnPrompt", () => {
  it("passes the kid's words through untouched for a brand-new app", () => {
    expect(buildTurnPrompt("make a dino game", [])).toBe("make a dino game");
  });

  it("wraps a follow-up with the live tree and the edit-don't-recreate directive", () => {
    const prompt = buildTurnPrompt(
      "make the button pink",
      [{ path: "index.html", content: "<button>hi</button>" }],
      "Button App",
    );
    expect(prompt).toContain("CONTINUING AN EXISTING APP");
    expect(prompt).toContain(`"Button App"`);
    expect(prompt).toContain("Do NOT call create_project");
    expect(prompt).toContain("===== index.html =====");
    expect(prompt).toContain("<button>hi</button>");
    // The kid's words come LAST so they're adjacent to the model's continuation.
    expect(prompt.trimEnd().endsWith("The kid now says: make the button pink")).toBe(true);
  });

  it("falls back to a generic name when the project has none", () => {
    const prompt = buildTurnPrompt("tweak it", [{ path: "a.html", content: "x" }]);
    expect(prompt).toContain(`"their app"`);
  });

  it("mentions the offer_new_app escape hatch for different-app asks", () => {
    const prompt = buildTurnPrompt("x", [{ path: "a.html", content: "y" }]);
    expect(prompt).toContain("offer_new_app");
  });
});

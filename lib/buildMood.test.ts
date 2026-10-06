import { describe, expect, it } from "vitest";
import { deriveMood } from "./buildMood";

const base = { state: undefined, busy: false, streaming: false, speaking: false } as const;

describe("deriveMood", () => {
  it("is idle when nothing is happening", () => {
    expect(deriveMood({ ...base })).toBe("idle");
  });

  it("celebrating wins over everything (the post-build pop)", () => {
    expect(
      deriveMood({ state: "building", busy: true, streaming: true, speaking: true, celebrating: true }),
    ).toBe("celebrate");
  });

  it("talks whenever read-aloud audio is playing", () => {
    expect(deriveMood({ ...base, state: "building", speaking: true })).toBe("talking");
  });

  it("maps the machine states directly", () => {
    expect(deriveMood({ ...base, state: "error" })).toBe("oops");
    expect(deriveMood({ ...base, state: "building" })).toBe("building");
    expect(deriveMood({ ...base, state: "thinking" })).toBe("thinking");
  });

  it("thinks while this tab's POST is in flight, before the server writes state", () => {
    expect(deriveMood({ ...base, busy: true })).toBe("thinking");
  });

  it("talks while a bubble streams, and settles to idle after a stale 'done'", () => {
    expect(deriveMood({ ...base, streaming: true })).toBe("talking");
    // A reloaded page whose last build finished long ago: state 'done', nothing live.
    expect(deriveMood({ ...base, state: "done" })).toBe("idle");
  });
});

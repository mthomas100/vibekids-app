import { afterEach, describe, expect, it } from "vitest";
import { llmProvider, modelForRole } from "./provider";

const ORIGINAL = process.env.LLM_PROVIDER;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = ORIGINAL;
});

describe("provider switch", () => {
  it("defaults to the API-key path", () => {
    delete process.env.LLM_PROVIDER;
    expect(llmProvider()).toBe("api");
  });

  it("treats any value other than 'subscription' as api (the opt-in must be explicit)", () => {
    process.env.LLM_PROVIDER = "banana";
    expect(llmProvider()).toBe("api");
  });

  it("uses short aliases on the opt-in subscription path", () => {
    process.env.LLM_PROVIDER = "subscription";
    expect(modelForRole("fast")).toBe("haiku");
    expect(modelForRole("balanced")).toBe("sonnet");
    expect(modelForRole("deep")).toBe("opus");
  });

  it("uses explicit version ids on the API path", () => {
    process.env.LLM_PROVIDER = "api";
    expect(modelForRole("fast")).toMatch(/^claude-haiku-/);
    expect(modelForRole("balanced")).toMatch(/^claude-sonnet-/);
    expect(modelForRole("deep")).toMatch(/^claude-opus-/);
  });

  it("defaults the role to balanced", () => {
    delete process.env.LLM_PROVIDER;
    expect(modelForRole()).toMatch(/^claude-sonnet-/);
  });
});

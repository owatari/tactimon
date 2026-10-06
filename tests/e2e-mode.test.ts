import { describe, expect, it } from "vitest";
import { E2E_STORAGE_KEY, isE2eMode } from "../apps/client/lib/e2eMode";

const store = (value: string | null) => ({ getItem: (k: string) => (k === E2E_STORAGE_KEY ? value : null) });

describe("e2e turbo mode", () => {
  it("is off unless the flag is set", () => {
    expect(isE2eMode("development", store(null))).toBe(false);
    expect(isE2eMode("development", store("0"))).toBe(false);
    expect(isE2eMode("development", null)).toBe(false);
  });
  it("turns on in development with the flag", () => {
    expect(isE2eMode("development", store("1"))).toBe(true);
  });
  it("never turns on in production", () => {
    expect(isE2eMode("production", store("1"))).toBe(false);
  });
  it("survives a throwing storage", () => {
    expect(isE2eMode("development", { getItem: () => { throw new Error("blocked"); } })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  SAVE_STORAGE_KEYS,
  clearAllSaves,
  wantsSaveReset,
} from "../apps/client/lib/saveReset";

describe("save reset", () => {
  it("removes every progress key and nothing else", () => {
    const store = new Map<string, string>([
      ...SAVE_STORAGE_KEYS.map((key) => [key, "x"] as [string, string]),
      ["unrelated", "keep"],
    ]);
    clearAllSaves({ removeItem: (key) => void store.delete(key) });
    expect([...store.keys()]).toEqual(["unrelated"]);
  });

  it("detects the ?reset=1 URL flag", () => {
    expect(wantsSaveReset("?reset=1")).toBe(true);
    expect(wantsSaveReset("?reset=0")).toBe(false);
    expect(wantsSaveReset("")).toBe(false);
  });
});

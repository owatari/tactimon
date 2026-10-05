import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_OPTIONS,
  effectiveMusicVolume,
  normalizeGameOptions,
} from "../apps/client/lib/options";

describe("game options", () => {
  it("falls back to defaults for missing or corrupt data", () => {
    expect(normalizeGameOptions(undefined)).toEqual(DEFAULT_GAME_OPTIONS);
    expect(normalizeGameOptions("x")).toEqual(DEFAULT_GAME_OPTIONS);
    expect(normalizeGameOptions({ musicVolume: "loud" })).toEqual(DEFAULT_GAME_OPTIONS);
  });

  it("clamps and snaps the music volume", () => {
    expect(normalizeGameOptions({ musicVolume: 999 }).musicVolume).toBe(100);
    expect(normalizeGameOptions({ musicVolume: -5 }).musicVolume).toBe(0);
    expect(normalizeGameOptions({ musicVolume: 44 }).musicVolume).toBe(40);
  });

  it("only accepts battle speed 1 or 2", () => {
    expect(normalizeGameOptions({ battleSpeed: 2 }).battleSpeed).toBe(2);
    expect(normalizeGameOptions({ battleSpeed: 7 }).battleSpeed).toBe(1);
  });

  it("mutes the music regardless of volume", () => {
    expect(effectiveMusicVolume({ ...DEFAULT_GAME_OPTIONS, musicMuted: true })).toBe(0);
    expect(effectiveMusicVolume({ ...DEFAULT_GAME_OPTIONS, musicVolume: 50 })).toBe(0.5);
  });
});

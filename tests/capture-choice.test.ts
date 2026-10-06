import { describe, expect, it } from "vitest";
import { createPokemonProgression, rollPersonality } from "../packages/battle-engine/src";
import { captureRoster, holdCapturedPokemon, resolvePendingCapture } from "../apps/client/lib/captureChoice";
import { pokemonDisplayName } from "../apps/client/lib/pokemonName";
import { chooseStarter, normalizeStoryState, POKEMON_STORAGE_CAPACITY, type CapturedPokemon } from "../apps/client/lib/story";
import { parseStorySave, serializeStorySave } from "../apps/client/lib/storyPersistence";

const mon = (species: string, level = 8) =>
  ({ ...createPokemonProgression(species as never, level, rollPersonality()), species }) as CapturedPokemon;

function withParty(count: number) {
  const base = chooseStarter("charmander");
  return normalizeStoryState({
    ...base,
    capturedPokemon: Array.from({ length: count }, (_, i) => mon(["pidgey", "rattata", "caterpie", "weedle", "spearow"][i])),
  } as never);
}

describe("capture choice", () => {
  it("holds a catch, and the held catch survives a save round trip", () => {
    const held = holdCapturedPokemon(withParty(1), mon("pikachu"));
    expect(held.capturedPokemon).toHaveLength(1);
    const loaded = parseStorySave(serializeStorySave(held))!;
    expect(loaded.pendingCapture?.species).toBe("pikachu");
    expect(loaded.pendingCapture?.nature).toBe(held.pendingCapture?.nature);
  });

  it("send to team with room appends, names and clears the pending catch", () => {
    const held = holdCapturedPokemon(withParty(2), mon("pikachu"));
    const result = resolvePendingCapture(held, { destination: "team", nickname: "  Zap  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.story.pendingCapture).toBeNull();
    expect(result.story.capturedPokemon).toHaveLength(3);
    expect(result.story.capturedPokemon[2]).toMatchObject({ species: "pikachu", nickname: "Zap" });
    expect(pokemonDisplayName(result.story.capturedPokemon[2])).toBe("Zap");
    expect(pokemonDisplayName(result.story.capturedPokemon[0])).not.toBe("");
  });

  it("an empty or too long nickname falls back to the species / 10 characters", () => {
    const held = holdCapturedPokemon(withParty(0), mon("pikachu"));
    const empty = resolvePendingCapture(held, { destination: "team", nickname: "   " });
    expect(empty.ok && empty.story.capturedPokemon[0].nickname).toBeFalsy();
    const long = resolvePendingCapture(held, { destination: "team", nickname: "Supercalifragilistic" });
    expect(long.ok && long.story.capturedPokemon[0].nickname).toBe("Supercalif");
  });

  it("send to box deposits and leaves the team untouched", () => {
    const held = holdCapturedPokemon(withParty(5), mon("pikachu"));
    const result = resolvePendingCapture(held, { destination: "box" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.story.boxedPokemon.map((p) => p.species)).toEqual(["pikachu"]);
    expect(result.story.capturedPokemon).toHaveLength(5);
  });

  it("a full team needs a swap: the chosen companion goes to the box", () => {
    const held = holdCapturedPokemon(withParty(5), mon("pikachu"));
    expect(resolvePendingCapture(held, { destination: "team" })).toEqual({ ok: false, reason: "swap-required" });
    expect(resolvePendingCapture(held, { destination: "team", swapIndex: 9 })).toEqual({ ok: false, reason: "invalid-swap" });
    const result = resolvePendingCapture(held, { destination: "team", swapIndex: 1, nickname: "Bolt" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.story.capturedPokemon.map((p) => p.species)).toEqual(["pidgey", "caterpie", "weedle", "spearow", "pikachu"]);
    expect(result.story.boxedPokemon.map((p) => p.species)).toEqual(["rattata"]);
  });

  it("a full box refuses the box, and the pending catch is kept", () => {
    const base = withParty(5);
    const full = { ...base, boxedPokemon: Array.from({ length: POKEMON_STORAGE_CAPACITY }, () => mon("rattata")) };
    const held = holdCapturedPokemon(full, mon("pikachu"));
    expect(captureRoster(held)).toEqual({ teamHasRoom: false, boxHasRoom: false });
    expect(resolvePendingCapture(held, { destination: "box" })).toEqual({ ok: false, reason: "box-full" });
    expect(resolvePendingCapture(held, { destination: "team", swapIndex: 0 })).toEqual({ ok: false, reason: "box-full" });
    expect(held.pendingCapture?.species).toBe("pikachu");
  });

  it("does nothing without a pending catch", () => {
    expect(resolvePendingCapture(withParty(1), { destination: "team" })).toEqual({ ok: false, reason: "no-pending" });
  });
});

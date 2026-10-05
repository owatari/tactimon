import { afterEach, describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import { setLocale } from "../apps/client/lib/i18n";
import { resolveBlockedPlayerTileGate } from "../apps/client/lib/playerWorldGates";
import {
  grantStoryKeyItemOnce,
  normalizeStoryState,
} from "../apps/client/lib/story";

const walker = () =>
  normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("bulbasaur", 20),
  });

afterEach(() => setLocale("en", false));

describe("Cycling Road", () => {
  it("lets only bicycles through the Route 16 and Route 18 gate halls", () => {
    for (const [mapId, x, y] of [
      ["route-16-north-entrance-1f", 6, 12],
      ["route-18-east-entrance-1f", 6, 6],
    ] as const) {
      expect(resolveBlockedPlayerTileGate(walker(), mapId, x, y)).not.toBeNull();
      const rider = grantStoryKeyItemOnce(walker(), "bicycle").story;
      expect(resolveBlockedPlayerTileGate(rider, mapId, x, y)).toBeNull();
    }
    // The upper (pedestrian) hall stays open.
    expect(
      resolveBlockedPlayerTileGate(walker(), "route-16-north-entrance-1f", 6, 3),
    ).toBeNull();
  });

  it("explains itself in the player's language", () => {
    const gate = resolveBlockedPlayerTileGate(
      walker(),
      "route-16-north-entrance-1f",
      6,
      12,
    )!;
    const text = (locale: Parameters<typeof setLocale>[0]) => {
      setLocale(locale, false);
      return runDialogueInteraction(walker(), gate.blockedRequest).presentation
        .pages[0].text;
    };
    expect(text("en")).toContain("Cycling Road");
    expect(text("pt")).toContain("Bicicleta");
    expect(text("es")).toContain("Bicicleta");
    expect(text("fr")).toContain("Vélo");
    expect(text("zh")).toContain("自行车");
  });
});

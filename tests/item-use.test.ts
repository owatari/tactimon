import { describe, expect, it } from "vitest";
import {
  calculateDuelPokemonStats,
  createPokemonProgression,
} from "../packages/battle-engine/src";
import {
  REPEL_STEPS,
  isFieldUsableItem,
  itemNeedsMoveTarget,
  applyBattleInventory,
  repelBlocksEncounter,
  toBattleInventory,
  useBagItem,
} from "../apps/client/lib/itemUse";
import {
  applyStoryOverworldStep,
  normalizeStoryState,
  type CapturedPokemon,
  type StoryState,
} from "../apps/client/lib/story";

function story(extra: Partial<StoryState> = {}): StoryState {
  return normalizeStoryState({
    starter: "bulbasaur",
    playerPokemon: createPokemonProgression("bulbasaur", 10),
    capturedPokemon: [
      createPokemonProgression("rattata", 4),
    ] as CapturedPokemon[],
    inventory: { potion: 2, "poke-ball": 5 },
    bagItems: {
      "super-potion": 1,
      antidote: 1,
      revive: 1,
      ether: 1,
      elixir: 1,
      "rare-candy": 2,
      repel: 1,
    },
    ...extra,
  });
}

function hurt(base: StoryState, hp: number): StoryState {
  return {
    ...base,
    playerPokemon: { ...base.playerPokemon!, currentHp: hp },
  };
}

describe("field item use", () => {
  it("heals without overhealing and consumes one item", () => {
    const base = hurt(story(), 5);
    const result = useBagItem(base, "potion", 0);
    expect(result.accepted).toBe(true);
    expect(result.story.playerPokemon!.currentHp).toBe(25);
    expect(result.story.inventory.potion).toBe(1);

    const max = calculateDuelPokemonStats(base.playerPokemon!).hp;
    const near = hurt(story(), max - 3);
    expect(useBagItem(near, "super-potion", 0).story.playerPokemon!.currentHp).toBe(max);
  });

  it("does not consume items that would have no effect", () => {
    const full = story();
    const result = useBagItem(full, "potion", 0);
    expect(result.accepted).toBe(false);
    expect(result.story.inventory.potion).toBe(2);
    expect(useBagItem(full, "antidote", 0).accepted).toBe(false);
  });

  it("cures only the matching status", () => {
    const poisoned = {
      ...story(),
      playerPokemon: { ...story().playerPokemon!, status: "poison" as const },
    };
    const result = useBagItem(poisoned, "antidote", 0);
    expect(result.accepted).toBe(true);
    expect(result.story.playerPokemon!.status).toBeNull();
    expect(result.story.bagItems?.antidote).toBeUndefined();
  });

  it("revives fainted Pokémon with half HP", () => {
    const fainted = hurt(story(), 0);
    expect(useBagItem(fainted, "potion", 0).accepted).toBe(false);
    const result = useBagItem(fainted, "revive", 0);
    const max = calculateDuelPokemonStats(fainted.playerPokemon!).hp;
    expect(result.story.playerPokemon!.currentHp).toBe(Math.floor(max / 2));
  });

  it("restores PP for one move or all moves", () => {
    const base = story();
    const [first, second] = base.playerPokemon!.activeMoves;
    const used = {
      ...base,
      playerPokemon: {
        ...base.playerPokemon!,
        movePp: { ...base.playerPokemon!.movePp, [first]: 1, [second]: 1 },
      },
    };
    expect(itemNeedsMoveTarget("ether")).toBe(true);
    const ether = useBagItem(used, "ether", 0, 0);
    expect(ether.story.playerPokemon!.movePp[first]).toBeGreaterThan(1);
    expect(ether.story.playerPokemon!.movePp[second]).toBe(1);

    const elixir = useBagItem(used, "elixir", 0);
    expect(elixir.story.playerPokemon!.movePp[second]).toBeGreaterThan(1);
  });

  it("Rare Candy grants one level", () => {
    const result = useBagItem(story(), "rare-candy", 0);
    expect(result.story.playerPokemon!.level).toBe(11);
    expect(result.reward?.levelsGained).toBe(1);
    expect(result.story.bagItems?.["rare-candy"]).toBe(1);
  });

  it("targets captured Pokémon by party slot", () => {
    const base = story();
    const hurtCaptured = {
      ...base,
      capturedPokemon: [{ ...base.capturedPokemon[0], currentHp: 1 }],
    };
    const result = useBagItem(hurtCaptured, "potion", 1);
    expect(result.story.capturedPokemon[0].species).toBe("rattata");
    expect(result.story.capturedPokemon[0].currentHp).toBeGreaterThan(1);
  });

  it("only exposes supported field items", () => {
    expect(isFieldUsableItem("repel")).toBe(true);
    expect(isFieldUsableItem("escape-rope")).toBe(false);
    expect(isFieldUsableItem("moon-stone")).toBe(true);
    expect(isFieldUsableItem("star-piece")).toBe(false);
  });
});

describe("Repel", () => {
  it("lasts 100 steps and blocks weaker wild packs only", () => {
    const used = useBagItem(story(), "repel", 0);
    expect(used.story.repelSteps).toBe(REPEL_STEPS);
    expect(useBagItem(used.story, "repel", 0).accepted).toBe(false);

    expect(repelBlocksEncounter(used.story, [{ level: 5 }, { level: 9 }])).toBe(true);
    expect(repelBlocksEncounter(used.story, [{ level: 12 }])).toBe(false);
    expect(repelBlocksEncounter(story(), [{ level: 2 }])).toBe(false);

    let walking = used.story;
    for (let i = 0; i < REPEL_STEPS; i += 1) {
      walking = applyStoryOverworldStep(walking);
    }
    expect(walking.repelSteps).toBe(0);
  });
});

describe("battle bag", () => {
  it("merges usable Bag items into the battle inventory and writes counts back", () => {
    const base = story();
    const battle = toBattleInventory(base);
    expect(battle["super-potion"]).toBe(1);
    expect(battle.antidote).toBe(1);
    expect(battle.revive).toBeUndefined();

    const after = applyBattleInventory(base, {
      ...battle,
      potion: 1,
      antidote: 0,
    });
    expect(after.inventory).toEqual({ potion: 1, "poke-ball": 5 });
    expect(after.bagItems?.antidote).toBeUndefined();
    expect(after.bagItems?.["super-potion"]).toBe(1);
    expect(after.bagItems?.revive).toBe(1);
  });
});

describe("evolution stones and generated evolutions", () => {
  it("evolves Growlithe with a Fire Stone and refuses other species", () => {
    const base = normalizeStoryState({
      starter: "bulbasaur",
      playerPokemon: createPokemonProgression("growlithe", 20),
      bagItems: { "fire-stone": 1, "leaf-stone": 1 },
    });
    expect(useBagItem(base, "leaf-stone", 0).accepted).toBe(false);
    const result = useBagItem(base, "fire-stone", 0);
    expect(result.accepted).toBe(true);
    expect(result.story.playerPokemon!.species).toBe("arcanine");
    expect(result.story.bagItems?.["fire-stone"]).toBeUndefined();
    expect(result.story.bagItems?.["leaf-stone"]).toBe(1);
  });

  it("levels Nidoran♀ into Nidorina at 16 and Kadabra into Alakazam at 37", async () => {
    const { grantRareCandy } = await import("../packages/battle-engine/src");
    let nido = createPokemonProgression("nidoran-f", 15);
    nido = grantRareCandy(nido)!.progression;
    expect(nido.species).toBe("nidorina");
    let kadabra = createPokemonProgression("kadabra", 36);
    kadabra = grantRareCandy(kadabra)!.progression;
    expect(kadabra.species).toBe("alakazam");
  });
});

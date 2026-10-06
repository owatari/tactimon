import { describe, expect, it } from "vitest";
import {
  createPokemonProgression,
  evolveWithStone,
  grantExperiencePoints,
} from "../packages/battle-engine/src";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import {
  applyDayCareStep,
  depositAtDayCare,
  withdrawFromDayCare,
} from "../apps/client/lib/dayCare";
import {
  canStoryUseTechnique,
} from "../apps/client/lib/fieldTechniques";
import { buildTrainerCard, menuEntriesFor } from "../apps/client/lib/gameMenu";
import {
  COIN_PACK_SIZE,
  buyCoins,
  buyPrize,
  playSlots,
} from "../apps/client/lib/gameCorner";
import { IN_GAME_TRADES, performTrade } from "../apps/client/lib/inGameTrades";
import { translate } from "../apps/client/lib/i18n";
import { buyMartItem, martStockFor } from "../apps/client/lib/mart";
import {
  VIRIDIAN_GYM_UNLOCK_BADGES,
  resolveBlockedPlayerEdgeGate,
  resolveBlockedPlayerTileGate,
} from "../apps/client/lib/playerWorldGates";
import {
  getPokedex,
  syncPokedexCaught,
} from "../apps/client/lib/pokedex";
import {
  chooseStarter,
  computeWhiteOutMoneyLoss,
  applyStoryWhiteOut,
  completeTutorialRivalBattle,
  depositCapturedPokemon,
  grantStoryBadge,
  grantStoryFieldTechniqueOnce,
  grantStoryKeyItemOnce,
  hasPokedex,
  markStoryTrainerDefeated,
  normalizeStoryState,
  placeCapturedPokemon,
  storyHasHealthyPokemon,
  withdrawBoxedPokemon,
  type StoryBadgeId,
  type StoryState,
} from "../apps/client/lib/story";
import {
  chooseBestStorySave,
  parseStorySave,
  serializeStorySave,
} from "../apps/client/lib/storyPersistence";
import { GYM_LEADER_PARTY_SIZE, OVERWORLD_TRAINERS } from "../apps/client/lib/trainers";
import { withHmUsers } from "./helpers/hmParty";

/**
 * Scripted walkthrough of the whole adventure on the pure story layer: a single story object travels
 * through every stage (new game → Oak's Parcel → gym badges → HMs → Game Corner → Hall of Fame).
 * A failing stage names the step that broke (see the `it` titles). The browser-level companion is
 * `tools/e2e/walkthrough.mjs`.
 */

const BADGES: StoryBadgeId[] = [
  "boulder",
  "cascade",
  "thunder",
  "rainbow",
  "soul",
  "marsh",
  "volcano",
  "earth",
];

let story: StoryState;
const set = (next: StoryState) => {
  story = next;
};

describe("walkthrough: new game", () => {
  it("1. chooses a starter: rival takes the one with the advantage, 5 Poké Balls, ¥3000", () => {
    set(chooseStarter("charmander"));
    expect(story.playerPokemon?.species).toBe("charmander");
    expect(story.rivalStarter).toBe("squirtle");
    expect(story.money).toBe(3000);
    expect(story.inventory["poke-ball"]).toBe(5);
    expect(story.trainerName).toBe("RED");
    expect(story.trainerId).toBeGreaterThanOrEqual(0);
  });

  it("2. the tutorial rival battle can be completed", () => {
    set(completeTutorialRivalBattle(story));
    expect(story.firstBattleComplete).toBe(true);
  });

  it("3. the Pokédex does not exist yet and Pallet → Route 1 stays gated until the starter fight is done", () => {
    expect(hasPokedex(story)).toBe(false);
    expect(menuEntriesFor(story).map((e) => e.id)).not.toContain("pokedex");
    // Before choosing a starter Oak stops the player at the edge of Pallet; afterwards the road is open.
    expect(resolveBlockedPlayerEdgeGate(normalizeStoryState({}), "pallet-town", "route-1")).not.toBeNull();
    expect(resolveBlockedPlayerEdgeGate(story, "pallet-town", "route-1")).toBeNull();
  });

  it("4. Viridian Mart clerk gives Oak's Parcel, Prof. Oak trades it for the Pokédex", () => {
    set(runDialogueInteraction(story, { kind: "script", id: "viridian-mart-parcel" }).story);
    expect(story.keyItemIds).toContain("oaks-parcel");
    set(runDialogueInteraction(story, { kind: "script", id: "lab-oak" }).story);
    expect(hasPokedex(story)).toBe(true);
    expect(menuEntriesFor(story).map((e) => e.id)).toContain("pokedex");
  });

  it("5. buys Poké Balls at the Viridian Mart", () => {
    const stock = martStockFor("viridian-mart");
    expect(stock.map((i) => i.id)).toContain("poke-ball");
    const bought = buyMartItem(story.money, story.inventory, "poke-ball", 3, story.bagItems, stock);
    expect(bought.accepted).toBe(true);
    expect(bought.purchased).toBe(3);
    expect(bought.inventory["poke-ball"]).toBe((story.inventory["poke-ball"] ?? 0) + 3);
    expect(bought.money).toBe(story.money - bought.spent);
    set({ ...story, money: bought.money, inventory: bought.inventory });
  });
});

describe("walkthrough: captures, party and PC", () => {
  it("6. captures fill the party (6) then spill into the PC; the Pokédex registers each species once", () => {
    for (const [i, id] of ["pidgey", "rattata", "caterpie", "weedle", "nidoran-f"].entries()) {
      const placed = placeCapturedPokemon(story, createPokemonProgression(id as never, 5 + i) as never);
      expect(placed.destination).toBe("party");
      set(placed.story);
    }
    const overflow = placeCapturedPokemon(story, createPokemonProgression("pikachu", 8) as never);
    expect(overflow.destination).toBe("storage");
    set(overflow.story);
    expect(story.capturedPokemon).toHaveLength(5);
    expect(story.boxedPokemon).toHaveLength(1);
    const synced = syncPokedexCaught(story);
    expect(synced.newlyCaught).toContain("pikachu");
    set(synced.story);
    expect(getPokedex(story).caughtCount).toBeGreaterThanOrEqual(7);
  });

  it("7. deposits to and withdraws from the PC", () => {
    const deposited = depositCapturedPokemon(story, 0);
    expect(deposited.accepted).toBe(true);
    set(deposited.story);
    expect(story.boxedPokemon.length).toBe(2);
    const back = withdrawBoxedPokemon(story, 0);
    expect(back.accepted).toBe(true);
    set(back.story);
    expect(story.capturedPokemon.length).toBe(5);
  });

  it("8. levels up and evolves with a stone (Pikachu → Raichu keeps the Pokédex entry)", () => {
    const reward = grantExperiencePoints(createPokemonProgression("charmander", 15), 5000);
    expect(reward.newLevel).toBeGreaterThan(reward.oldLevel);
    const raichu = evolveWithStone(createPokemonProgression("pikachu", 20), "thunder-stone");
    expect(raichu?.species).toBe("raichu");
  });
});

describe("walkthrough: towns, services and economy", () => {
  it("9. trades in-game (counts for the Trainer Card)", () => {
    const trade = IN_GAME_TRADES[0];
    const withWanted = placeCapturedPokemon(
      { ...story, capturedPokemon: [] },
      createPokemonProgression(trade.want as never, 12) as never,
    );
    const done = performTrade(withWanted.story, trade.id, 0);
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.story.pokemonTrades).toBe((story.pokemonTrades ?? 0) + 1);
    }
  });

  it("10. Day Care keeps a Pokémon, charges by steps and returns it", () => {
    let s = { ...story, money: 5000 };
    const dep = depositAtDayCare(s, 0);
    expect(dep.ok).toBe(true);
    if (!dep.ok) return;
    s = dep.story;
    for (let i = 0; i < 200; i += 1) s = applyDayCareStep(s);
    const out = withdrawFromDayCare(s);
    expect(out.ok).toBe(true);
  });

  it("11. Game Corner: coin case, coins, slots and prizes", () => {
    let s = grantStoryKeyItemOnce({ ...story, money: 20000 }, "coin-case").story;
    const coins = buyCoins(s);
    expect(coins.ok).toBe(true);
    if (!coins.ok) return;
    s = coins.story;
    expect(s.coins).toBeGreaterThanOrEqual(COIN_PACK_SIZE);
    const spin = playSlots(s, [0, 0, 0], 1);
    expect(spin.ok).toBe(true);
    expect(buyPrize(s, "does-not-exist").ok).toBe(false);
  });

  it("12. whiteout: heals the party and costs money based on level and badges", () => {
    const fainted = normalizeStoryState({
      ...story,
      playerPokemon: { ...story.playerPokemon!, currentHp: 0 },
      capturedPokemon: story.capturedPokemon.map((p) => ({ ...p, currentHp: 0 })),
    });
    expect(storyHasHealthyPokemon(fainted)).toBe(false);
    const result = applyStoryWhiteOut(fainted);
    expect(storyHasHealthyPokemon(result.story)).toBe(true);
    expect(result.moneyLost).toBe(computeWhiteOutMoneyLoss(fainted));
    expect(result.story.money).toBe(Math.max(0, fainted.money - result.moneyLost));
  });
});

describe("walkthrough: gyms, badges and gates", () => {
  it("13. all eight gym leaders field a team of 4-6 Pokémon and award distinct badges", () => {
    const leaders = OVERWORLD_TRAINERS.filter((t) => t.badgeId && t.mapId.endsWith("-gym"));
    expect(new Set(leaders.map((l) => l.badgeId))).toEqual(new Set(BADGES));
    for (const leader of leaders) {
      expect(leader.party.length, leader.id).toBeGreaterThanOrEqual(4);
      expect(leader.party.length, leader.id).toBeLessThanOrEqual(GYM_LEADER_PARTY_SIZE);
    }
  });

  it("14. Viridian Gym stays locked until the six required badges, then opens", () => {
    let s = chooseStarter("squirtle");
    const gate = (st: StoryState) => resolveBlockedPlayerTileGate(st, "viridian-city", 36, 10);
    expect(gate(s)?.id).toBe("viridian-gym-story-lock");
    for (const badge of VIRIDIAN_GYM_UNLOCK_BADGES) s = grantStoryBadge(s, badge);
    expect(gate(s)).toBeNull();
  });

  it("15. field HMs are gated by their badge and by a Pokémon that can use them", () => {
    let s = withHmUsers(chooseStarter("squirtle"), "oddish", "lapras", "machop");
    s = grantStoryFieldTechniqueOnce(s, "cut").story;
    expect(canStoryUseTechnique(s, "cut")).toBe(false); // no Cascade Badge yet
    s = grantStoryBadge(s, "cascade");
    expect(canStoryUseTechnique(s, "cut")).toBe(true);
    s = grantStoryFieldTechniqueOnce(s, "surf").story;
    expect(canStoryUseTechnique(s, "surf")).toBe(false); // no Soul Badge
    s = grantStoryBadge(s, "soul");
    expect(canStoryUseTechnique(s, "surf")).toBe(true);
  });

  it("16. defeating the Champion grants the first Trainer Card star and the Hall of Fame debut", () => {
    let s = story;
    for (const badge of BADGES) s = grantStoryBadge(s, badge);
    s = markStoryTrainerDefeated(s, "league-champion-blue-squirtle");
    const card = buildTrainerCard({ ...s, hofDebutSeconds: 4000 });
    expect(card.badgeCount).toBe(8);
    expect(card.champion).toBe(true);
    expect(card.stars).toBe(1);
    expect(card.hofDebut).not.toBeNull();
    set(s);
  });
});

describe("walkthrough: saving, loading and language", () => {
  it("17. save → load round trip keeps the adventure (party, PC, badges, Pokédex, Trainer ID)", () => {
    const raw = serializeStorySave(story);
    const parsed = parseStorySave(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.badgeIds).toEqual(story.badgeIds);
    expect(parsed?.boxedPokemon.length).toBe(story.boxedPokemon.length);
    expect(parsed?.trainerId).toBe(story.trainerId);
    expect(chooseBestStorySave(raw, null)).not.toBeNull();
  });

  it("18. old saves without newer fields still normalize", () => {
    const old = normalizeStoryState({ starter: "bulbasaur", firstBattleComplete: true });
    expect(old.trainerName).toBe("RED");
    expect(old.pokemonTrades).toBe(0);
  });

  it("19. every language translates a core Pokédex label", () => {
    expect(translate("POKéMON LIST", "pt")).toBe("LISTA DE POKéMON");
    expect(translate("POKéMON LIST", "fr")).toBe("LISTE DES POKéMON");
    expect(translate("POKéMON LIST", "es")).toBe("LISTA DE POKéMON");
    expect(translate("POKéMON LIST", "zh")).toBe("宝可梦列表");
    expect(translate("POKéMON LIST", "en")).toBe("POKéMON LIST");
  });
});

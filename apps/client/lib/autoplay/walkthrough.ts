import { calculateDuelPokemonMaxHp } from "@tactimon/battle-engine";
import { getStoryPlayerChoice, hasStoryPlayerEvent } from "../story";
import { townVisitedEventId } from "../townMap";
import { OVERWORLD_TRAINERS } from "../trainers";
import { VERMILION_GYM_TRASH_CANS, isVermilionGymLocksOpen } from "../vermilionGym";
import type { StoryBadgeId, StoryFieldTechniqueId, StoryKeyItemId, StoryState } from "../story";
import type { Step, Task } from "./director";

/**
 * The route the Auto Player follows: Bulbapedia / GuideStrats' FireRed & LeafGreen walkthrough, adapted
 * to this game (our maps, our trainer teams, the NPC events we rebuilt). Each step names the goal it
 * reaches (`done`, read from the save, so a step is skipped when it is already true) and the tasks
 * that get there. Everything between the steps (wild fights, healing, shopping, levelling) is the
 * bot's own housekeeping.
 */

const key = (id: StoryKeyItemId) => (story: StoryState) => (story.keyItemIds ?? []).includes(id);
const badge = (id: StoryBadgeId) => (story: StoryState) => story.badgeIds.includes(id);
const technique = (id: StoryFieldTechniqueId) => (story: StoryState) => (story.fieldTechniqueIds ?? []).includes(id);
const trainer = (id: string) => (story: StoryState) => story.defeatedTrainerIds.includes(id);
const event = (namespace: "story" | "reward" | "obstacle" | "pickup" | "trainer" | "key-item", id: string) => (story: StoryState) =>
  hasStoryPlayerEvent(story, namespace, id);
const visited = (mapId: string) => (story: StoryState) => hasStoryPlayerEvent(story, "story", townVisitedEventId(mapId));
/** The Pokédex was handed over (not the looser `hasPokedex`, which a first catch also satisfies). */
const pokedexGiven = (story: StoryState) => hasStoryPlayerEvent(story, "story", "pokedex-received");
const all = (...checks: ((story: StoryState) => boolean)[]) => (story: StoryState) => checks.every((check) => check(story));

/** Highest level on a gym leader's team: the level the lead should reach before the fight. */
export function levelFor(trainerId: string, margin = 2): number {
  const found = OVERWORLD_TRAINERS.find((entry) => entry.id === trainerId);
  return Math.max(...(found?.party.map((member) => member.level) ?? [10])) + margin;
}

const go = (map: string, x?: number, y?: number): Task => ({ k: "goto", map, ...(x !== undefined ? { x, y } : {}) });
const explore = (map: string): Task => ({ k: "explore", map });
const grind = (map: string, level: number): Task => ({ k: "grind", map, level });
const heal: Task = { k: "heal" };

export const WALKTHROUGH: readonly Step[] = [
  // ── Part 1: Pallet Town, Route 1, Viridian City ───────────────────────────────────────────────
  {
    id: "starter",
    title: "Walk north out of Pallet: Oak stops you and you pick a starter",
    done: (story) => Boolean(story.starter),
    tasks: [{ k: "goto", map: "pallet-town", x: 12, y: 1, orMap: "oak-lab" }, explore("oak-lab")],
  },
  {
    id: "rival-lab",
    title: "Battle the rival in Oak's lab",
    done: (story) => story.firstBattleComplete,
    tasks: [explore("oak-lab")],
  },
  {
    id: "parcel",
    title: "Viridian Poké Mart: collect Oak's Parcel",
    done: (story) => key("oaks-parcel")(story) || pokedexGiven(story),
    tasks: [go("viridian-mart"), explore("viridian-mart")],
  },
  {
    id: "pokedex",
    title: "Deliver the parcel to Oak: Pokédex and Poké Balls",
    done: pokedexGiven,
    tasks: [go("oak-lab"), explore("oak-lab")],
  },
  {
    id: "town-map",
    title: "Rival's sister gives the Town Map",
    done: key("town-map"),
    tasks: [go("pallet-rivals-house"), explore("pallet-rivals-house")],
  },
  // ── Part 2-3: Route 22, Viridian Forest, Pewter City, Brock ───────────────────────────────────
  {
    id: "brock",
    title: "Train, then beat Brock for the Boulder Badge",
    done: badge("boulder"),
    tasks: [
      go("viridian-mart"),
      explore("viridian-mart"),
      grind("route-2", levelFor("pewter-brock")),
      heal,
      go("pewter-gym"),
      explore("pewter-gym"),
    ],
  },
  // ── Part 3-4: Route 3, Mt. Moon, Cerulean City, Misty ──────────────────────────────────────────
  {
    id: "running-shoes",
    title: "Route 3: Oak's aide hands over the Running Shoes",
    done: (story) => story.runningShoesReceived === true,
    tasks: [go("route-3"), explore("route-3")],
  },
  {
    id: "mt-moon-fossil",
    title: "Mt. Moon: beat the Super Nerd and take a fossil",
    done: (story) => Boolean(story.mtMoonFossil),
    tasks: [go("mt-moon-b2f"), explore("mt-moon-b2f")],
  },
  {
    id: "cerulean",
    title: "Out of Mt. Moon and into Cerulean City",
    done: visited("cerulean-city"),
    tasks: [go("cerulean-city")],
  },
  {
    id: "misty",
    title: "Train, then beat Misty for the Cascade Badge",
    done: badge("cascade"),
    tasks: [grind("route-4", levelFor("cerulean-misty")), heal, go("cerulean-gym"), explore("cerulean-gym")],
  },
  // ── Part 5-6: Nugget Bridge, Bill, Vermilion, S.S. Anne, Lt. Surge ────────────────────────────
  {
    id: "bill",
    title: "Nugget Bridge, Route 25 and Bill: the S.S. Anne ticket",
    done: key("ss-ticket"),
    tasks: [
      go("route-24"),
      explore("route-24"),
      go("route-25"),
      explore("route-25"),
      go("sea-cottage"),
      explore("sea-cottage"),
      { k: "interact", map: "sea-cottage", at: [4, 5] },
      explore("sea-cottage"),
    ],
  },
  {
    id: "vermilion",
    title: "Underground Path to Vermilion City",
    done: visited("vermilion-city"),
    tasks: [go("vermilion-city")],
  },
  {
    id: "ss-anne",
    title: "S.S. Anne: the rival, then the captain's HM01 Cut",
    done: technique("cut"),
    tasks: [go("ss-anne-captains-office"), explore("ss-anne-captains-office")],
  },
  {
    id: "surge",
    title: "Train, flip the two trash-can switches and beat Lt. Surge",
    done: badge("thunder"),
    tasks: [
      grind("route-6", levelFor("vermilion-lt-surge")),
      heal,
      go("vermilion-gym"),
      {
        k: "dyn",
        label: "trash cans",
        make: (story) => {
          if (isVermilionGymLocksOpen(story)) return null;
          const first = getStoryPlayerChoice(story, "vermilion-gym-switch-one");
          const second = getStoryPlayerChoice(story, "vermilion-gym-switch-two");
          const found = getStoryPlayerChoice(story, "vermilion-gym-first-switch");
          // Nothing assigned yet: any can starts the puzzle. Then the first switch, then its neighbour.
          const target = !first ? "vermilion-gym-trash-1" : found === first ? second : first;
          const can = VERMILION_GYM_TRASH_CANS.find((entry) => entry.id === target);
          return can ? { k: "talk", map: "vermilion-gym", at: [can.x, can.y] } : null;
        },
      },
      explore("vermilion-gym"),
    ],
  },
];

/** Max HP helper shared with the runtime (kept here so tests can use it without the engine). */
export const maxHp = calculateDuelPokemonMaxHp;

export { all, event, visited };

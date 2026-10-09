import {
  DUEL_MOVES,
  POKEMON_LEARNSETS,
  catchRateFor,
  evYieldFor,
  isDuelSpeciesId,
  speciesEvolutions,
  type DuelMoveId,
  type DuelSpeciesId,
} from "@tactimon/battle-engine";
import { tx } from "./i18n";
import { HM_MOVES, TM_COMPAT, TM_MOVES } from "./generated/tmCompat";
import { WORLD_MAPS } from "./maps";
import { WATER_ENCOUNTERS } from "./waterEncounters";
import { LAND_ENCOUNTERS } from "./wildEncounters";
import { POKEDEX_SPECIES } from "./pokedex";

export type DexMethod = "grass" | "cave" | "surf" | "old-rod" | "good-rod" | "super-rod";

export type DexLocation = {
  mapId: string;
  /** English map label (translate with t() when showing it). */
  label: string;
  method: DexMethod;
  minLevel: number;
  maxLevel: number;
  /** Chance (0-100) that an encounter of that kind in that map is this species. */
  percent: number;
};

type Slot = { species: string; level: number; weight: number };

function collect(
  out: Map<string, DexLocation[]>,
  mapId: string,
  method: DexMethod,
  slots: readonly Slot[],
) {
  const total = slots.reduce((sum, slot) => sum + slot.weight, 0);
  if (total <= 0) return;
  const bySpecies = new Map<string, Slot[]>();
  for (const slot of slots) bySpecies.set(slot.species, [...(bySpecies.get(slot.species) ?? []), slot]);
  const label = WORLD_MAPS[mapId]?.label ?? mapId;
  for (const [species, own] of bySpecies) {
    const levels = own.map((slot) => slot.level);
    const weight = own.reduce((sum, slot) => sum + slot.weight, 0);
    const entry: DexLocation = {
      mapId,
      label,
      method,
      minLevel: Math.min(...levels),
      maxLevel: Math.max(...levels),
      percent: Math.round((weight / total) * 100),
    };
    out.set(species, [...(out.get(species) ?? []), entry]);
  }
}

let locationIndex: Map<string, DexLocation[]> | null = null;

/** Every wild encounter table, turned around: species -> where it appears (land, caves, surf, rods). */
function buildLocationIndex(): Map<string, DexLocation[]> {
  const index = new Map<string, DexLocation[]>();
  for (const [mapId, table] of Object.entries(LAND_ENCOUNTERS)) {
    collect(index, mapId, table.terrain === "cave" ? "cave" : "grass", table.slots);
  }
  for (const [mapId, entry] of Object.entries(WATER_ENCOUNTERS)) {
    if (entry.surf) collect(index, mapId, "surf", entry.surf.slots);
    if (entry.fishing) {
      collect(index, mapId, "old-rod", entry.fishing.old);
      collect(index, mapId, "good-rod", entry.fishing.good);
      collect(index, mapId, "super-rod", entry.fishing.super);
    }
  }
  return index;
}

/** Where a species can be found in the wild, best chance first. */
export function speciesLocations(species: string): DexLocation[] {
  locationIndex ??= buildLocationIndex();
  return [...(locationIndex.get(species) ?? [])].sort(
    (a, b) => b.percent - a.percent || a.label.localeCompare(b.label),
  );
}

/** Gifts, prizes, fossils and one-off encounters of FireRed (not in the encounter tables). */
export const STATIC_SOURCES: Readonly<Record<string, readonly string[]>> = {
  bulbasaur: [tx("Starter: Prof. Oak's Lab")],
  charmander: [tx("Starter: Prof. Oak's Lab")],
  squirtle: [tx("Starter: Prof. Oak's Lab")],
  eevee: [tx("Gift: Celadon Mansion")],
  hitmonlee: [tx("Gift: Saffron Fighting Dojo (one of two)")],
  hitmonchan: [tx("Gift: Saffron Fighting Dojo (one of two)")],
  lapras: [tx("Gift: Silph Co. 7F")],
  snorlax: [tx("Static: Route 12 and Route 16")],
  magikarp: [tx("Sold: Route 4 Pokémon Center (₽500)")],
  omanyte: [tx("Fossil: Helix Fossil (Mt. Moon)")],
  kabuto: [tx("Fossil: Dome Fossil (Mt. Moon)")],
  aerodactyl: [tx("Fossil: Old Amber (Pewter Museum)")],
  abra: [tx("Prize: Celadon Game Corner")],
  clefairy: [tx("Prize: Celadon Game Corner")],
  pinsir: [tx("Prize: Celadon Game Corner")],
  dratini: [tx("Prize: Celadon Game Corner")],
  porygon: [tx("Prize: Celadon Game Corner")],
  farfetchd: [tx("In-game trade: Vermilion City")],
  lickitung: [tx("In-game trade: Route 18 gate")],
  "mr-mime": [tx("In-game trade: Route 2 gate")],
  jynx: [tx("In-game trade: Cerulean City")],
  electrode: [tx("Static: Power Plant")],
  articuno: [tx("Legendary raid (coming soon): Seafoam Islands")],
  zapdos: [tx("Legendary raid (coming soon): Power Plant")],
  moltres: [tx("Legendary raid (coming soon): Mt. Ember")],
  mewtwo: [tx("Legendary raid (coming soon): Cerulean Cave")],
  mew: [tx("Mythical raid (coming soon)")],
};

export function speciesStaticSources(species: string): readonly string[] {
  return STATIC_SOURCES[species] ?? [];
}

export type DexEvolutionStep = { species: string; how: { level: number } | { stone: string } };

/** What this species evolves into (level or stone). */
export function speciesEvolvesTo(species: string): DexEvolutionStep[] {
  if (!isDuelSpeciesId(species)) return [];
  const info = speciesEvolutions(species);
  const steps: DexEvolutionStep[] = [];
  if (info.level) steps.push({ species: info.level.species, how: { level: info.level.level } });
  for (const [stone, target] of Object.entries(info.stones)) steps.push({ species: target, how: { stone } });
  return steps;
}

/** The species it evolves from, if any. */
export function speciesEvolvesFrom(species: string): string | null {
  for (const id of POKEDEX_SPECIES) {
    if (speciesEvolvesTo(id).some((step) => step.species === species)) return id;
  }
  return null;
}

export type DexLearnedMove = { level: number; moveId: DuelMoveId };

/** Level-up moves in order (level 1 = starting moves). */
export function speciesLearnset(species: string): DexLearnedMove[] {
  if (!isDuelSpeciesId(species)) return [];
  return [...(POKEMON_LEARNSETS[species as DuelSpeciesId] ?? [])]
    .filter((entry) => DUEL_MOVES[entry.moveId])
    .sort((a, b) => a.level - b.level);
}

export type DexMachineMove = { kind: "TM" | "HM"; number: number; moveId: string };

/** TMs and HMs the species can learn, TM01.. then HM01.. */
export function speciesMachines(species: string): DexMachineMove[] {
  const compat = TM_COMPAT[species];
  if (!compat) return [];
  return [
    ...compat.tm.map((number) => ({ kind: "TM" as const, number, moveId: TM_MOVES[number - 1] })),
    ...compat.hm.map((number) => ({ kind: "HM" as const, number, moveId: HM_MOVES[number - 1] })),
  ];
}

export function speciesCatchRate(species: string): number {
  return catchRateFor(species);
}

export function speciesEvYield(species: string): Partial<Record<string, number>> {
  return isDuelSpeciesId(species) ? evYieldFor(species as DuelSpeciesId) : {};
}

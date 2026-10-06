import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WORLD_MAPS,
  resolveWarpTransitionAt,
} from "../apps/client/lib/maps";
import { OVERWORLD_TRAINERS } from "../apps/client/lib/trainers";
import { LAND_ENCOUNTERS } from "../apps/client/lib/wildEncounters";
import { WATER_ENCOUNTERS } from "../apps/client/lib/waterEncounters";
import { STATIC_WORLD_ENCOUNTERS } from "../apps/client/lib/staticEncounters";
import { IN_GAME_TRADES } from "../apps/client/lib/inGameTrades";
import { COIN_PRIZES } from "../apps/client/lib/gameCorner";
import { DUEL_MOVES } from "../packages/battle-engine/src/duel";

const PUBLIC = new URL("../apps/client/public/", import.meta.url);
const hasAssets = existsSync(
  new URL("game-assets/maps/pallet-town/layout.json", PUBLIC),
);
const SPECIES = JSON.parse(
  readFileSync(
    new URL("../packages/game-data/data/kanto-species.json", import.meta.url),
    "utf-8",
  ),
) as Record<string, { dex: number; evolutions: { to: string }[] }>;

type Layout = { width: number; height: number; cells: { collision: number }[] };
const layouts = new Map<string, Layout>();
function layoutOf(mapId: string): Layout {
  let l = layouts.get(mapId);
  if (!l) {
    l = JSON.parse(
      readFileSync(
        new URL(WORLD_MAPS[mapId].layoutUrl.replace(/^\//, ""), PUBLIC),
        "utf-8",
      ),
    ) as Layout;
    layouts.set(mapId, l);
  }
  return l;
}

describe.skipIf(!hasAssets)("content integrity", () => {
  it("every warp lands inside a registered map", () => {
    const bad: string[] = [];
    for (const id of Object.keys(WORLD_MAPS)) {
      const l = layoutOf(id);
      for (let y = 0; y < l.height; y++)
        for (let x = 0; x < l.width; x++) {
          const w = resolveWarpTransitionAt(id, x, y);
          if (!w) continue;
          const target = WORLD_MAPS[w.mapId];
          if (!target) {
            bad.push(`${id}:${x},${y} -> missing map ${w.mapId}`);
            continue;
          }
          const tl = layoutOf(w.mapId);
          if (w.spawn.x < 0 || w.spawn.y < 0 || w.spawn.x >= tl.width || w.spawn.y >= tl.height)
            bad.push(`${id}:${x},${y} -> ${w.mapId} spawn out of bounds`);
        }
    }
    expect(bad).toEqual([]);
  });

  it("every trainer is on a known map with valid species and moves", () => {
    const bad: string[] = [];
    for (const t of OVERWORLD_TRAINERS) {
      if (!WORLD_MAPS[t.mapId]) bad.push(`${t.id}: map ${t.mapId}`);
      if (t.party.length === 0) bad.push(`${t.id}: empty party`);
      for (const p of t.party) {
        if (!SPECIES[p.species]) bad.push(`${t.id}: species ${p.species}`);
        if (p.level < 1 || p.level > 100) bad.push(`${t.id}: level ${p.level}`);
        if (p.moves.length === 0) bad.push(`${t.id}: no moves`);
        for (const m of p.moves)
          if (!DUEL_MOVES[m]) bad.push(`${t.id}: move ${m}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every encounter table references known maps and species", () => {
    const bad: string[] = [];
    for (const [map, table] of Object.entries(LAND_ENCOUNTERS)) {
      if (!WORLD_MAPS[map]) bad.push(`land ${map}`);
      for (const s of table.slots)
        if (!SPECIES[s.species]) bad.push(`land ${map}: ${s.species}`);
    }
    for (const [map, entry] of Object.entries(WATER_ENCOUNTERS)) {
      if (!WORLD_MAPS[map]) bad.push(`water ${map}`);
      const slots = [
        ...(entry.surf?.slots ?? []),
        ...(entry.fishing?.old ?? []),
        ...(entry.fishing?.good ?? []),
        ...(entry.fishing?.super ?? []),
      ];
      for (const s of slots)
        if (!SPECIES[s.species]) bad.push(`water ${map}: ${s.species}`);
    }
    expect(bad).toEqual([]);
  });

  it("every Kanto species can be obtained somehow (or is an agreed exception)", () => {
    const got = new Set<string>();
    for (const t of Object.values(LAND_ENCOUNTERS)) t.slots.forEach((s) => got.add(s.species));
    for (const e of Object.values(WATER_ENCOUNTERS)) {
      [
        ...(e.surf?.slots ?? []),
        ...(e.fishing?.old ?? []),
        ...(e.fishing?.good ?? []),
        ...(e.fishing?.super ?? []),
      ].forEach((s) => got.add(s.species));
    }
    STATIC_WORLD_ENCOUNTERS.forEach((s) => got.add(s.species));
    IN_GAME_TRADES.forEach((t) => got.add(t.give));
    COIN_PRIZES.forEach((p) => got.add(p.species));
    // Gifts / purchases / fossils / starters handled by quest scripts.
    [
      "bulbasaur", "charmander", "squirtle", "eevee", "lapras",
      "hitmonlee", "hitmonchan", "magikarp", "omanyte", "kabuto", "aerodactyl",
    ].forEach((s) => got.add(s));
    let grew = true;
    while (grew) {
      grew = false;
      for (const s of [...got])
        for (const e of SPECIES[s]?.evolutions ?? [])
          if (!got.has(e.to)) {
            got.add(e.to);
            grew = true;
          }
    }
    const missing = Object.keys(SPECIES).filter((s) => !got.has(s));
    console.log("UNOBTAINABLE", missing.join(","));
    // Agreed/ROM-faithful exceptions (task 009 audit):
    //  - raid-only legendaries/mythicals;
    //  - LeafGreen-exclusive lines (this is the FireRed ROM);
    //  - Ponyta/Rapidash only spawn on the Sevii Islands (out of scope);
    const agreed = new Set([
      "articuno", "zapdos", "moltres", "mewtwo", "mew",
      "sandshrew", "sandslash", "vulpix", "ninetales",
      "bellsprout", "weepinbell", "victreebel", "magmar", "pinsir",
      "ponyta", "rapidash",
    ]);
    expect(missing.filter((s) => !agreed.has(s))).toEqual([]);
  });
});

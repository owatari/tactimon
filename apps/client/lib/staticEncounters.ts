import { STATIC_POKEMON } from "./generated/worldObstacles";

/** A one-off wild battle started from the overworld (Snorlax, ghost, birds). */
export type WildBattleSpec = {
  /** Completing it records player event `story:static:<staticId>`. */
  staticId: string;
  species: string;
  level: number;
  /** Key item the player must own before the Pokémon can be engaged. */
  requiresKeyItem?: string;
};

export type StaticWorldEncounter = {
  id: string;
  mapId: string;
  x: number;
  y: number;
  species: "snorlax" | "zapdos" | "articuno" | "moltres" | "mewtwo";
  level: number;
  label: string;
  spriteUrl: string;
  sheetWidth: number;
  sheetHeight: number;
  /** Key item the player must own before the Pokémon can be engaged. */
  requiresKeyItem?: string;
};

const STATIC_META: Record<
  string,
  Pick<
    StaticWorldEncounter,
    "species" | "level" | "label" | "spriteUrl" | "sheetWidth" | "sheetHeight" | "requiresKeyItem"
  >
> = {
  snorlax: {
    species: "snorlax",
    level: 30,
    label: "Snorlax",
    spriteUrl: "/game-assets/overworld/109_snorlax.png",
    sheetWidth: 192,
    sheetHeight: 64,
    requiresKeyItem: "poke-flute",
  },
  zapdos: {
    species: "zapdos",
    level: 50,
    label: "Zapdos",
    spriteUrl: "/game-assets/overworld/136_zapdos.png",
    sheetWidth: 192,
    sheetHeight: 64,
  },
  articuno: {
    species: "articuno",
    level: 50,
    label: "Articuno",
    spriteUrl: "/game-assets/overworld/138_articuno.png",
    sheetWidth: 192,
    sheetHeight: 64,
  },
  moltres: {
    species: "moltres",
    level: 50,
    label: "Moltres",
    spriteUrl: "/game-assets/overworld/137_moltres.png",
    sheetWidth: 192,
    sheetHeight: 64,
  },
  mewtwo: {
    species: "mewtwo",
    level: 70,
    label: "Mewtwo",
    spriteUrl: "/game-assets/overworld/139_mewtwo.png",
    sheetWidth: 96,
    sheetHeight: 32,
  },
};

/** One-off wild Pokémon placed in the world (Snorlax, legendary birds). */
export const STATIC_WORLD_ENCOUNTERS: readonly StaticWorldEncounter[] =
  STATIC_POKEMON.filter((entry) => STATIC_META[entry.species]).map(
    (entry) => ({
      ...STATIC_META[entry.species],
      id: `${entry.mapId}-${entry.species}`,
      mapId: entry.mapId,
      x: entry.x,
      y: entry.y,
    }),
  );

export function getStaticEncounter(
  staticId: string,
): StaticWorldEncounter | null {
  return (
    STATIC_WORLD_ENCOUNTERS.find((entry) => entry.id === staticId) ??
    null
  );
}

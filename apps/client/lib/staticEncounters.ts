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
  /** Key item the player must own before the Pokémon can be engaged. */
  requiresKeyItem?: string;
};

const STATIC_META: Record<
  string,
  Pick<
    StaticWorldEncounter,
    "species" | "level" | "label" | "spriteUrl" | "requiresKeyItem"
  >
> = {
  snorlax: {
    species: "snorlax",
    level: 30,
    label: "Snorlax",
    spriteUrl: "/game-assets/overworld/109_snorlax.png",
    requiresKeyItem: "poke-flute",
  },
  zapdos: {
    species: "zapdos",
    level: 50,
    label: "Zapdos",
    spriteUrl: "/game-assets/overworld/136_zapdos.png",
  },
  articuno: {
    species: "articuno",
    level: 50,
    label: "Articuno",
    spriteUrl: "/game-assets/overworld/138_articuno.png",
  },
  moltres: {
    species: "moltres",
    level: 50,
    label: "Moltres",
    spriteUrl: "/game-assets/overworld/137_moltres.png",
  },
  mewtwo: {
    species: "mewtwo",
    level: 70,
    label: "Mewtwo",
    spriteUrl: "/game-assets/overworld/139_mewtwo.png",
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

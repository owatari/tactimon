import { SILPH_DOORS } from "./generated/worldObstacles";
import {
  SAFFRON_GUARDS_OPEN_EVENT,
  silphDoorEventId,
  staticEncounterEventId,
} from "./questEvents";
import type { PlayerWorldTileGate } from "./playerWorldGates";
import type { WildBattleSpec } from "./staticEncounters";

/**
 * Hand-authored questline gates for the late Kanto content:
 * Saffron guards (Tea), Pokémon Tower ghost (Silph Scope), Cinnabar Gym
 * (Secret Key) and the Silph Co. Card Key doors.
 */

export const TOWER_GHOST: WildBattleSpec = {
  staticId: "pokemon-tower-6f-ghost",
  species: "marowak",
  level: 30,
  requiresKeyItem: "silph-scope",
};

const SAFFRON_GATE_CELLS: readonly {
  mapId: string;
  cells: readonly (readonly [number, number])[];
}[] = [
  { mapId: "route-5-south-entrance", cells: [[3, 5], [4, 5], [5, 5]] },
  { mapId: "route-6-north-entrance", cells: [[3, 5], [4, 5], [5, 5]] },
  { mapId: "route-7-east-entrance", cells: [[6, 4], [6, 5], [6, 6]] },
  { mapId: "route-8-west-entrance", cells: [[6, 4], [6, 5], [6, 6]] },
];

const SAFFRON_GATES: readonly PlayerWorldTileGate[] =
  SAFFRON_GATE_CELLS.flatMap(({ mapId, cells }) =>
    cells.map(([x, y]) => ({
      id: `gate:saffron-guard:${mapId}:${x},${y}`,
      kind: "tile" as const,
      mapId,
      x,
      y,
      allowWhen: {
        kind: "event" as const,
        namespace: "story" as const,
        id: SAFFRON_GUARDS_OPEN_EVENT,
      },
      blockedRequest: {
        kind: "script" as const,
        id: "saffron-guard",
      },
    })),
  );

const TOWER_GHOST_GATES: readonly PlayerWorldTileGate[] = [
  [11, 15],
  [12, 16],
  [11, 16],
].map(([x, y]) => ({
  id: `gate:tower-ghost:${x},${y}`,
  kind: "tile" as const,
  mapId: "pokemon-tower-6f",
  x,
  y,
  allowWhen: {
    kind: "event" as const,
    namespace: "story" as const,
    id: staticEncounterEventId(TOWER_GHOST.staticId),
  },
  blockedRequest: {
    kind: "script" as const,
    id: "tower-ghost",
  },
  wildBattle: TOWER_GHOST,
}));

/** Stepping onto the Safari Zone door starts (and charges for) a game. */
const SAFARI_ENTRANCE_GATE: PlayerWorldTileGate = {
  id: "gate:safari-entrance",
  kind: "tile",
  mapId: "fuchsia-city-safari-zone-entrance",
  x: 4,
  y: 1,
  allowWhen: { kind: "safari-active" },
  blockedRequest: { kind: "script", id: "safari-entrance" },
};

const CINNABAR_GYM_GATE: PlayerWorldTileGate = {
  id: "gate:cinnabar-gym-secret-key",
  kind: "tile",
  mapId: "cinnabar-island",
  x: 20,
  y: 4,
  allowWhen: {
    kind: "event",
    namespace: "key-item",
    id: "secret-key",
  },
  blockedRequest: {
    kind: "text",
    id: "gate:cinnabar-gym-secret-key",
    text: "A porta do Gym está trancada. A Secret Key da Pokémon Mansion abre esta fechadura.",
  },
};

const SILPH_DOOR_GATES: readonly PlayerWorldTileGate[] =
  SILPH_DOORS.flatMap((door) =>
    door.cells.map(([x, y]) => ({
      id: `gate:${door.id}:${x},${y}`,
      kind: "tile" as const,
      mapId: door.mapId,
      x,
      y,
      allowWhen: {
        kind: "event" as const,
        namespace: "story" as const,
        id: silphDoorEventId(door.id),
      },
      blockedRequest: {
        kind: "script" as const,
        id: "silph-card-door",
        context: { doorId: door.id },
      },
    })),
  );

export const QUEST_TILE_GATES: readonly PlayerWorldTileGate[] = [
  ...SAFFRON_GATES,
  ...TOWER_GHOST_GATES,
  CINNABAR_GYM_GATE,
  SAFARI_ENTRANCE_GATE,
  ...SILPH_DOOR_GATES,
];

/** Card Key door cells are closed metatiles; open them for the gates above. */
export const QUEST_OPEN_CELLS: Readonly<
  Record<string, readonly (readonly [number, number])[]>
> = SILPH_DOORS.reduce<Record<string, [number, number][]>>(
  (acc, door) => {
    (acc[door.mapId] ??= []).push(
      ...door.cells.map(([x, y]) => [x, y] as [number, number]),
    );
    return acc;
  },
  {},
);

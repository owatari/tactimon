import {
  MANSION_BARRIERS,
  SILPH_DOORS,
} from "./generated/worldObstacles";
import {
  MANSION_SWITCH_CHOICE,
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

/** The poster stairs to the Rocket Hideout open once the guard is beaten. */
const ROCKET_HIDEOUT_GATE: PlayerWorldTileGate = {
  id: "gate:celadon-rocket-hideout",
  kind: "tile",
  mapId: "celadon-city-game-corner",
  x: 15,
  y: 2,
  allowWhen: {
    kind: "event",
    namespace: "trainer",
    id: "celadon-city-game-corner-grunt",
  },
  blockedRequest: {
    kind: "text",
    id: "gate:celadon-rocket-hideout",
    text: "Um pôster da Equipe Rocket cobre a parede. O Rocket de guarda está de olho em você: vença-o primeiro.",
  },
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

/** Pokémon Mansion barriers: open in one state of the statue switch. */
const MANSION_GATES: readonly PlayerWorldTileGate[] = MANSION_BARRIERS.map(
  (barrier) => ({
    id: `gate:mansion:${barrier.mapId}:${barrier.x},${barrier.y}`,
    kind: "tile" as const,
    mapId: barrier.mapId,
    x: barrier.x,
    y: barrier.y,
    allowWhen:
      barrier.openIn === "b"
        ? {
            kind: "choice" as const,
            id: MANSION_SWITCH_CHOICE,
            equals: "b",
          }
        : {
            kind: "not" as const,
            condition: {
              kind: "choice" as const,
              id: MANSION_SWITCH_CHOICE,
              equals: "b",
            },
          },
    blockedRequest: {
      kind: "text" as const,
      id: "gate:mansion-barrier",
      text: "Uma barreira de metal bloqueia a passagem. Deve haver um interruptor secreto em alguma estátua da mansão.",
    },
  }),
);

export const QUEST_TILE_GATES: readonly PlayerWorldTileGate[] = [
  ...SAFFRON_GATES,
  ...TOWER_GHOST_GATES,
  CINNABAR_GYM_GATE,
  ROCKET_HIDEOUT_GATE,
  SAFARI_ENTRANCE_GATE,
  ...SILPH_DOOR_GATES,
  ...MANSION_GATES,
];

/**
 * Card Key doors and Mansion barriers are closed metatiles; their cells are
 * walkable and the tile gates above decide when they actually let you through.
 */
export const QUEST_OPEN_CELLS: Readonly<
  Record<string, readonly (readonly [number, number])[]>
> = (() => {
  const cells: Record<string, [number, number][]> = {};
  for (const door of SILPH_DOORS) {
    (cells[door.mapId] ??= []).push(
      ...door.cells.map(([x, y]) => [x, y] as [number, number]),
    );
  }
  for (const barrier of MANSION_BARRIERS) {
    (cells[barrier.mapId] ??= []).push([barrier.x, barrier.y]);
  }
  return cells;
})();

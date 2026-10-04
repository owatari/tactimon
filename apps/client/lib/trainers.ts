import type { DuelPokemonBuild } from "@tactimon/battle-engine";
import type {
  Direction,
  MapLayout,
  WorldObject,
} from "@/lib/maps";

export type OverworldTrainerDefinition = {
  id: string;
  mapId: string;
  name: string;
  preferredPosition: { x: number; y: number };
  facing: Direction;
  sightRange: number;
  spriteUrl: string;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  challengeText: string;
  defeatedText: string;
  moneyMultiplier: number;
  party: readonly DuelPokemonBuild[];
};

export type OverworldTrainerInstance =
  OverworldTrainerDefinition & {
    x: number;
    y: number;
    defeated: boolean;
    rewardMoney: number;
  };

export const OVERWORLD_TRAINERS: readonly OverworldTrainerDefinition[] = [
  {
    id: "viridian-youngster",
    mapId: "viridian-city",
    name: "Youngster",
    preferredPosition: { x: 23, y: 34 },
    facing: "south",
    sightRange: 5,
    spriteUrl: "/game-assets/overworld/018_youngster.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Youngster: Ei! Vamos ver como o seu time luta!",
    defeatedText:
      "Youngster: Seu time é forte. Vou treinar mais.",
    moneyMultiplier: 4,
    party: [
      {
        species: "pidgey",
        level: 4,
        moves: ["tackle", "growl"],
      },
      {
        species: "rattata",
        level: 4,
        moves: ["tackle", "tail-whip"],
      },
    ],
  },
];

export function trainerPrizeMoney(
  party: readonly DuelPokemonBuild[],
  multiplier: number,
): number {
  const last = party[party.length - 1];
  if (!last) {
    return 0;
  }

  // FireRed: 4 × last Pokémon level × trainer-class money factor.
  return Math.max(
    0,
    Math.trunc(
      4 *
        Math.max(1, Math.trunc(last.level)) *
        Math.max(0, Math.trunc(multiplier)),
    ),
  );
}

function pointKey(x: number, y: number): string {
  return `${x},${y}`;
}

function placementCandidates(
  origin: { x: number; y: number },
  maxRadius = 8,
): Array<{ x: number; y: number }> {
  const result: Array<{
    x: number;
    y: number;
    distance: number;
  }> = [];

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      const dx = radius - Math.abs(dy);
      const xs = dx === 0 ? [origin.x] : [origin.x - dx, origin.x + dx];

      for (const x of xs) {
        result.push({
          x,
          y: origin.y + dy,
          distance: radius,
        });
      }
    }
  }

  return result
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.y - b.y ||
        a.x - b.x,
    )
    .map(({ x, y }) => ({ x, y }));
}

function isWalkablePlacement(
  layout: MapLayout,
  x: number,
  y: number,
  occupied: ReadonlySet<string>,
): boolean {
  if (
    x < 0 ||
    y < 0 ||
    x >= layout.width ||
    y >= layout.height ||
    occupied.has(pointKey(x, y))
  ) {
    return false;
  }

  const cell = layout.cells[y * layout.width + x];
  return Boolean(cell && cell.collision === 0);
}

function openSightTiles(
  layout: MapLayout,
  origin: { x: number; y: number },
  facing: Direction,
  maxRange: number,
  occupied: ReadonlySet<string>,
): number {
  const delta =
    facing === "north"
      ? { x: 0, y: -1 }
      : facing === "south"
        ? { x: 0, y: 1 }
        : facing === "west"
          ? { x: -1, y: 0 }
          : { x: 1, y: 0 };

  let open = 0;

  for (let distance = 1; distance <= maxRange; distance += 1) {
    const x = origin.x + delta.x * distance;
    const y = origin.y + delta.y * distance;

    if (
      !isWalkablePlacement(
        layout,
        x,
        y,
        occupied,
      )
    ) {
      break;
    }

    open += 1;
  }

  return open;
}

export function resolveOverworldTrainers(
  mapId: string,
  layout: MapLayout | null,
  worldObjects: readonly WorldObject[],
  defeatedTrainerIds: readonly string[],
): OverworldTrainerInstance[] {
  if (!layout) {
    return [];
  }

  const occupied = new Set(
    worldObjects.map((object) =>
      pointKey(object.x, object.y),
    ),
  );
  const defeated = new Set(defeatedTrainerIds);
  const result: OverworldTrainerInstance[] = [];

  for (const trainer of OVERWORLD_TRAINERS) {
    if (trainer.mapId !== mapId) {
      continue;
    }

    const candidates = placementCandidates(
      trainer.preferredPosition,
    ).filter((candidate) =>
      isWalkablePlacement(
        layout,
        candidate.x,
        candidate.y,
        occupied,
      ),
    );
    const position =
      candidates.find(
        (candidate) =>
          openSightTiles(
            layout,
            candidate,
            trainer.facing,
            trainer.sightRange,
            occupied,
          ) >= Math.min(3, trainer.sightRange),
      ) ??
      candidates[0];

    if (!position) {
      continue;
    }

    occupied.add(pointKey(position.x, position.y));
    result.push({
      ...trainer,
      x: position.x,
      y: position.y,
      defeated: defeated.has(trainer.id),
      rewardMoney: trainerPrizeMoney(
        trainer.party,
        trainer.moneyMultiplier,
      ),
    });
  }

  return result;
}

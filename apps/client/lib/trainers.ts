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
  party: readonly DuelPokemonBuild[];
};

export type OverworldTrainerInstance =
  OverworldTrainerDefinition & {
    x: number;
    y: number;
    defeated: boolean;
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

    const position = placementCandidates(
      trainer.preferredPosition,
    ).find((candidate) =>
      isWalkablePlacement(
        layout,
        candidate.x,
        candidate.y,
        occupied,
      ),
    );

    if (!position) {
      continue;
    }

    occupied.add(pointKey(position.x, position.y));
    result.push({
      ...trainer,
      x: position.x,
      y: position.y,
      defeated: defeated.has(trainer.id),
    });
  }

  return result;
}

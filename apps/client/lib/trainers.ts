import type { DuelPokemonBuild } from "@tactimon/battle-engine";
import type { StoryBadgeId } from "@/lib/story";
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
  badgeId?: StoryBadgeId;
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
  {
    id: "pewter-brock",
    mapId: "pewter-gym",
    name: "Brock",
    preferredPosition: { x: 6, y: 5 },
    facing: "south",
    sightRange: 0,
    spriteUrl: "/game-assets/overworld/080_brock.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Brock: Sou o Líder do Ginásio de Pewter. Mostre a força do seu time!",
    defeatedText:
      "Brock: A Boulder Badge prova que você venceu este Ginásio.",
    moneyMultiplier: 25,
    badgeId: "boulder",
    party: [
      {
        species: "geodude",
        level: 12,
        moves: ["tackle", "defense-curl"],
      },
      {
        species: "onix",
        level: 14,
        moves: ["tackle", "bind", "rock-tomb"],
      },
    ],
  },
  {
    id: "viridian-forest-rick",
    mapId: "viridian-forest",
    name: "Bug Catcher Rick",
    preferredPosition: { x: 47, y: 45 },
    facing: "west",
    sightRange: 5,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Rick: Ei! Você tem Pokémon! Vamos batalhar!",
    defeatedText:
      "Rick: Não! Caterpie não deu conta!",
    moneyMultiplier: 3,
    party: [
      {
        species: "weedle",
        level: 6,
        moves: ["poison-sting", "string-shot"],
      },
      {
        species: "caterpie",
        level: 6,
        moves: ["tackle", "string-shot"],
      },
    ],
  },
  {
    id: "viridian-forest-doug",
    mapId: "viridian-forest",
    name: "Bug Catcher Doug",
    preferredPosition: { x: 47, y: 29 },
    facing: "west",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Doug: Ei! Um Treinador Pokémon não foge de uma batalha!",
    defeatedText:
      "Doug: Hã? Fiquei sem Pokémon!",
    moneyMultiplier: 3,
    party: [
      {
        species: "weedle",
        level: 7,
        moves: ["poison-sting", "string-shot"],
      },
      {
        species: "kakuna",
        level: 7,
        moves: ["harden"],
      },
      {
        species: "weedle",
        level: 7,
        moves: ["poison-sting", "string-shot"],
      },
    ],
  },
  {
    id: "viridian-forest-sammy",
    mapId: "viridian-forest",
    name: "Bug Catcher Sammy",
    preferredPosition: { x: 7, y: 22 },
    facing: "west",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Sammy: Ei, espere! Qual é a pressa?",
    defeatedText:
      "Sammy: Eu desisto! Você manda bem!",
    moneyMultiplier: 3,
    party: [
      {
        species: "weedle",
        level: 9,
        moves: ["poison-sting", "string-shot"],
      },
    ],
  },
  {
    id: "viridian-forest-anthony",
    mapId: "viridian-forest",
    name: "Bug Catcher Anthony",
    preferredPosition: { x: 43, y: 6 },
    facing: "south",
    sightRange: 1,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Anthony: Posso ser pequeno, mas não pegue leve comigo!",
    defeatedText:
      "Anthony: Ah, não. Nada deu certo.",
    moneyMultiplier: 3,
    party: [
      {
        species: "caterpie",
        level: 7,
        moves: ["tackle", "string-shot"],
      },
      {
        species: "caterpie",
        level: 8,
        moves: ["tackle", "string-shot"],
      },
    ],
  },
  {
    id: "viridian-forest-charlie",
    mapId: "viridian-forest",
    name: "Bug Catcher Charlie",
    preferredPosition: { x: 16, y: 5 },
    facing: "north",
    sightRange: 1,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Charlie: Você sabia que Pokémon evoluem?",
    defeatedText:
      "Charlie: Ah! Eu perdi!",
    moneyMultiplier: 3,
    party: [
      {
        species: "metapod",
        level: 7,
        moves: ["harden"],
      },
      {
        species: "caterpie",
        level: 7,
        moves: ["tackle", "string-shot"],
      },
      {
        species: "metapod",
        level: 7,
        moves: ["harden"],
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

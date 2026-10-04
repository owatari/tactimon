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
    id: "route3-ben",
    mapId: "route-3",
    name: "Youngster Ben",
    preferredPosition: { x: 17, y: 4 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/018_youngster.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Ben: Oi! Eu gosto de shorts! Eles são confortáveis e fáceis de usar!",
    defeatedText:
      "Ben: Você usa o PC do Pokémon Center para guardar seus Pokémon?",
    moneyMultiplier: 4,
    party: [
      {
        species: "rattata",
        level: 11,
        moves: ["tackle", "tail-whip"],
      },
      {
        species: "ekans",
        level: 11,
        moves: ["bind", "leer", "poison-sting"],
      },
    ],
  },
  {
    id: "route3-calvin",
    mapId: "route-3",
    name: "Youngster Calvin",
    preferredPosition: { x: 29, y: 10 },
    facing: "west",
    sightRange: 5,
    spriteUrl: "/game-assets/overworld/018_youngster.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Calvin: Ei! Você não está usando shorts! O que há de errado com você?",
    defeatedText:
      "Calvin: Eu sempre uso shorts, até no inverno. Essa é minha regra.",
    moneyMultiplier: 4,
    party: [
      {
        species: "spearow",
        level: 14,
        moves: ["peck", "growl", "leer"],
      },
    ],
  },
  {
    id: "route3-colton",
    mapId: "route-3",
    name: "Bug Catcher Colton",
    preferredPosition: { x: 12, y: 6 },
    facing: "east",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Colton: Ei! Eu vi você na Floresta de Viridian!",
    defeatedText:
      "Colton: Há outros tipos de Pokémon além dos que vivem em florestas.",
    moneyMultiplier: 3,
    party: [
      {
        species: "caterpie",
        level: 10,
        moves: ["tackle", "string-shot"],
      },
      {
        species: "weedle",
        level: 10,
        moves: ["poison-sting", "string-shot"],
      },
      {
        species: "caterpie",
        level: 10,
        moves: ["tackle", "string-shot"],
      },
    ],
  },
  {
    id: "route3-greg",
    mapId: "route-3",
    name: "Bug Catcher Greg",
    preferredPosition: { x: 25, y: 4 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Greg: Você é Treinador? Então vamos batalhar agora mesmo!",
    defeatedText:
      "Greg: Se uma Box do PC ficar cheia, é só trocar para outra.",
    moneyMultiplier: 3,
    party: [
      {
        species: "weedle",
        level: 9,
        moves: ["poison-sting", "string-shot"],
      },
      {
        species: "kakuna",
        level: 9,
        moves: ["harden"],
      },
      {
        species: "caterpie",
        level: 9,
        moves: ["tackle", "string-shot"],
      },
      {
        species: "metapod",
        level: 9,
        moves: ["harden"],
      },
    ],
  },
  {
    id: "route3-james",
    mapId: "route-3",
    name: "Bug Catcher James",
    preferredPosition: { x: 32, y: 6 },
    facing: "east",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "James: Vou batalhar com os Pokémon que acabei de capturar.",
    defeatedText:
      "James: Pokémon treinados são mais fortes que os selvagens.",
    moneyMultiplier: 3,
    party: [
      {
        species: "caterpie",
        level: 11,
        moves: ["tackle", "string-shot"],
      },
      {
        species: "metapod",
        level: 11,
        moves: ["harden"],
      },
    ],
  },
  {
    id: "route3-janice",
    mapId: "route-3",
    name: "Lass Janice",
    preferredPosition: { x: 19, y: 9 },
    facing: "west",
    sightRange: 5,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Janice: Com licença! Você olhou para mim, não olhou?",
    defeatedText:
      "Janice: Não encare outros Treinadores se não quiser batalhar!",
    moneyMultiplier: 4,
    party: [
      {
        species: "pidgey",
        level: 9,
        moves: ["tackle", "growl"],
      },
      {
        species: "pidgey",
        level: 9,
        moves: ["tackle", "growl"],
      },
    ],
  },
  {
    id: "route3-sally",
    mapId: "route-3",
    name: "Lass Sally",
    preferredPosition: { x: 30, y: 3 },
    facing: "west",
    sightRange: 5,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Sally: Esse olhar que você me deu... é tão intrigante!",
    defeatedText:
      "Sally: Dá para evitar batalhas sem deixar os Treinadores verem você.",
    moneyMultiplier: 4,
    party: [
      {
        species: "rattata",
        level: 10,
        moves: ["tackle", "tail-whip"],
      },
      {
        species: "nidoran-f",
        level: 10,
        moves: ["scratch", "growl", "tail-whip"],
      },
    ],
  },
  {
    id: "route3-robin",
    mapId: "route-3",
    name: "Lass Robin",
    preferredPosition: { x: 40, y: 11 },
    facing: "south",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Robin: Eek! Você encostou em mim?",
    defeatedText:
      "Robin: A Route 4 fica aos pés do Mt. Moon.",
    moneyMultiplier: 4,
    party: [
      {
        species: "jigglypuff",
        level: 14,
        moves: ["pound", "defense-curl"],
      },
    ],
  },
  {
    id: "mtmoon-iris",
    mapId: "mt-moon-1f",
    name: "Lass Iris",
    preferredPosition: { x: 20, y: 26 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Iris: O quê? Estou esperando meus amigos me encontrarem aqui.",
    defeatedText:
      "Iris: Vim porque ouvi dizer que existem fósseis muito raros aqui.",
    moneyMultiplier: 4,
    party: [
      {
        species: "clefairy",
        level: 14,
        moves: ["pound", "growl"],
      },
    ],
  },
  {
    id: "mtmoon-robby",
    mapId: "mt-moon-1f",
    name: "Bug Catcher Robby",
    preferredPosition: { x: 36, y: 30 },
    facing: "east",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Robby: Você precisa atravessar esta caverna para chegar a Cerulean City.",
    defeatedText:
      "Robby: Zubat é resistente! Se capturar um, poderá contar com ele.",
    moneyMultiplier: 3,
    party: [
      {
        species: "caterpie",
        level: 10,
        moves: ["tackle", "string-shot"],
      },
      {
        species: "metapod",
        level: 10,
        moves: ["harden"],
      },
      {
        species: "caterpie",
        level: 10,
        moves: ["tackle", "string-shot"],
      },
    ],
  },
  {
    id: "mtmoon-kent",
    mapId: "mt-moon-1f",
    name: "Bug Catcher Kent",
    preferredPosition: { x: 7, y: 26 },
    facing: "south",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Kent: Há homens suspeitos na caverna. E você, o que está fazendo aqui?",
    defeatedText:
      "Kent: Eu os vi! Tenho certeza de que são da Team Rocket!",
    moneyMultiplier: 3,
    party: [
      {
        species: "weedle",
        level: 11,
        moves: ["poison-sting", "string-shot"],
      },
      {
        species: "kakuna",
        level: 11,
        moves: ["harden"],
      },
    ],
  },
  {
    id: "mtmoon-josh",
    mapId: "mt-moon-1f",
    name: "Youngster Josh",
    preferredPosition: { x: 13, y: 17 },
    facing: "east",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/018_youngster.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Josh: Você também veio explorar a caverna?",
    defeatedText:
      "Josh: Vim até aqui para me exibir para as garotas.",
    moneyMultiplier: 4,
    party: [
      {
        species: "rattata",
        level: 10,
        moves: ["tackle", "tail-whip"],
      },
      {
        species: "rattata",
        level: 10,
        moves: ["tackle", "tail-whip"],
      },
      {
        species: "zubat",
        level: 10,
        moves: ["astonish"],
      },
    ],
  },
  {
    id: "mtmoon-marcos",
    mapId: "mt-moon-1f",
    name: "Hiker Marcos",
    preferredPosition: { x: 7, y: 10 },
    facing: "south",
    sightRange: 1,
    spriteUrl: "/game-assets/overworld/056_hiker.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Marcos: Uau! Você me assustou! ...Ah, é só uma criança!",
    defeatedText:
      "Marcos: Crianças como você não deveriam andar por aqui no escuro.",
    moneyMultiplier: 10,
    party: [
      {
        species: "geodude",
        level: 10,
        moves: ["tackle", "defense-curl"],
      },
      {
        species: "geodude",
        level: 10,
        moves: ["tackle", "defense-curl"],
      },
      {
        species: "onix",
        level: 10,
        moves: ["tackle", "bind"],
      },
    ],
  },
  {
    id: "mtmoon-rocket-grunt-1",
    mapId: "mt-moon-b2f",
    name: "Team Rocket Grunt",
    preferredPosition: { x: 12, y: 20 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/049_rocket_m.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Rocket: Nós, da Team Rocket, vamos encontrar os fósseis e enriquecer revivendo Pokémon!",
    defeatedText:
      "Rocket: Você me deixou furioso! A Team Rocket não vai esquecer você.",
    moneyMultiplier: 8,
    party: [
      { species: "rattata", level: 13, moves: ["tackle", "tail-whip"] },
      { species: "zubat", level: 13, moves: ["astonish"] },
    ],
  },
  {
    id: "mtmoon-rocket-grunt-2",
    mapId: "mt-moon-b2f",
    name: "Team Rocket Grunt",
    preferredPosition: { x: 18, y: 27 },
    facing: "south",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/049_rocket_m.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Rocket: Nós somos gângsteres Pokémon! Fazemos todos temerem a nossa força!",
    defeatedText:
      "Rocket: Droga! Meus companheiros não vão deixar isso barato.",
    moneyMultiplier: 8,
    party: [
      { species: "sandshrew", level: 11, moves: ["scratch", "defense-curl"] },
      { species: "rattata", level: 11, moves: ["tackle", "tail-whip"] },
      { species: "zubat", level: 11, moves: ["astonish"] },
    ],
  },
  {
    id: "mtmoon-rocket-grunt-3",
    mapId: "mt-moon-b2f",
    name: "Team Rocket Grunt",
    preferredPosition: { x: 35, y: 12 },
    facing: "north",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/049_rocket_m.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Rocket: Estamos fazendo um grande trabalho aqui! Cai fora, moleque!",
    defeatedText:
      "Rocket: Se encontrar um fóssil, entregue para mim e suma!",
    moneyMultiplier: 8,
    party: [
      { species: "zubat", level: 11, moves: ["astonish"] },
      { species: "ekans", level: 11, moves: ["bind", "leer", "poison-sting"] },
    ],
  },
  {
    id: "mtmoon-rocket-grunt-4",
    mapId: "mt-moon-b2f",
    name: "Team Rocket Grunt",
    preferredPosition: { x: 37, y: 21 },
    facing: "west",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/049_rocket_m.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Rocket: Crianças não deveriam se meter com adultos. Isso pode acabar mal!",
    defeatedText:
      "Rocket: Pokémon viviam aqui muito antes das pessoas chegarem.",
    moneyMultiplier: 8,
    party: [
      { species: "rattata", level: 13, moves: ["tackle", "tail-whip"] },
      { species: "sandshrew", level: 13, moves: ["scratch", "defense-curl"] },
    ],
  },
  {
    id: "mtmoon-miguel",
    mapId: "mt-moon-b2f",
    name: "Super Nerd Miguel",
    preferredPosition: { x: 13, y: 11 },
    facing: "east",
    sightRange: 1,
    spriteUrl: "/game-assets/overworld/055_scientist.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Miguel: Ei, pare! Eu encontrei estes fósseis. Os dois são meus!",
    defeatedText:
      "Miguel: Vamos dividir. Cada um pega um fóssil, sem ganância!",
    moneyMultiplier: 6,
    party: [
      { species: "grimer", level: 12, moves: ["pound", "harden"] },
      { species: "voltorb", level: 12, moves: ["tackle"] },
      { species: "koffing", level: 12, moves: ["tackle"] },
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

import { CHAMPION_TRAINERS } from "./generated/worldChampion";
import { GENERATED_TRAINERS } from "./generated/worldTrainers";
import { TRAINER_TEXT_PT } from "./trainerTextsPt";
import type {
  DuelPokemonBuild,
  StarterSpeciesId,
} from "@tactimon/battle-engine";
import {
  isStoryTrainerDefeated,
  type StoryBadgeId,
  type StoryState,
} from "./story";
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
  /** Only appears for players whose rival picked this starter. */
  requiresRivalStarter?: StarterSpeciesId;
  party: readonly DuelPokemonBuild[];
};

export const CERULEAN_ROCKET_TRAINER_ID =
  "cerulean-rocket";
export const ROUTE24_ROCKET_TRAINER_ID =
  "route24-rocket";
export const ROUTE24_NUGGET_REWARD_ID =
  "route24-nugget-prize";

export type OverworldTrainerInstance =
  OverworldTrainerDefinition & {
    x: number;
    y: number;
    defeated: boolean;
    rewardMoney: number;
  };

const HAND_OVERWORLD_TRAINERS: readonly OverworldTrainerDefinition[] = [
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
    id: "cerulean-luis",
    mapId: "cerulean-gym",
    name: "Swimmer Luis",
    preferredPosition: { x: 10, y: 12 },
    facing: "west",
    sightRange: 1,
    spriteUrl: "/game-assets/overworld/043_swimmer_m_water.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Luis: Splash! Eu sou o primeiro! Vamos nessa!",
    defeatedText:
      "Luis: Misty é uma Treinadora que continua melhorando. Ela não vai perder para alguém como você!",
    moneyMultiplier: 1,
    party: [
      {
        species: "horsea",
        level: 16,
        moves: ["bubble", "leer"],
      },
      {
        species: "shellder",
        level: 16,
        moves: ["tackle", "icicle-spear"],
      },
    ],
  },
  {
    id: "cerulean-diana",
    mapId: "cerulean-gym",
    name: "Picnicker Diana",
    preferredPosition: { x: 4, y: 7 },
    facing: "east",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/040_picnicker.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Diana: O quê? Você? Eu sou mais do que suficiente para cuidar de você!",
    defeatedText:
      "Diana: Você precisa enfrentar outros Treinadores para saber o quanto realmente é bom.",
    moneyMultiplier: 5,
    party: [
      {
        species: "goldeen",
        level: 19,
        moves: ["peck", "tail-whip", "horn-attack"],
      },
    ],
  },
  {
    id: "cerulean-misty",
    mapId: "cerulean-gym",
    name: "Misty",
    preferredPosition: { x: 8, y: 6 },
    facing: "south",
    sightRange: 0,
    spriteUrl: "/game-assets/overworld/081_misty.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Misty: Minha política é uma ofensiva total com Pokémon do tipo Water!",
    defeatedText:
      "Misty: Certo! A Cascade Badge prova que você venceu o Ginásio de Cerulean.",
    moneyMultiplier: 25,
    badgeId: "cascade",
    party: [
      {
        species: "staryu",
        level: 18,
        moves: ["tackle", "harden", "recover", "water-pulse"],
      },
      {
        species: "starmie",
        level: 21,
        moves: ["swift", "recover", "rapid-spin", "water-pulse"],
      },
    ],
  },
  {
    id: "vermilion-baily",
    mapId: "vermilion-gym",
    name: "Engineer Baily",
    preferredPosition: { x: 2, y: 11 },
    facing: "east",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/030_balding_man.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Baily: Sou leve, mas entendo de eletricidade! É por isso que entrei neste Ginásio.",
    defeatedText:
      "Baily: Lt. Surge escondeu os interruptores da porta em algum lugar do Ginásio.",
    moneyMultiplier: 12,
    party: [
      {
        species: "voltorb",
        level: 21,
        moves: ["tackle", "screech", "sonic-boom", "spark"],
      },
      {
        species: "magnemite",
        level: 21,
        moves: ["thunder-shock", "supersonic", "sonic-boom", "thunder-wave"],
      },
    ],
  },
  {
    id: "vermilion-dwayne",
    mapId: "vermilion-gym",
    name: "Sailor Dwayne",
    preferredPosition: { x: 8, y: 13 },
    facing: "west",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/062_sailor.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Dwayne: Este não é lugar para crianças, mesmo que você seja bom!",
    defeatedText:
      "Dwayne: Quando achar o primeiro interruptor, o segundo fica logo ao lado.",
    moneyMultiplier: 8,
    party: [
      {
        species: "pikachu",
        level: 21,
        moves: ["thunder-wave", "quick-attack", "double-team", "slam"],
      },
      {
        species: "pikachu",
        level: 21,
        moves: ["thunder-wave", "quick-attack", "double-team", "slam"],
      },
    ],
  },
  {
    id: "vermilion-tucker",
    mapId: "vermilion-gym",
    name: "Gentleman Tucker",
    preferredPosition: { x: 7, y: 8 },
    facing: "west",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/061_gentleman.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Tucker: Quando eu estava no Exército, Lt. Surge era meu comandante. Ele era exigente!",
    defeatedText:
      "Tucker: Abrir aquela porta não é fácil. Lt. Surge sempre foi muito cauteloso.",
    moneyMultiplier: 18,
    party: [
      {
        species: "pikachu",
        level: 23,
        moves: ["thunder-wave", "quick-attack", "double-team", "slam"],
      },
    ],
  },
  {
    id: "vermilion-lt-surge",
    mapId: "vermilion-gym",
    name: "Lt. Surge",
    preferredPosition: { x: 5, y: 2 },
    facing: "south",
    sightRange: 0,
    spriteUrl: "/game-assets/overworld/082_lt_surge.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Lt. Surge: Ei, garoto! Pokémon Electric me salvaram na guerra. Agora vou mostrar o poder deles!",
    defeatedText:
      "Lt. Surge: Que choque! Você é de verdade. A Thunder Badge prova que venceu este Ginásio.",
    moneyMultiplier: 25,
    badgeId: "thunder",
    party: [
      {
        species: "voltorb",
        level: 21,
        moves: ["sonic-boom", "tackle", "screech", "shock-wave"],
      },
      {
        species: "pikachu",
        level: 18,
        moves: ["quick-attack", "thunder-wave", "double-team", "shock-wave"],
      },
      {
        species: "raichu",
        level: 24,
        moves: ["quick-attack", "thunder-wave", "double-team", "shock-wave"],
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
    id: "route4-crissy",
    mapId: "route-4",
    name: "Lass Crissy",
    preferredPosition: { x: 75, y: 3 },
    facing: "east",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Crissy: Vim ao Mt. Moon procurando Pokémon cogumelo.",
    defeatedText:
      "Crissy: Talvez não haja mais cogumelos por aqui. Acho que capturei todos.",
    moneyMultiplier: 4,
    party: [
      {
        species: "paras",
        level: 31,
        moves: ["scratch", "stun-spore", "poison-powder"],
      },
      {
        species: "paras",
        level: 31,
        moves: ["scratch", "stun-spore", "poison-powder"],
      },
      {
        species: "parasect",
        level: 31,
        moves: ["scratch", "stun-spore", "poison-powder"],
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
    moneyMultiplier: 9,
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
  {
    id: "route24-cale",
    mapId: "route-24",
    name: "Bug Catcher Cale",
    preferredPosition: { x: 12, y: 31 },
    facing: "west",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Cale: Esta é a Nugget Bridge! Vença os cinco Treinadores e ganhe um prêmio fabuloso!",
    defeatedText:
      "Cale: Eu fiz o meu melhor. Não tenho arrependimentos!",
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
        species: "metapod",
        level: 10,
        moves: ["harden"],
      },
      {
        species: "kakuna",
        level: 10,
        moves: ["harden"],
      },
    ],
  },
  {
    id: "route24-ali",
    mapId: "route-24",
    name: "Lass Ali",
    preferredPosition: { x: 10, y: 28 },
    facing: "east",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Ali: Eu sou a segunda! Agora ficou sério!",
    defeatedText:
      "Ali: Eu fiz o meu melhor. Não tenho arrependimentos!",
    moneyMultiplier: 4,
    party: [
      {
        species: "pidgey",
        level: 12,
        moves: ["tackle", "sand-attack", "gust"],
      },
      {
        species: "oddish",
        level: 12,
        moves: ["absorb", "sweet-scent"],
      },
      {
        species: "bellsprout",
        level: 12,
        moves: ["vine-whip", "growth", "wrap"],
      },
    ],
  },
  {
    id: "route24-timmy",
    mapId: "route-24",
    name: "Youngster Timmy",
    preferredPosition: { x: 12, y: 25 },
    facing: "west",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/018_youngster.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Timmy: Aqui está o número 3! Não vou facilitar!",
    defeatedText:
      "Timmy: Eu fiz o meu melhor. Não tenho arrependimentos!",
    moneyMultiplier: 4,
    party: [
      {
        species: "sandshrew",
        level: 14,
        moves: ["scratch", "defense-curl", "sand-attack"],
      },
      {
        species: "ekans",
        level: 14,
        moves: ["bind", "leer", "poison-sting", "bite"],
      },
    ],
  },
  {
    id: "route24-reli",
    mapId: "route-24",
    name: "Lass Reli",
    preferredPosition: { x: 10, y: 22 },
    facing: "east",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Reli: Eu sou a número 4! Já está cansando?",
    defeatedText:
      "Reli: Eu fiz o meu melhor, então não tenho arrependimentos!",
    moneyMultiplier: 4,
    party: [
      {
        species: "nidoran-m",
        level: 16,
        moves: ["peck", "leer"],
      },
      {
        species: "nidoran-f",
        level: 16,
        moves: ["scratch", "growl", "tail-whip"],
      },
    ],
  },
  {
    id: "route24-ethan",
    mapId: "route-24",
    name: "Camper Ethan",
    preferredPosition: { x: 12, y: 19 },
    facing: "west",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/039_camper.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Ethan: Certo! Eu sou o número 5! Vou passar por cima de você!",
    defeatedText:
      "Ethan: Eu fiz o meu melhor. Não tenho arrependimentos!",
    moneyMultiplier: 5,
    party: [
      {
        species: "mankey",
        level: 18,
        moves: ["scratch", "leer"],
      },
    ],
  },
  {
    id: "route24-shane",
    mapId: "route-24",
    name: "Camper Shane",
    preferredPosition: { x: 5, y: 21 },
    facing: "north",
    sightRange: 5,
    spriteUrl: "/game-assets/overworld/039_camper.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Shane: Eu vi sua façanha lá da grama!",
    defeatedText:
      "Shane: Eu me escondi porque as pessoas na ponte me assustaram.",
    moneyMultiplier: 5,
    party: [
      {
        species: "rattata",
        level: 14,
        moves: ["tackle", "tail-whip", "quick-attack"],
      },
      {
        species: "ekans",
        level: 14,
        moves: ["bind", "leer", "poison-sting", "bite"],
      },
    ],
  },
  {
    id: ROUTE24_ROCKET_TRAINER_ID,
    mapId: "route-24",
    name: "Team Rocket Grunt",
    preferredPosition: { x: 12, y: 15 },
    facing: "west",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/025_man.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Mystery Trainer: Parabéns por vencer os cinco! Seu prêmio é uma Nugget. Aliás... que tal entrar para a Team Rocket? Não? Então vou ter que convencer você!",
    defeatedText:
      "Rocket: Com a sua habilidade, você poderia virar um grande líder da Team Rocket.",
    moneyMultiplier: 8,
    party: [
      {
        species: "ekans",
        level: 15,
        moves: ["bind", "leer", "poison-sting", "bite"],
      },
      {
        species: "zubat",
        level: 15,
        moves: ["astonish"],
      },
    ],
  },
  {
    id: "route25-franklin",
    mapId: "route-25",
    name: "Hiker Franklin",
    preferredPosition: { x: 11, y: 4 },
    facing: "east",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/056_hiker.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Franklin: Acabei de descer do Mt. Moon e ainda tenho energia de sobra!",
    defeatedText:
      "Franklin: Droga! Um Zubat me mordeu naquela caverna.",
    moneyMultiplier: 9,
    party: [
      {
        species: "machop",
        level: 15,
        moves: ["low-kick", "leer", "focus-energy", "karate-chop"],
      },
      {
        species: "geodude",
        level: 15,
        moves: ["tackle", "defense-curl"],
      },
    ],
  },
  {
    id: "route25-joey",
    mapId: "route-25",
    name: "Youngster Joey",
    preferredPosition: { x: 18, y: 2 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/018_youngster.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Joey: Os Treinadores daqui vêm para praticar!",
    defeatedText:
      "Joey: Todo Pokémon tem fraquezas, até os mais fortes.",
    moneyMultiplier: 4,
    party: [
      {
        species: "rattata",
        level: 15,
        moves: ["tackle", "tail-whip", "quick-attack"],
      },
      {
        species: "spearow",
        level: 15,
        moves: ["peck", "growl", "leer"],
      },
    ],
  },
  {
    id: "route25-wayne",
    mapId: "route-25",
    name: "Hiker Wayne",
    preferredPosition: { x: 17, y: 7 },
    facing: "east",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/056_hiker.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Wayne: Vai visitar o Bill? Primeiro, nós batalhamos!",
    defeatedText:
      "Wayne: A trilha abaixo é um atalho de volta para Cerulean.",
    moneyMultiplier: 9,
    party: [
      {
        species: "onix",
        level: 17,
        moves: ["tackle", "bind"],
      },
    ],
  },
  {
    id: "route25-dan",
    mapId: "route-25",
    name: "Youngster Dan",
    preferredPosition: { x: 22, y: 4 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/018_youngster.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Dan: Meu pai me levou a uma grande festa no S.S. Anne!",
    defeatedText:
      "Dan: No S.S. Anne eu vi Treinadores do mundo inteiro.",
    moneyMultiplier: 4,
    party: [
      {
        species: "slowpoke",
        level: 17,
        moves: ["tackle", "growl", "water-gun", "confusion"],
      },
    ],
  },
  {
    id: "route25-kelsey",
    mapId: "route-25",
    name: "Picnicker Kelsey",
    preferredPosition: { x: 22, y: 8 },
    facing: "east",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/040_picnicker.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Kelsey: Oi! Meu namorado é muito legal!",
    defeatedText:
      "Kelsey: Queria que meu namorado lutasse tão bem quanto você.",
    moneyMultiplier: 5,
    party: [
      {
        species: "nidoran-m",
        level: 15,
        moves: ["peck", "leer"],
      },
      {
        species: "nidoran-f",
        level: 15,
        moves: ["scratch", "growl", "tail-whip"],
      },
    ],
  },
  {
    id: "route25-nob",
    mapId: "route-25",
    name: "Hiker Nob",
    preferredPosition: { x: 27, y: 9 },
    facing: "north",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/056_hiker.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Nob: Estou indo ver a coleção de um Pokémaniac no cabo!",
    defeatedText:
      "Nob: O Pokémaniac realmente faz jus ao nome.",
    moneyMultiplier: 9,
    party: [
      {
        species: "geodude",
        level: 13,
        moves: ["tackle", "defense-curl"],
      },
      {
        species: "geodude",
        level: 13,
        moves: ["tackle", "defense-curl"],
      },
      {
        species: "machop",
        level: 13,
        moves: ["low-kick", "leer", "focus-energy", "karate-chop"],
      },
      {
        species: "geodude",
        level: 13,
        moves: ["tackle", "defense-curl"],
      },
    ],
  },
  {
    id: "route25-flint",
    mapId: "route-25",
    name: "Camper Flint",
    preferredPosition: { x: 28, y: 4 },
    facing: "south",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/039_camper.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Flint: Eu sou um cara legal. Tenho até namorada!",
    defeatedText:
      "Flint: Minha namorada vai me animar depois dessa.",
    moneyMultiplier: 5,
    party: [
      {
        species: "rattata",
        level: 14,
        moves: ["tackle", "tail-whip", "quick-attack"],
      },
      {
        species: "ekans",
        level: 14,
        moves: ["bind", "leer", "poison-sting", "bite"],
      },
    ],
  },
  {
    id: "route25-chad",
    mapId: "route-25",
    name: "Youngster Chad",
    preferredPosition: { x: 36, y: 4 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/018_youngster.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Chad: Eu tive um pressentimento... sabia que tinha que batalhar com você!",
    defeatedText:
      "Chad: Eu também sabia que ia perder!",
    moneyMultiplier: 4,
    party: [
      {
        species: "ekans",
        level: 14,
        moves: ["bind", "leer", "poison-sting", "bite"],
      },
      {
        species: "sandshrew",
        level: 14,
        moves: ["scratch", "defense-curl", "sand-attack"],
      },
    ],
  },
  {
    id: "route25-haley",
    mapId: "route-25",
    name: "Lass Haley",
    preferredPosition: { x: 42, y: 5 },
    facing: "south",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Haley: Minha amiga tem tantos Pokémon fofos. Estou com inveja!",
    defeatedText:
      "Haley: Você veio do Mt. Moon? Queria tanto um Clefairy.",
    moneyMultiplier: 4,
    party: [
      {
        species: "oddish",
        level: 13,
        moves: ["absorb", "sweet-scent"],
      },
      {
        species: "pidgey",
        level: 13,
        moves: ["tackle", "sand-attack", "gust", "quick-attack"],
      },
      {
        species: "oddish",
        level: 13,
        moves: ["absorb", "sweet-scent"],
      },
    ],
  },
  {
    id: "route6-keigo",
    mapId: "route-6",
    name: "Bug Catcher Keigo",
    preferredPosition: { x: 3, y: 16 },
    facing: "east",
    sightRange: 5,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Keigo: Não há muitos insetos por aqui.",
    defeatedText:
      "Keigo: Não! Você só pode estar brincando!",
    moneyMultiplier: 3,
    party: [
      {
        species: "weedle",
        level: 16,
        moves: ["poison-sting", "string-shot"],
      },
      {
        species: "caterpie",
        level: 16,
        moves: ["tackle", "string-shot"],
      },
      {
        species: "weedle",
        level: 16,
        moves: ["poison-sting", "string-shot"],
      },
    ],
  },
  {
    id: "route6-ricky",
    mapId: "route-6",
    name: "Camper Ricky",
    preferredPosition: { x: 12, y: 21 },
    facing: "east",
    sightRange: 0,
    spriteUrl: "/game-assets/overworld/039_camper.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Ricky: Quem está aí? Pare de escutar nossa conversa!",
    defeatedText:
      "Ricky: Eu simplesmente não consigo vencer!",
    moneyMultiplier: 5,
    party: [
      {
        species: "squirtle",
        level: 20,
        moves: ["bubble", "withdraw", "water-gun", "bite"],
      },
    ],
  },
  {
    id: "route6-nancy",
    mapId: "route-6",
    name: "Picnicker Nancy",
    preferredPosition: { x: 13, y: 21 },
    facing: "west",
    sightRange: 0,
    spriteUrl: "/game-assets/overworld/040_picnicker.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Nancy: Com licença! Esta é uma conversa particular!",
    defeatedText:
      "Nancy: Ugh! Eu odeio perder.",
    moneyMultiplier: 5,
    party: [
      {
        species: "rattata",
        level: 16,
        moves: ["tackle", "tail-whip", "quick-attack", "hyper-fang"],
      },
      {
        species: "pikachu",
        level: 16,
        moves: ["tail-whip", "thunder-wave", "quick-attack", "double-team"],
      },
    ],
  },
  {
    id: "route6-elijah",
    mapId: "route-6",
    name: "Bug Catcher Elijah",
    preferredPosition: { x: 20, y: 25 },
    facing: "west",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/020_bug_catcher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Elijah: Nunca vi você por aqui. Você é bom?",
    defeatedText:
      "Elijah: Você é bom demais!",
    moneyMultiplier: 3,
    party: [
      {
        species: "butterfree",
        level: 20,
        moves: ["poison-powder", "stun-spore", "sleep-powder", "supersonic"],
      },
    ],
  },
  {
    id: "route6-isabelle",
    mapId: "route-6",
    name: "Picnicker Isabelle",
    preferredPosition: { x: 13, y: 32 },
    facing: "west",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/040_picnicker.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Isabelle: Eu? Bem, tudo bem. Vamos brincar!",
    defeatedText:
      "Isabelle: As coisas simplesmente não deram certo...",
    moneyMultiplier: 5,
    party: [
      {
        species: "pidgey",
        level: 16,
        moves: ["tackle", "sand-attack", "gust", "quick-attack"],
      },
      {
        species: "pidgey",
        level: 16,
        moves: ["tackle", "sand-attack", "gust", "quick-attack"],
      },
      {
        species: "pidgey",
        level: 16,
        moves: ["tackle", "sand-attack", "gust", "quick-attack"],
      },
    ],
  },
  {
    id: "route6-jeff",
    mapId: "route-6",
    name: "Camper Jeff",
    preferredPosition: { x: 13, y: 33 },
    facing: "west",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/039_camper.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Jeff: Hã? Você quer falar comigo?",
    defeatedText:
      "Jeff: Isso é péssimo... Eu não consegui vencer seu desafio.",
    moneyMultiplier: 5,
    party: [
      {
        species: "spearow",
        level: 16,
        moves: ["peck", "growl", "leer", "fury-attack"],
      },
      {
        species: "raticate",
        level: 16,
        moves: ["tackle", "tail-whip", "quick-attack", "hyper-fang"],
      },
    ],
  },
  {
    id: CERULEAN_ROCKET_TRAINER_ID,
    mapId: "cerulean-city",
    name: "Team Rocket Grunt",
    preferredPosition: { x: 33, y: 6 },
    facing: "south",
    sightRange: 0,
    spriteUrl: "/game-assets/overworld/049_rocket_m.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Rocket: Ei, fique fora do nosso caminho! A Team Rocket não precisa de curiosos.",
    defeatedText:
      "Rocket: Certo, certo! Vou sair daqui. Não espere nenhum prêmio roubado de mim.",
    moneyMultiplier: 8,
    party: [
      {
        species: "machop",
        level: 17,
        moves: ["low-kick", "leer", "focus-energy", "karate-chop"],
      },
      {
        species: "drowzee",
        level: 17,
        moves: ["hypnosis", "disable", "confusion", "headbutt"],
      },
    ],
  },
  {
    id: "ssanne-deck-trevor",
    mapId: "ss-anne-deck",
    name: "Sailor Trevor",
    preferredPosition: { x: 12, y: 10 },
    facing: "north",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/062_sailor.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Trevor: Ahoy! Você está enjoado?",
    defeatedText:
      "Trevor: Foi só um descuido!",
    moneyMultiplier: 8,
    party: [
      {
        species: "machop",
        level: 17,
        moves: ["low-kick", "leer", "focus-energy", "karate-chop"],
      },
      {
        species: "tentacool",
        level: 17,
        moves: ["poison-sting", "supersonic", "wrap"],
      },
    ],
  },
  {
    id: "ssanne-deck-edmond",
    mapId: "ss-anne-deck",
    name: "Sailor Edmond",
    preferredPosition: { x: 6, y: 9 },
    facing: "south",
    sightRange: 1,
    spriteUrl: "/game-assets/overworld/062_sailor.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Edmond: Ei, camarada! Vamos dar uma dancinha?",
    defeatedText:
      "Edmond: Você é impressionante!",
    moneyMultiplier: 8,
    party: [
      {
        species: "machop",
        level: 18,
        moves: ["low-kick", "leer", "focus-energy", "karate-chop"],
      },
      {
        species: "shellder",
        level: 18,
        moves: ["tackle", "icicle-spear"],
      },
    ],
  },
  {
    id: "mtmoon-jovan",
    mapId: "mt-moon-1f",
    name: "Scientist Jovan",
    preferredPosition: { x: 30, y: 35 },
    facing: "south",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/055_scientist.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Jovan: O quê! Não me ataque de surpresa!",
    defeatedText:
      "Jovan: Meu Pokémon não serviu!",
    moneyMultiplier: 12,
    party: [
      {
        species: "magnemite",
        level: 11,
        moves: ["tackle", "thunder-shock", "supersonic"],
      },
      {
        species: "voltorb",
        level: 11,
        moves: ["tackle", "screech"],
      },
    ],
  },
  {
    id: "mtmoon-miriam",
    mapId: "mt-moon-1f",
    name: "Lass Miriam",
    preferredPosition: { x: 33, y: 4 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Miriam: Uau! É bem maior aqui dentro do que eu pensava!",
    defeatedText:
      "Miriam: Oh! Perdi!",
    moneyMultiplier: 4,
    party: [
      {
        species: "oddish",
        level: 11,
        moves: ["absorb", "sweet-scent"],
      },
      {
        species: "bellsprout",
        level: 11,
        moves: ["vine-whip", "growth", "wrap"],
      },
    ],
  },
  {
    id: "pewter-liam",
    mapId: "pewter-gym",
    name: "Camper Liam",
    preferredPosition: { x: 3, y: 8 },
    facing: "east",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/039_camper.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Liam: Pare aí mesmo, garoto! Você está a dez mil anos-luz de enfrentar o Brock!",
    defeatedText:
      "Liam: Droga! Anos-luz não é tempo… mede distância!",
    moneyMultiplier: 5,
    party: [
      {
        species: "geodude",
        level: 10,
        moves: ["tackle", "defense-curl"],
      },
      {
        species: "sandshrew",
        level: 11,
        moves: ["scratch", "defense-curl"],
      },
    ],
  },
  {
    id: "ssanne-1f-room-2-ann",
    mapId: "ss-anne-1f-room-2",
    name: "Lass Ann",
    preferredPosition: { x: 5, y: 3 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Ann: Colecionei estes Pokémon de todo o mundo!",
    defeatedText:
      "Ann: Ah, não! Dei a volta ao mundo por eles!",
    moneyMultiplier: 4,
    party: [
      {
        species: "pidgey",
        level: 18,
        moves: ["tackle", "sand-attack", "gust", "quick-attack"],
      },
      {
        species: "nidoran-f",
        level: 18,
        moves: ["growl", "scratch", "tail-whip", "poison-sting"],
      },
    ],
  },
  {
    id: "ssanne-1f-room-2-tyler",
    mapId: "ss-anne-1f-room-2",
    name: "Youngster Tyler",
    preferredPosition: { x: 0, y: 4 },
    facing: "east",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/018_youngster.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Tyler: Eu adoro Pokémon! E você?",
    defeatedText:
      "Tyler: Uau! Você é demais!",
    moneyMultiplier: 4,
    party: [
      {
        species: "nidoran-m",
        level: 21,
        moves: ["leer", "peck", "poison-sting"],
      },
    ],
  },
  {
    id: "ssanne-1f-room-5-arthur",
    mapId: "ss-anne-1f-room-5",
    name: "Gentleman Arthur",
    preferredPosition: { x: 2, y: 6 },
    facing: "north",
    sightRange: 4,
    spriteUrl: "/game-assets/overworld/061_gentleman.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Arthur: Seu insolente! Como ousa invadir!",
    defeatedText:
      "Arthur: Humpf! Criança mal-educada! Você não tem noção de cortesia!",
    moneyMultiplier: 18,
    party: [
      {
        species: "nidoran-m",
        level: 19,
        moves: ["leer", "peck", "poison-sting"],
      },
      {
        species: "nidoran-f",
        level: 19,
        moves: ["growl", "scratch", "tail-whip", "poison-sting"],
      },
    ],
  },
  {
    id: "ssanne-1f-room-7-thomas",
    mapId: "ss-anne-1f-room-7",
    name: "Gentleman Thomas",
    preferredPosition: { x: 4, y: 3 },
    facing: "west",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/061_gentleman.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Thomas: Sou apenas um viajante solitário… Meus únicos companheiros e amigos são os Pokémon que capturei em minhas viagens…",
    defeatedText:
      "Thomas: Meus amigos…",
    moneyMultiplier: 18,
    party: [
      {
        species: "growlithe",
        level: 18,
        moves: ["bite", "ember", "leer"],
      },
      {
        species: "growlithe",
        level: 18,
        moves: ["bite", "ember", "leer"],
      },
    ],
  },
  {
    id: "ssanne-2f-room-2-dale",
    mapId: "ss-anne-2f-room-2",
    name: "Fisher Dale",
    preferredPosition: { x: 5, y: 5 },
    facing: "west",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/057_fisher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Dale: Veja o que eu pesquei!",
    defeatedText:
      "Dale: Fui nocauteado!",
    moneyMultiplier: 10,
    party: [
      {
        species: "goldeen",
        level: 17,
        moves: ["peck", "tail-whip", "horn-attack"],
      },
      {
        species: "tentacool",
        level: 17,
        moves: ["poison-sting", "supersonic", "wrap"],
      },
      {
        species: "goldeen",
        level: 17,
        moves: ["peck", "tail-whip", "horn-attack"],
      },
    ],
  },
  {
    id: "ssanne-2f-room-2-brooks",
    mapId: "ss-anne-2f-room-2",
    name: "Gentleman Brooks",
    preferredPosition: { x: 1, y: 4 },
    facing: "east",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/061_gentleman.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Brooks: Competir com os jovens me mantém jovial.",
    defeatedText:
      "Brooks: Boa luta! Ah, me sinto jovem de novo!",
    moneyMultiplier: 18,
    party: [
      {
        species: "pikachu",
        level: 23,
        moves: ["thunder-wave", "quick-attack", "double-team", "slam"],
      },
    ],
  },
  {
    id: "ssanne-2f-room-4-lamar",
    mapId: "ss-anne-2f-room-4",
    name: "Gentleman Lamar",
    preferredPosition: { x: 0, y: 5 },
    facing: "east",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/061_gentleman.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Lamar: O que você considera mais valioso, um Pokémon forte ou um raro?",
    defeatedText:
      "Lamar: Preciso saudá-lo!",
    moneyMultiplier: 18,
    party: [
      {
        species: "growlithe",
        level: 17,
        moves: ["bite", "ember", "leer"],
      },
      {
        species: "ponyta",
        level: 17,
        moves: ["tackle", "growl", "tail-whip", "ember"],
      },
    ],
  },
  {
    id: "ssanne-2f-room-4-dawn",
    mapId: "ss-anne-2f-room-4",
    name: "Lass Dawn",
    preferredPosition: { x: 3, y: 3 },
    facing: "south",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/022_lass.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Dawn: Acho que não vi você na festa…",
    defeatedText:
      "Dawn: Calma!",
    moneyMultiplier: 4,
    party: [
      {
        species: "rattata",
        level: 18,
        moves: ["tackle", "tail-whip", "quick-attack", "hyper-fang"],
      },
      {
        species: "pikachu",
        level: 18,
        moves: ["tail-whip", "thunder-wave", "quick-attack", "double-team"],
      },
    ],
  },
  {
    id: "ssanne-b1f-room-1-barny",
    mapId: "ss-anne-b1f-room-1",
    name: "Fisher Barny",
    preferredPosition: { x: 5, y: 2 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/057_fisher.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Barny: Olá, estranho! Não sei dizer se você vem do mar ou das montanhas, mas pare e converse. Todos os meus Pokémon são do mar.",
    defeatedText:
      "Barny: Droga! Deixei esse escapar!",
    moneyMultiplier: 10,
    party: [
      {
        species: "tentacool",
        level: 17,
        moves: ["poison-sting", "supersonic", "wrap"],
      },
      {
        species: "staryu",
        level: 17,
        moves: ["tackle", "harden", "water-gun", "recover"],
      },
      {
        species: "shellder",
        level: 17,
        moves: ["tackle", "icicle-spear"],
      },
    ],
  },
  {
    id: "ssanne-b1f-room-1-phillip",
    mapId: "ss-anne-b1f-room-1",
    name: "Sailor Phillip",
    preferredPosition: { x: 3, y: 2 },
    facing: "south",
    sightRange: 2,
    spriteUrl: "/game-assets/overworld/062_sailor.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Phillip: Camarada, você está andando na prancha se perder!",
    defeatedText:
      "Phillip: Argh! Derrotado por uma criança!",
    moneyMultiplier: 8,
    party: [
      {
        species: "machop",
        level: 20,
        moves: ["low-kick", "leer", "focus-energy", "karate-chop"],
      },
    ],
  },
  {
    id: "ssanne-b1f-room-2-huey",
    mapId: "ss-anne-b1f-room-2",
    name: "Sailor Huey",
    preferredPosition: { x: 3, y: 5 },
    facing: "south",
    sightRange: 1,
    spriteUrl: "/game-assets/overworld/062_sailor.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Huey: Até nós, marinheiros, temos Pokémon!",
    defeatedText:
      "Huey: Tudo bem, você não é ruim.",
    moneyMultiplier: 8,
    party: [
      {
        species: "tentacool",
        level: 18,
        moves: ["poison-sting", "supersonic", "wrap"],
      },
      {
        species: "staryu",
        level: 18,
        moves: ["tackle", "harden", "water-gun", "recover"],
      },
    ],
  },
  {
    id: "ssanne-b1f-room-3-dylan",
    mapId: "ss-anne-b1f-room-3",
    name: "Sailor Dylan",
    preferredPosition: { x: 4, y: 4 },
    facing: "south",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/062_sailor.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Dylan: Eu gosto de crianças briguentas como você!",
    defeatedText:
      "Dylan: Argh! Perdi!",
    moneyMultiplier: 8,
    party: [
      {
        species: "horsea",
        level: 17,
        moves: ["bubble", "leer", "water-gun"],
      },
      {
        species: "horsea",
        level: 17,
        moves: ["bubble", "leer", "water-gun"],
      },
      {
        species: "horsea",
        level: 17,
        moves: ["bubble", "leer", "water-gun"],
      },
    ],
  },
  {
    id: "ssanne-b1f-room-4-duncan",
    mapId: "ss-anne-b1f-room-4",
    name: "Sailor Duncan",
    preferredPosition: { x: 3, y: 3 },
    facing: "south",
    sightRange: 3,
    spriteUrl: "/game-assets/overworld/062_sailor.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Duncan: Vamos lá, então! O orgulho deste marinheiro está em jogo!",
    defeatedText:
      "Duncan: Seu espírito me afundou!",
    moneyMultiplier: 8,
    party: [
      {
        species: "horsea",
        level: 17,
        moves: ["bubble", "leer", "water-gun"],
      },
      {
        species: "shellder",
        level: 17,
        moves: ["tackle", "icicle-spear"],
      },
      {
        species: "tentacool",
        level: 17,
        moves: ["poison-sting", "supersonic", "wrap"],
      },
    ],
  },
  {
    id: "ssanne-b1f-room-4-leonard",
    mapId: "ss-anne-b1f-room-4",
    name: "Sailor Leonard",
    preferredPosition: { x: 2, y: 6 },
    facing: "south",
    sightRange: 1,
    spriteUrl: "/game-assets/overworld/062_sailor.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    challengeText:
      "Leonard: Sabe o que dizem sobre marinheiros e batalhas!",
    defeatedText:
      "Leonard: Certo! Boa batalha, camarada!",
    moneyMultiplier: 8,
    party: [
      {
        species: "shellder",
        level: 21,
        moves: ["tackle", "icicle-spear"],
      },
    ],
  },
];

export const OVERWORLD_TRAINERS: readonly OverworldTrainerDefinition[] = [
  ...HAND_OVERWORLD_TRAINERS,
  ...CHAMPION_TRAINERS,
  ...GENERATED_TRAINERS.map((trainer) => ({
    ...trainer,
    ...TRAINER_TEXT_PT[trainer.id],
  })),
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


/**
 * Projects static trainer definitions through one player's private story.
 * Keep geometry/static definition shared; only defeated state is per player.
 */
export function resolvePlayerOverworldTrainers(
  mapId: string,
  layout: MapLayout | null,
  worldObjects: readonly WorldObject[],
  story: StoryState,
): OverworldTrainerInstance[] {
  return resolveOverworldTrainers(
    mapId,
    layout,
    worldObjects,
    [],
  )
    .filter(
      (trainer) =>
        !trainer.requiresRivalStarter ||
        trainer.requiresRivalStarter === story.rivalStarter,
    )
    .map((trainer) => ({
    ...trainer,
    defeated: isStoryTrainerDefeated(
      story,
      trainer.id,
    ),
  }));
}

export const ROUTE22_EARLY_RIVAL_TRAINER_ID =
  "route22-rival-early";

export const ROUTE22_EARLY_RIVAL_CHALLENGE_TEXT =
  "Blue: Ei! Você vai para a Pokémon League? Esquece! Sem insígnias o guarda não deixa passar. Aliás, seus Pokémon ficaram mais fortes?";

export function route22EarlyRivalParty(
  rivalStarter: StarterSpeciesId | null,
): DuelPokemonBuild[] | null {
  if (!rivalStarter) {
    return null;
  }

  const starter: DuelPokemonBuild =
    rivalStarter === "squirtle"
      ? {
          species: "squirtle",
          level: 9,
          moves: ["tackle", "tail-whip"],
        }
      : rivalStarter === "bulbasaur"
        ? {
            species: "bulbasaur",
            level: 9,
            moves: ["tackle", "growl"],
          }
        : {
            species: "charmander",
            level: 9,
            moves: ["scratch", "growl"],
          };

  return [
    {
      species: "pidgey",
      level: 9,
      moves: ["tackle", "sand-attack"],
    },
    starter,
  ];
}

export function route22EarlyRivalEncounter(
  rivalStarter: StarterSpeciesId | null,
): {
  id: string;
  name: string;
  rewardMoney: number;
  party: DuelPokemonBuild[];
} | null {
  const party = route22EarlyRivalParty(
    rivalStarter,
  );
  if (!party) {
    return null;
  }

  return {
    id: ROUTE22_EARLY_RIVAL_TRAINER_ID,
    name: "Blue",
    rewardMoney: trainerPrizeMoney(
      party,
      4,
    ),
    party,
  };
}

export function isRoute22EarlyRivalTriggerTile(
  mapId: string,
  x: number,
  y: number,
): boolean {
  return (
    mapId === "route-22" &&
    x === 33 &&
    y >= 4 &&
    y <= 6
  );
}

export const CERULEAN_RIVAL_TRAINER_ID =
  "cerulean-rival";

export const CERULEAN_RIVAL_CHALLENGE_TEXT =
  "Blue: Você ainda está por aqui? Deixe-me ver o que você capturou!";

export function ceruleanRivalParty(
  rivalStarter: StarterSpeciesId | null,
): DuelPokemonBuild[] | null {
  if (!rivalStarter) {
    return null;
  }

  const common: DuelPokemonBuild[] = [
    {
      species: "pidgeotto",
      level: 17,
      moves: [
        "tackle",
        "sand-attack",
        "gust",
        "quick-attack",
      ],
    },
    {
      species: "abra",
      level: 16,
      moves: ["teleport"],
    },
    {
      species: "rattata",
      level: 15,
      moves: [
        "tackle",
        "tail-whip",
        "quick-attack",
      ],
    },
  ];

  const starter: DuelPokemonBuild =
    rivalStarter === "squirtle"
      ? {
          species: "squirtle",
          level: 18,
          moves: [
            "tackle",
            "tail-whip",
            "withdraw",
            "water-gun",
          ],
        }
      : rivalStarter === "bulbasaur"
        ? {
            species: "bulbasaur",
            level: 18,
            moves: [
              "sleep-powder",
              "poison-powder",
              "vine-whip",
              "leech-seed",
            ],
          }
        : {
            species: "charmander",
            level: 18,
            moves: [
              "metal-claw",
              "ember",
              "growl",
              "scratch",
            ],
          };

  return [...common, starter];
}

export function ceruleanRivalEncounter(
  rivalStarter: StarterSpeciesId | null,
): {
  id: string;
  name: string;
  rewardMoney: number;
  party: DuelPokemonBuild[];
} | null {
  const party = ceruleanRivalParty(rivalStarter);
  if (!party) {
    return null;
  }

  return {
    id: CERULEAN_RIVAL_TRAINER_ID,
    name: "Blue",
    rewardMoney: trainerPrizeMoney(party, 4),
    party,
  };
}

export function isCeruleanRivalTriggerTile(
  mapId: string,
  x: number,
  y: number,
): boolean {
  return (
    mapId === "cerulean-city" &&
    y === 6 &&
    x >= 22 &&
    x <= 24
  );
}

/** @deprecated Use geometry + isStoryTrainerDefeated for player state. */
export function isCeruleanRivalTriggerAt(
  mapId: string,
  x: number,
  y: number,
  defeatedTrainerIds: readonly string[],
): boolean {
  return (
    isCeruleanRivalTriggerTile(mapId, x, y) &&
    !defeatedTrainerIds.includes(
      CERULEAN_RIVAL_TRAINER_ID,
    )
  );
}


export function isCeruleanRocketTriggerTile(
  mapId: string,
  x: number,
  y: number,
): boolean {
  return (
    mapId === "cerulean-city" &&
    x === 33 &&
    (y === 5 || y === 7)
  );
}

/** @deprecated Use geometry + player-owned story helpers. */
export function isCeruleanRocketTriggerAt(
  mapId: string,
  x: number,
  y: number,
  hasSsTicket: boolean,
  defeatedTrainerIds: readonly string[],
): boolean {
  return (
    isCeruleanRocketTriggerTile(mapId, x, y) &&
    hasSsTicket &&
    !defeatedTrainerIds.includes(
      CERULEAN_ROCKET_TRAINER_ID,
    )
  );
}


export const SS_ANNE_RIVAL_TRAINER_ID =
  "ss-anne-rival";

export const SS_ANNE_RIVAL_CHALLENGE_TEXT =
  "Blue: Bonjour! Imagine encontrar você aqui. Vamos ver como seu time está evoluindo!";

export function ssAnneRivalParty(
  rivalStarter: StarterSpeciesId | null,
): DuelPokemonBuild[] | null {
  if (!rivalStarter) {
    return null;
  }

  const common: DuelPokemonBuild[] = [
    {
      species: "pidgeotto",
      level: 19,
      moves: ["tackle", "sand-attack", "gust", "quick-attack"],
    },
    {
      species: "raticate",
      level: 16,
      moves: ["tackle", "tail-whip", "quick-attack", "hyper-fang"],
    },
    {
      species: "kadabra",
      level: 18,
      moves: ["teleport", "kinesis", "confusion", "disable"],
    },
  ];

  const starter: DuelPokemonBuild =
    rivalStarter === "squirtle"
      ? {
          species: "wartortle",
          level: 20,
          moves: ["bubble", "withdraw", "water-gun", "bite"],
        }
      : rivalStarter === "bulbasaur"
        ? {
            species: "ivysaur",
            level: 20,
            moves: ["leech-seed", "vine-whip", "poison-powder", "sleep-powder"],
          }
        : {
            species: "charmeleon",
            level: 20,
            moves: ["growl", "ember", "metal-claw", "smokescreen"],
          };

  return [...common, starter];
}

export function ssAnneRivalEncounter(
  rivalStarter: StarterSpeciesId | null,
): {
  id: string;
  name: string;
  rewardMoney: number;
  party: DuelPokemonBuild[];
} | null {
  const party = ssAnneRivalParty(rivalStarter);
  if (!party) {
    return null;
  }

  return {
    id: SS_ANNE_RIVAL_TRAINER_ID,
    name: "Blue",
    rewardMoney: trainerPrizeMoney(party, 9),
    party,
  };
}

export function isSsAnneRivalTriggerTile(
  mapId: string,
  x: number,
  y: number,
): boolean {
  return (
    mapId === "ss-anne-2f-corridor" &&
    y === 6 &&
    x >= 30 &&
    x <= 32
  );
}

/** @deprecated Use geometry + isStoryTrainerDefeated for player state. */
export function isSsAnneRivalTriggerAt(
  mapId: string,
  x: number,
  y: number,
  defeatedTrainerIds: readonly string[],
): boolean {
  return (
    isSsAnneRivalTriggerTile(mapId, x, y) &&
    !defeatedTrainerIds.includes(
      SS_ANNE_RIVAL_TRAINER_ID,
    )
  );
}

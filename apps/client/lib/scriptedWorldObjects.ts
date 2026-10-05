import type {
  DialogueInteractionRequest,
} from "./dialogueSystem";
import {
  CUT_TREES as GENERATED_CUT_TREES,
  CINNABAR_QUIZ as GENERATED_CINNABAR_QUIZ,
  SMASHABLE_ROCKS as GENERATED_ROCKS,
  KEY_ITEM_BALLS as GENERATED_KEY_ITEM_BALLS,
  MANSION_SWITCHES as GENERATED_MANSION_SWITCHES,
  SLOT_MACHINES as GENERATED_SLOT_MACHINES,
  STRENGTH_BOULDERS as GENERATED_BOULDERS,
} from "./generated/worldObstacles";
import {
  FUJI_RESCUED_EVENT,
  staticEncounterEventId,
} from "./questEvents";
import { GENERATED_NURSES } from "./generated/worldServices";
import {
  STATIC_WORLD_ENCOUNTERS,
  type WildBattleSpec,
} from "./staticEncounters";
import { POKEMON_CENTER_MAP_IDS } from "./healLocations";
import {
  OVERWORLD_PICKUPS,
} from "./overworldPickups";
import type {
  PlayerWorldCondition,
} from "./playerWorldProjection";
import {
  VERMILION_GYM_TRASH_CANS,
} from "./vermilionGym";

export type ScriptedWorldObjectDefinition = {
  id: string;
  mapId: string;
  label: string;
  x: number;
  y: number;
  spriteUrl: string;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  blocksMovement?: boolean;
  renderSprite?: boolean;
  visibleWhen?: PlayerWorldCondition;
  request: DialogueInteractionRequest;
  /** Interacting (after the dialogue) starts a one-off wild battle. */
  wildBattle?: WildBattleSpec;
  /** Strength boulder: can be pushed by walking into it. */
  pushable?: boolean;
};

const MT_MOON_FOSSIL_VISIBLE: PlayerWorldCondition = {
  kind: "all",
  conditions: [
    {
      kind: "event",
      namespace: "trainer",
      id: "mtmoon-miguel",
    },
    {
      kind: "choice",
      id: "mt-moon-fossil",
      set: false,
    },
  ],
};

const STATIC_SCRIPTED_WORLD_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] = [
    {
      id: "mt-moon-dome-fossil",
      mapId: "mt-moon-b2f",
      label: "Dome Fossil",
      x: 13,
      y: 7,
      spriteUrl: "/game-assets/overworld/098_fossil.png",
      frameWidth: 16,
      frameHeight: 16,
      sheetWidth: 16,
      sheetHeight: 16,
      visibleWhen: MT_MOON_FOSSIL_VISIBLE,
      request: {
        kind: "script",
        id: "fossil",
        context: {
          fossilId: "dome",
          fossilName: "Dome Fossil",
        },
      },
    },
    {
      id: "mt-moon-helix-fossil",
      mapId: "mt-moon-b2f",
      label: "Helix Fossil",
      x: 14,
      y: 7,
      spriteUrl: "/game-assets/overworld/098_fossil.png",
      frameWidth: 16,
      frameHeight: 16,
      sheetWidth: 16,
      sheetHeight: 16,
      visibleWhen: MT_MOON_FOSSIL_VISIBLE,
      request: {
        kind: "script",
        id: "fossil",
        context: {
          fossilId: "helix",
          fossilName: "Helix Fossil",
        },
      },
    },
    {
      id: "sea-cottage-bill-clefairy",
      mapId: "sea-cottage",
      label: "Bill",
      x: 10,
      y: 6,
      spriteUrl: "/game-assets/overworld/113_clefairy.png",
      frameWidth: 16,
      frameHeight: 16,
      sheetWidth: 96,
      sheetHeight: 32,
      visibleWhen: {
        kind: "not",
        condition: {
          kind: "any",
          conditions: [
            {
              kind: "choice",
              id: "bill-stage",
              equals: "teleporter-ready",
            },
            {
              kind: "choice",
              id: "bill-stage",
              equals: "helped",
            },
          ],
        },
      },
      request: {
        kind: "script",
        id: "bill",
      },
    },
    {
      id: "sea-cottage-bill",
      mapId: "sea-cottage",
      label: "Bill",
      x: 7,
      y: 5,
      spriteUrl: "/game-assets/overworld/073_bill.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
      visibleWhen: {
        kind: "choice",
        id: "bill-stage",
        equals: "helped",
      },
      request: {
        kind: "script",
        id: "bill",
      },
    },
    {
      id: "ss-anne-captain",
      mapId: "ss-anne-captains-office",
      label: "Captain",
      x: 5,
      y: 4,
      spriteUrl: "/game-assets/overworld/063_captain.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
      request: {
        kind: "script",
        id: "ss-anne-captain",
      },
    },
    {
      id: "vermilion-gym-cut-tree",
      mapId: "vermilion-city",
      label: "Cut Tree",
      x: 19,
      y: 24,
      spriteUrl: "/game-assets/overworld/095_cut_tree.png",
      frameWidth: 16,
      frameHeight: 16,
      sheetWidth: 64,
      sheetHeight: 16,
      visibleWhen: {
        kind: "event",
        namespace: "obstacle",
        id: "vermilion-gym-cut-tree",
        completed: false,
      },
      request: {
        kind: "script",
        id: "cut",
        context: {
          obstacleId: "vermilion-gym-cut-tree",
        },
      },
    },
  ];

const CUT_TREE_LOCATIONS = [
  { id: "viridian-cut-tree-south", mapId: "viridian-city", x: 11, y: 24 },
  { id: "viridian-cut-tree-north", mapId: "viridian-city", x: 18, y: 5 },
  { id: "pewter-cut-tree", mapId: "pewter-city", x: 30, y: 5 },
  { id: "cerulean-cut-tree-south", mapId: "cerulean-city", x: 26, y: 32 },
  { id: "cerulean-cut-tree-east", mapId: "cerulean-city", x: 50, y: 18 },
  { id: "route-2-cut-tree-south-1", mapId: "route-2", x: 16, y: 62 },
  { id: "route-2-cut-tree-south-2", mapId: "route-2", x: 15, y: 69 },
  { id: "route-2-cut-tree-north", mapId: "route-2", x: 11, y: 13 },
  { id: "route-2-cut-tree-middle", mapId: "route-2", x: 18, y: 26 },
  { id: "route-2-cut-tree-gate", mapId: "route-2", x: 6, y: 85 },
  { id: "route-25-cut-tree", mapId: "route-25", x: 30, y: 3 },
] as const;

const HAND_CUT_TREE_IDS = new Set<string>(
  CUT_TREE_LOCATIONS.map(
    (tree) => `${tree.mapId}:${tree.x},${tree.y}`,
  ),
);
// Vermilion's tree is a scripted object of its own (see above).
HAND_CUT_TREE_IDS.add("vermilion-city:19,24");

const ALL_CUT_TREE_LOCATIONS: readonly {
  id: string;
  mapId: string;
  x: number;
  y: number;
}[] = [
  ...CUT_TREE_LOCATIONS,
  ...GENERATED_CUT_TREES.filter(
    (tree) =>
      !HAND_CUT_TREE_IDS.has(`${tree.mapId}:${tree.x},${tree.y}`),
  ).map((tree) => ({
    id: `${tree.mapId}-cut-tree-${tree.x}-${tree.y}`,
    mapId: tree.mapId,
    x: tree.x,
    y: tree.y,
  })),
];

const CUT_TREE_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  ALL_CUT_TREE_LOCATIONS.map((tree) => ({
    id: tree.id,
    mapId: tree.mapId,
    label: "Cut Tree",
    x: tree.x,
    y: tree.y,
    spriteUrl: "/game-assets/overworld/095_cut_tree.png",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 64,
    sheetHeight: 16,
    visibleWhen: {
      kind: "event" as const,
      namespace: "obstacle" as const,
      id: tree.id,
      completed: false,
    },
    request: {
      kind: "script" as const,
      id: "cut",
      context: {
        obstacleId: tree.id,
      },
    },
  }));

export function strengthBoulderId(
  mapId: string,
  x: number,
  y: number,
): string {
  return `${mapId}-boulder-${x}-${y}`;
}

const BOULDER_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  GENERATED_BOULDERS.map((boulder) => ({
    id: strengthBoulderId(boulder.mapId, boulder.x, boulder.y),
    mapId: boulder.mapId,
    label: "Boulder",
    x: boulder.x,
    y: boulder.y,
    spriteUrl: "/game-assets/overworld/097_pushable_boulder.png",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 16,
    sheetHeight: 16,
    pushable: true,
    request: {
      kind: "script" as const,
      id: "strength-boulder",
    },
  }));

export function smashableRockId(
  mapId: string,
  x: number,
  y: number,
): string {
  return `${mapId}-rock-${x}-${y}`;
}

const ROCK_SMASH_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  GENERATED_ROCKS.map((rock) => {
    const id = smashableRockId(rock.mapId, rock.x, rock.y);
    return {
      id,
      mapId: rock.mapId,
      label: "Rock",
      x: rock.x,
      y: rock.y,
      spriteUrl: "/game-assets/overworld/096_rock_smash_rock.png",
      frameWidth: 16,
      frameHeight: 16,
      sheetWidth: 64,
      sheetHeight: 16,
      visibleWhen: {
        kind: "event" as const,
        namespace: "obstacle" as const,
        id,
        completed: false,
      },
      request: {
        kind: "script" as const,
        id: "rock-smash",
        context: { obstacleId: id },
      },
    };
  });

const KEY_ITEM_BALL_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  GENERATED_KEY_ITEM_BALLS.map((ball) => ({
    id: `${ball.mapId}-key-${ball.keyItem}`,
    mapId: ball.mapId,
    label: "Item Ball",
    x: ball.x,
    y: ball.y,
    spriteUrl: "/game-assets/overworld/092_item_ball.png",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 16,
    sheetHeight: 16,
    visibleWhen: {
      kind: "event" as const,
      namespace: "key-item" as const,
      id: ball.keyItem,
      completed: false,
    },
    request: {
      kind: "script" as const,
      id: "key-item-ball",
      context: {
        keyItemId: ball.keyItem,
      },
    },
  }));

function npcObject(
  id: string,
  mapId: string,
  label: string,
  x: number,
  y: number,
  spriteFile: string,
  scriptId: string,
  visibleWhen: PlayerWorldCondition,
): ScriptedWorldObjectDefinition {
  return {
    id,
    mapId,
    label,
    x,
    y,
    spriteUrl: `/game-assets/overworld/${spriteFile}`,
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    visibleWhen,
    request: { kind: "script", id: scriptId },
  };
}

function keyBallAfterTrainer(
  mapId: string,
  x: number,
  y: number,
  keyItem: string,
  trainerId: string,
): ScriptedWorldObjectDefinition {
  return {
    id: `${mapId}-key-${keyItem}`,
    mapId,
    label: "Item Ball",
    x,
    y,
    spriteUrl: "/game-assets/overworld/092_item_ball.png",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 16,
    sheetHeight: 16,
    visibleWhen: {
      kind: "all",
      conditions: [
        { kind: "event", namespace: "trainer", id: trainerId },
        {
          kind: "event",
          namespace: "key-item",
          id: keyItem,
          completed: false,
        },
      ],
    },
    request: {
      kind: "script",
      id: "key-item-ball",
      context: { keyItemId: keyItem },
    },
  };
}

function giftBall(
  id: string,
  mapId: string,
  x: number,
  y: number,
  scriptId: string,
  visibleWhen: PlayerWorldCondition,
): ScriptedWorldObjectDefinition {
  return {
    id,
    mapId,
    label: "Poké Ball",
    x,
    y,
    spriteUrl: "/game-assets/overworld/092_item_ball.png",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 16,
    sheetHeight: 16,
    visibleWhen,
    request: { kind: "script", id: scriptId },
  };
}

const giftNotReceived = (giftId: string): PlayerWorldCondition => ({
  kind: "event",
  namespace: "reward",
  id: `gift:${giftId}`,
  completed: false,
});

/** Saffron Dojo: after the master falls, pick Hitmonlee or Hitmonchan. */
const DOJO_PRIZE_VISIBLE: PlayerWorldCondition = {
  kind: "all",
  conditions: [
    { kind: "event", namespace: "trainer", id: "saffron-city-dojo-koichi" },
    giftNotReceived("hitmonlee"),
    giftNotReceived("hitmonchan"),
  ],
};

const QUEST_NPC_OBJECTS: readonly ScriptedWorldObjectDefinition[] = [
  giftBall(
    "celadon-roof-eevee",
    "celadon-city-condominiums-roof-room",
    7,
    3,
    "gift-eevee",
    giftNotReceived("eevee"),
  ),
  giftBall(
    "saffron-dojo-hitmonlee",
    "saffron-city-dojo",
    5,
    3,
    "gift-hitmonlee",
    DOJO_PRIZE_VISIBLE,
  ),
  giftBall(
    "saffron-dojo-hitmonchan",
    "saffron-city-dojo",
    7,
    3,
    "gift-hitmonchan",
    DOJO_PRIZE_VISIBLE,
  ),
  npcObject(
    "tower-fuji",
    "pokemon-tower-7f",
    "Mr. Fuji",
    11,
    4,
    "078_mr_fuji.png",
    "tower-fuji-rescue",
    {
      kind: "event",
      namespace: "story",
      id: FUJI_RESCUED_EVENT,
      completed: false,
    },
  ),
  npcObject(
    "lavender-fuji-house",
    "lavender-town-volunteer-pokemon-house",
    "Mr. Fuji",
    3,
    3,
    "078_mr_fuji.png",
    "lavender-fuji-house",
    { kind: "event", namespace: "story", id: FUJI_RESCUED_EVENT },
  ),
  // The Rocket Hideout B4F grunt/Giovanni drop the Lift Key / Silph Scope.
  keyBallAfterTrainer(
    "rocket-hideout-b-4f",
    3,
    2,
    "lift-key",
    "rocket-hideout-b-4f-grunt",
  ),
  keyBallAfterTrainer(
    "rocket-hideout-b-4f",
    20,
    5,
    "silph-scope",
    "rocket-hideout-b-4f-giovanni",
  ),
];

const SLOT_MACHINE_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  GENERATED_SLOT_MACHINES.map((machine) => ({
    id: `${machine.mapId}-slot-${machine.machine}`,
    mapId: machine.mapId,
    label: "Slot Machine",
    x: machine.x,
    y: machine.y,
    spriteUrl: "",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 16,
    sheetHeight: 16,
    // The machine is part of the map art; the object only makes it talkable.
    renderSprite: false,
    request: { kind: "script" as const, id: "slot-machine" },
  }));

const MANSION_SWITCH_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  GENERATED_MANSION_SWITCHES.map((statue) => ({
    id: `${statue.mapId}-switch-${statue.x}-${statue.y}`,
    mapId: statue.mapId,
    label: "Statue",
    x: statue.x,
    y: statue.y,
    spriteUrl: "",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 16,
    sheetHeight: 16,
    // The statue is part of the map art; the object only makes it pressable.
    renderSprite: false,
    request: { kind: "script" as const, id: "mansion-switch" },
  }));

const CINNABAR_QUIZ_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  GENERATED_CINNABAR_QUIZ.flatMap((quiz) =>
    quiz.machine.map(([x, y]) => ({
      id: `${quiz.mapId}-quiz-${quiz.id}-${x}-${y}`,
      mapId: quiz.mapId,
      label: "Quiz Machine",
      x,
      y,
      spriteUrl: "",
      frameWidth: 16,
      frameHeight: 16,
      sheetWidth: 16,
      sheetHeight: 16,
      // The machine is part of the map art; the object only makes it answerable.
      renderSprite: false,
      request: {
        kind: "script" as const,
        id: "cinnabar-quiz",
        context: { quizId: quiz.id },
      },
    })),
  );

const STATIC_ENCOUNTER_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  STATIC_WORLD_ENCOUNTERS.map((encounter) => ({
    id: encounter.id,
    mapId: encounter.mapId,
    label: encounter.label,
    x: encounter.x,
    y: encounter.y,
    spriteUrl: encounter.spriteUrl,
    frameWidth: 32,
    frameHeight: 32,
    sheetWidth: encounter.sheetWidth,
    sheetHeight: encounter.sheetHeight,
    visibleWhen: {
      kind: "event" as const,
      namespace: "story" as const,
      id: staticEncounterEventId(encounter.id),
      completed: false,
    },
    request: {
      kind: "script" as const,
      id: "static-pokemon",
      context: {
        staticId: encounter.id,
      },
    },
    // Legendary/mythical Pokémon are future MMO raids: no solo battle.
    wildBattle: encounter.raid
      ? undefined
      : {
          staticId: encounter.id,
          species: encounter.species,
          level: encounter.level,
          requiresKeyItem: encounter.requiresKeyItem,
        },
  }));

const CENTER_NURSES:
  readonly ScriptedWorldObjectDefinition[] =
  POKEMON_CENTER_MAP_IDS.map((mapId) => ({
    id: `${mapId}-nurse`,
    mapId,
    label: "Nurse",
    x: GENERATED_NURSES[mapId]?.x ?? 7,
    y: GENERATED_NURSES[mapId]?.y ?? 2,
    spriteUrl: "/game-assets/overworld/064_nurse.png",
    frameWidth: 16,
    frameHeight: 32,
    sheetWidth: 96,
    sheetHeight: 64,
    request: {
      kind: "script" as const,
      id: "pokemon-center-nurse",
    },
  }));

const PICKUP_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  OVERWORLD_PICKUPS.map((pickup) => ({
    id: pickup.id,
    mapId: pickup.mapId,
    label: pickup.hidden ? "Item oculto" : "Item Ball",
    x: pickup.x,
    y: pickup.y,
    spriteUrl: "/game-assets/overworld/092_item_ball.png",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 16,
    sheetHeight: 16,
    ...(pickup.hidden
      ? { blocksMovement: false, renderSprite: false }
      : {}),
    visibleWhen: {
      kind: "event" as const,
      namespace: "pickup" as const,
      id: pickup.id,
      completed: false,
    },
    request: {
      kind: "script" as const,
      id: "pickup",
      context: {
        pickupId: pickup.id,
        itemId: pickup.itemId,
        itemName: pickup.itemName,
      },
    },
  }));

const VERMILION_GYM_TRASH_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] =
  VERMILION_GYM_TRASH_CANS.map((can) => ({
    id: can.id,
    mapId: "vermilion-gym",
    label: "Lixeira",
    x: can.x,
    y: can.y,
    spriteUrl: "/game-assets/overworld/092_item_ball.png",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 16,
    sheetHeight: 16,
    blocksMovement: false,
    renderSprite: false,
    request: {
      kind: "script" as const,
      id: "vermilion-gym-trash-can",
      context: {
        canId: can.id,
      },
    },
  }));

export const SCRIPTED_WORLD_OBJECTS:
  readonly ScriptedWorldObjectDefinition[] = [
    ...STATIC_SCRIPTED_WORLD_OBJECTS,
    ...CUT_TREE_OBJECTS,
    ...BOULDER_OBJECTS,
    ...ROCK_SMASH_OBJECTS,
    ...KEY_ITEM_BALL_OBJECTS,
    ...SLOT_MACHINE_OBJECTS,
    ...CINNABAR_QUIZ_OBJECTS,
    ...MANSION_SWITCH_OBJECTS,
    ...QUEST_NPC_OBJECTS,
    ...STATIC_ENCOUNTER_OBJECTS,
    ...CENTER_NURSES,
    ...PICKUP_OBJECTS,
    ...VERMILION_GYM_TRASH_OBJECTS,
  ];

export function resolveScriptedWorldObjects(
  mapId: string,
): ScriptedWorldObjectDefinition[] {
  return SCRIPTED_WORLD_OBJECTS.filter(
    (object) => object.mapId === mapId,
  );
}

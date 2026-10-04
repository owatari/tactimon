import type {
  DialogueInteractionRequest,
} from "./dialogueSystem";
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
      sheetWidth: 16,
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

const POKEMON_CENTER_MAP_IDS = [
  "viridian-pokemon-center",
  "pewter-pokemon-center",
  "cerulean-pokemon-center",
  "vermilion-pokemon-center",
  "route-4-pokemon-center",
] as const;

const CENTER_NURSES:
  readonly ScriptedWorldObjectDefinition[] =
  POKEMON_CENTER_MAP_IDS.map((mapId) => ({
    id: `${mapId}-nurse`,
    mapId,
    label: "Nurse",
    x: 7,
    y: 2,
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
    label: "Item Ball",
    x: pickup.x,
    y: pickup.y,
    spriteUrl: "/game-assets/overworld/092_item_ball.png",
    frameWidth: 16,
    frameHeight: 16,
    sheetWidth: 16,
    sheetHeight: 16,
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

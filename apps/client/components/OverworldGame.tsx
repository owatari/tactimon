"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  DuelPokemonBuild,
  WildSpeciesId,
} from "@tactimon/battle-engine";
import { renderForegroundLayer } from "@/lib/mapRenderer";
import {
  BattleSceneContext,
  DIRECTION_DELTA,
  Direction,
  MapLayout,
  PLAYER_SPRITE,
  getMapCell,
  hydrateMapBehaviors,
  isCounterCell,
  isLedgeCell,
  isLedgeForDirection,
  isPokemonStoragePcAt,
  isWaterCell,
  resolveWarpTransitionAt,
  resolveWorldTransition,
  shouldApplyRespawnRequest,
  TILE_SIZE,
  WORLD_MAPS,
  WORLD_ZOOM,
  WorldMapData,
  WorldObject,
  WorldTransition,
} from "@/lib/maps";
import {
  applyStoryOverworldStep,
  grantRunningShoes,
  shouldGrantRunningShoes,
  hasStoryKeyItem,
  isStoryTrainerDefeated,
  storyHasHealthyPokemon,
  type StoryBadgeId,
  type StoryState,
} from "@/lib/story";
import {
  CERULEAN_RIVAL_CHALLENGE_TEXT,
  CERULEAN_RIVAL_TRAINER_ID,
  CERULEAN_ROCKET_TRAINER_ID,
  ROUTE22_EARLY_RIVAL_CHALLENGE_TEXT,
  ROUTE22_EARLY_RIVAL_TRAINER_ID,
  SS_ANNE_RIVAL_CHALLENGE_TEXT,
  SS_ANNE_RIVAL_TRAINER_ID,
  ceruleanRivalEncounter,
  isCeruleanRivalTriggerTile,
  isCeruleanRocketTriggerTile,
  isRoute22EarlyRivalTriggerTile,
  route22EarlyRivalEncounter,
  isSsAnneRivalTriggerTile,
  resolvePlayerOverworldTrainers,
  ssAnneRivalEncounter,
  type OverworldTrainerInstance,
} from "@/lib/trainers";
import {
  resolveWorldObjectDialogueRequest,
  type DialogueInteractionRequest,
  type DialoguePresentation,
} from "@/lib/dialogueSystem";
import {
  resolveScriptedWorldObjects,
} from "@/lib/scriptedWorldObjects";
import {
  resolveOverworldDialogues,
} from "@/lib/overworldDialogues";
import {
  LAND_ENCOUNTERS,
  resolveScaledWildEncounter,
  type WildEncounter,
} from "@/lib/wildEncounters";
import {
  projectPlayerWorldDefinitions,
  type PlayerWorldCondition,
} from "@/lib/playerWorldProjection";
import {
  resolveBlockedPlayerEdgeGate,
  resolveBlockedPlayerTileGate,
} from "@/lib/playerWorldGates";
import {
  isVermilionGymBeamWalkable,
} from "@/lib/vermilionGym";

const STEP_DURATION_MS = 250;
const RUN_STEP_DURATION_MS = 140;
const JUMP_DURATION_MS = 320;
const BLOCKED_RETRY_MS = 90;
const CAMERA_RESPONSE_MS = 72;
const POSITION_STORAGE_KEY = "tactimon.position.v1";
const RUN_MODE_STORAGE_KEY = "tactimon.run-mode.v1";
const FALLBACK_BATTLE_ARENA_WIDTH = 17;
const FALLBACK_BATTLE_ARENA_HEIGHT = 9;

const IDLE_FRAME: Record<Direction, number> = {
  south: 0,
  north: 1,
  west: 2,
  east: 2,
};

const WALK_FRAME: Record<Direction, [number, number]> = {
  south: [3, 4],
  north: [5, 6],
  west: [7, 8],
  east: [7, 8],
};

type Props = {
  story: StoryState;
  paused: boolean;
  respawnRequest: {
    id: number;
    mapId: string;
    spawn: { x: number; y: number };
  } | null;
  onRequestStarterChoice: () => void;
  onMapAudioContextChange: (context: {
    mapId: string;
    musicId: number | null;
  }) => void;
  onFirstBattleTrigger: (context: BattleSceneContext) => void;
  onWildBattleTrigger: (
    context: BattleSceneContext,
    encounter: {
      species: WildSpeciesId;
      level: number;
      members: readonly WildEncounter[];
      areaLevel: number;
      equivalentPartyStrength: number;
    },
  ) => void;
  onTrainerBattleTrigger: (
    context: BattleSceneContext,
    trainer: {
      id: string;
      name: string;
      rewardMoney: number;
      badgeId?: StoryBadgeId;
      party: readonly DuelPokemonBuild[];
    },
  ) => void;
  onMartOpen: () => void;
  /** Functional story update applied to GameClient's latest state. */
  onStoryUpdate: (
    update: (story: StoryState) => StoryState,
  ) => void;
  onRespawnApplied: (id: number) => void;
  onPokemonStorageOpen: () => void;
  onDialogueInteraction: (
    request: DialogueInteractionRequest,
  ) => DialoguePresentation;
};

type RuntimePlayer = {
  tileX: number;
  tileY: number;
  visualX: number;
  visualY: number;
  facing: Direction;
  moving: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  targetTileX: number;
  targetTileY: number;
  stepStartedAt: number;
  stepDuration: number;
  jumping: boolean;
  foot: 0 | 1;
  blockedUntil: number;
};

type StoryObjectBase = {
  id: string;
  label: string;
  visibleWhen?: PlayerWorldCondition;
  blocksMovement?: boolean;
  renderSprite?: boolean;
  x: number;
  y: number;
  spriteUrl: string;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
};

type StaticStoryObject = StoryObjectBase & {
  kind: "oak" | "rival" | "starter";
  starter?: "bulbasaur" | "charmander" | "squirtle";
};

type TrainerStoryObject = StoryObjectBase & {
  kind: "trainer";
  trainerId: string;
  trainerName: string;
  rewardMoney: number;
  badgeId?: StoryBadgeId;
  party: readonly DuelPokemonBuild[];
  facing: Direction;
  sightRange: number;
  challengeText: string;
  defeatedText: string;
  defeated: boolean;
};

type MartClerkStoryObject = StoryObjectBase & {
  kind: "mart-clerk";
};

type DialogueStoryObject = StoryObjectBase & {
  kind: "dialogue";
  request: DialogueInteractionRequest;
};

type StoryObject =
  | StaticStoryObject
  | TrainerStoryObject
  | MartClerkStoryObject
  | DialogueStoryObject;

function storyObjectBlocksMovement(
  object: StoryObject,
): boolean {
  return object.blocksMovement !== false;
}

function createPlayer(
  x: number,
  y: number,
  facing: Direction = "south",
): RuntimePlayer {
  return {
    tileX: x,
    tileY: y,
    visualX: x * TILE_SIZE,
    visualY: y * TILE_SIZE,
    facing,
    moving: false,
    fromX: x * TILE_SIZE,
    fromY: y * TILE_SIZE,
    toX: x * TILE_SIZE,
    toY: y * TILE_SIZE,
    targetTileX: x,
    targetTileY: y,
    stepStartedAt: 0,
    stepDuration: STEP_DURATION_MS,
    jumping: false,
    foot: 0,
    blockedUntil: 0,
  };
}

type SavedPlayerPosition = {
  mapId: string;
  x: number;
  y: number;
  facing: Direction;
};

function isDirection(value: unknown): value is Direction {
  return (
    value === "north" ||
    value === "south" ||
    value === "west" ||
    value === "east"
  );
}

function readSavedPlayerPosition(): SavedPlayerPosition | null {
  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedPlayerPosition>;
    if (
      typeof parsed.mapId !== "string" ||
      !WORLD_MAPS[parsed.mapId] ||
      typeof parsed.x !== "number" ||
      !Number.isInteger(parsed.x) ||
      typeof parsed.y !== "number" ||
      !Number.isInteger(parsed.y) ||
      !isDirection(parsed.facing)
    ) {
      return null;
    }

    return {
      mapId: parsed.mapId,
      x: parsed.x,
      y: parsed.y,
      facing: parsed.facing,
    };
  } catch {
    return null;
  }
}

function savePlayerPosition(
  mapId: string,
  player: RuntimePlayer,
): void {
  if (player.moving) return;

  try {
    window.localStorage.setItem(
      POSITION_STORAGE_KEY,
      JSON.stringify({
        mapId,
        x: player.tileX,
        y: player.tileY,
        facing: player.facing,
      } satisfies SavedPlayerPosition),
    );
  } catch {
    // Position persistence is an enhancement, not a runtime dependency.
  }
}

function keyToDirection(key: string): Direction | null {
  switch (key.toLowerCase()) {
    case "arrowup":
    case "w":
      return "north";
    case "arrowdown":
    case "s":
      return "south";
    case "arrowleft":
    case "a":
      return "west";
    case "arrowright":
    case "d":
      return "east";
    default:
      return null;
  }
}

function clampCamera(
  value: number,
  viewportSize: number,
  worldSize: number,
): number {
  if (worldSize <= viewportSize) {
    return (viewportSize - worldSize) / 2;
  }

  return Math.min(0, Math.max(viewportSize - worldSize, value));
}

function framePosition(frame: number) {
  return {
    x: -((frame % PLAYER_SPRITE.columns) * PLAYER_SPRITE.frameWidth),
    y: -(
      Math.floor(frame / PLAYER_SPRITE.columns) *
      PLAYER_SPRITE.frameHeight
    ),
  };
}

function renderableObjects(
  data: WorldMapData | null,
): WorldObject[] {
  if (!data) return [];

  return data.objects.filter(
    (object) =>
      object.flag_id === 0 &&
      Boolean(object.sprite_file) &&
      Boolean(object.frame_width) &&
      Boolean(object.frame_height),
  );
}

function displayObjectName(object: WorldObject): string {
  return (object.graphics_name ?? `NPC ${object.local_id}`)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function labStoryObjects(story: StoryState): StaticStoryObject[] {
  const objects: StaticStoryObject[] = [
    {
      id: "oak",
      kind: "oak",
      label: "Prof. Oak",
      x: 6,
      y: 3,
      spriteUrl: "/game-assets/overworld/071_prof_oak.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
    },
  ];

  if (!story.firstBattleComplete) {
    objects.push({
      id: "rival",
      kind: "rival",
      label: "Blue",
      x: 5,
      y: 4,
      spriteUrl: "/game-assets/overworld/072_blue.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
    });
  }

  const starters = [
    { starter: "bulbasaur" as const, x: 8 },
    { starter: "squirtle" as const, x: 9 },
    { starter: "charmander" as const, x: 10 },
  ];

  for (const item of starters) {
    const takenByPlayer = story.starter === item.starter;
    const takenByRival = story.rivalStarter === item.starter;

    if (takenByPlayer || takenByRival) {
      continue;
    }

    objects.push({
      id: `starter-${item.starter}`,
      kind: "starter",
      label:
        item.starter.charAt(0).toUpperCase() +
        item.starter.slice(1),
      starter: item.starter,
      x: item.x,
      y: 4,
      spriteUrl: "/game-assets/overworld/092_item_ball.png",
      frameWidth: 16,
      frameHeight: 16,
      sheetWidth: 16,
      sheetHeight: 16,
    });
  }

  return objects;
}

function trainerStoryObject(
  trainer: OverworldTrainerInstance,
): TrainerStoryObject {
  return {
    id: `trainer-${trainer.id}`,
    kind: "trainer",
    label: trainer.name,
    x: trainer.x,
    y: trainer.y,
    spriteUrl: trainer.spriteUrl,
    frameWidth: trainer.frameWidth,
    frameHeight: trainer.frameHeight,
    sheetWidth: trainer.sheetWidth,
    sheetHeight: trainer.sheetHeight,
    trainerId: trainer.id,
    trainerName: trainer.name,
    rewardMoney: trainer.rewardMoney,
    badgeId: trainer.badgeId,
    party: trainer.party,
    facing: trainer.facing,
    sightRange: trainer.sightRange,
    challengeText: trainer.challengeText,
    defeatedText: trainer.defeatedText,
    defeated: trainer.defeated,
  };
}

function martStoryObjects(
  mapId: string,
): StoryObject[] {
  return [
    {
      id: `${mapId}-clerk`,
      kind: "mart-clerk",
      label: "Clerk",
      x: 2,
      y: 3,
      spriteUrl: "/game-assets/overworld/068_clerk.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
    },
    {
      id: `${mapId}-youngster`,
      kind: "dialogue",
      label: "Youngster",
      x: 6,
      y: 2,
      spriteUrl: "/game-assets/overworld/018_youngster.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
      request: {
        kind: "script",
        id: "mart-youngster",
      },
    },
    {
      id: `${mapId}-woman`,
      kind: "dialogue",
      label: "Mulher",
      x: 9,
      y: 5,
      spriteUrl: "/game-assets/overworld/023_woman_1.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
      request: {
        kind: "script",
        id: "mart-woman",
      },
    },
  ];
}

function mapDialogueStoryObjects(
  mapId: string,
): DialogueStoryObject[] {
  return resolveOverworldDialogues(mapId).map(
    (dialogue) => ({
      id: dialogue.id,
      kind: "dialogue",
      label: dialogue.label,
      x: dialogue.x,
      y: dialogue.y,
      spriteUrl: dialogue.spriteUrl,
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
      request: {
        kind: "script",
        id: dialogue.dialogueId,
      },
    }),
  );
}

function scriptedStoryObjects(
  mapId: string,
): DialogueStoryObject[] {
  return resolveScriptedWorldObjects(mapId).map(
    (object) => ({
      ...object,
      kind: "dialogue" as const,
    }),
  );
}

function pokemonCenterStoryObjects(
  mapId: string,
): StoryObject[] {
  return [
    {
      id: `${mapId}-gentleman`,
      kind: "dialogue",
      label: "Gentleman",
      x: 12,
      y: 5,
      spriteUrl: "/game-assets/overworld/061_gentleman.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
      request: {
        kind: "script",
        id: "center-gentleman",
      },
    },
    {
      id: `${mapId}-boy`,
      kind: "dialogue",
      label: "Garoto",
      x: 4,
      y: 7,
      spriteUrl: "/game-assets/overworld/019_boy.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
      request: {
        kind: "script",
        id: "center-boy",
      },
    },
    {
      id: `${mapId}-youngster`,
      kind: "dialogue",
      label: "Youngster",
      x: 2,
      y: 3,
      spriteUrl: "/game-assets/overworld/018_youngster.png",
      frameWidth: 16,
      frameHeight: 32,
      sheetWidth: 96,
      sheetHeight: 64,
      request: {
        kind: "script",
        id: "center-youngster",
      },
    },
  ];
}

function mapStoryObjects(
  mapId: string,
  story: StoryState,
  layout: MapLayout | null,
  worldObjects: readonly WorldObject[],
): StoryObject[] {
  const objects: StoryObject[] =
    mapId === "oak-lab"
      ? [...labStoryObjects(story)]
      : mapId === "viridian-mart" ||
          mapId === "pewter-mart" ||
          mapId === "cerulean-mart" ||
          mapId === "vermilion-mart"
        ? martStoryObjects(mapId)
        : mapId === "viridian-pokemon-center" ||
            mapId === "pewter-pokemon-center" ||
            mapId === "cerulean-pokemon-center" ||
            mapId === "vermilion-pokemon-center" ||
            mapId === "route-4-pokemon-center"
          ? pokemonCenterStoryObjects(mapId)
          : [];

  objects.push(
    ...mapDialogueStoryObjects(mapId),
    ...scriptedStoryObjects(mapId),
  );

  for (const playerTrainer of resolvePlayerOverworldTrainers(
    mapId,
    layout,
    worldObjects,
    story,
  )) {

    if (
      playerTrainer.id ===
        CERULEAN_ROCKET_TRAINER_ID &&
      (
        !hasStoryKeyItem(story, "ss-ticket") ||
        playerTrainer.defeated
      )
    ) {
      continue;
    }

    objects.push(trainerStoryObject(playerTrainer));
  }

  return projectPlayerWorldDefinitions(
    objects,
    story,
  );
}

export function OverworldGame({
  story,
  paused,
  respawnRequest,
  onRequestStarterChoice,
  onMapAudioContextChange,
  onFirstBattleTrigger,
  onWildBattleTrigger,
  onTrainerBattleTrigger,
  onMartOpen,
  onStoryUpdate,
  onRespawnApplied,
  onPokemonStorageOpen,
  onDialogueInteraction,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const playerElementRef = useRef<HTMLDivElement>(null);
  const foregroundRef = useRef<HTMLCanvasElement>(null);

  const layoutRef = useRef<MapLayout | null>(null);
  const worldObjectsRef = useRef<WorldObject[]>([]);
  const storyObjectsRef = useRef<StoryObject[]>([]);
  const mapIdRef = useRef("pallet-town");
  const storyRef = useRef(story);
  const pausedRef = useRef(paused);
  const pendingWarpRef = useRef<WorldTransition | null>(null);
  const battleTriggerRef = useRef(false);
  const wildBattleLockRef = useRef(false);
  const trainerBattleLockRef = useRef(false);
  const wildEncounterCooldownRef = useRef(4);

  const playerRef = useRef(
    createPlayer(
      WORLD_MAPS["pallet-town"].spawn.x,
      WORLD_MAPS["pallet-town"].spawn.y,
    ),
  );
  const pressedRef = useRef<Direction[]>([]);
  const cameraPositionRef = useRef({ x: 0, y: 0, ready: false });
  const transitioningRef = useRef(false);
  const loadTokenRef = useRef(0);
  const runningRef = useRef(false);
  const runningShoesGrantRef = useRef(false);
  const appliedRespawnIdRef = useRef<number | null>(null);

  const [mapId, setMapId] = useState("pallet-town");
  const [layout, setLayout] = useState<MapLayout | null>(null);
  const [worldData, setWorldData] = useState<WorldMapData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [running, setRunning] = useState(false);
  const [dialogue, setDialogue] =
    useState<DialoguePresentation | null>(null);
  const [dialoguePageIndex, setDialoguePageIndex] =
    useState(0);
  const dialogueRef = useRef<DialoguePresentation | null>(
    null,
  );
  const dialoguePageIndexRef = useRef(0);
  const dialogueCompletionRef =
    useRef<(() => void) | null>(null);

  const mapDefinition = WORLD_MAPS[mapId];
  const visibleObjects = renderableObjects(worldData);
  const storyObjects = mapStoryObjects(
    mapId,
    story,
    layout,
    visibleObjects,
  );

  useEffect(() => {
    storyRef.current = story;
    storyObjectsRef.current = mapStoryObjects(
      mapIdRef.current,
      story,
      layoutRef.current,
      worldObjectsRef.current,
    );

    if (story.firstBattleComplete) {
      battleTriggerRef.current = false;
    }
  }, [story]);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      pressedRef.current = [];
      dialogueRef.current = null;
      dialoguePageIndexRef.current = 0;
      dialogueCompletionRef.current = null;
      setDialogue(null);
      setDialoguePageIndex(0);
    } else {
      wildBattleLockRef.current = false;
      trainerBattleLockRef.current = false;
    }
  }, [paused]);

  useEffect(() => {
    storyObjectsRef.current = storyObjects;
  }, [storyObjects]);

  const setDirectionPressed = useCallback(
    (direction: Direction, pressed: boolean) => {
      const withoutDirection = pressedRef.current.filter(
        (item) => item !== direction,
      );

      pressedRef.current = pressed
        ? [...withoutDirection, direction]
        : withoutDirection;
    },
    [],
  );

  const resetInput = useCallback(() => {
    pressedRef.current = [];
  }, []);

  const toggleRunning = useCallback(() => {
    if (!storyRef.current.runningShoesReceived) {
      return;
    }

    const next = !runningRef.current;
    runningRef.current = next;
    setRunning(next);
    try {
      window.localStorage.setItem(
        RUN_MODE_STORAGE_KEY,
        next ? "run" : "walk",
      );
    } catch {
      // Run preference persistence is optional.
    }
  }, []);

  const showDialogue = useCallback(
    (
      presentation: DialoguePresentation,
      onComplete?: () => void,
    ) => {
      dialogueRef.current = presentation;
      dialoguePageIndexRef.current = 0;
      dialogueCompletionRef.current =
        onComplete ?? null;
      setDialogue(presentation);
      setDialoguePageIndex(0);
      resetInput();
    },
    [resetInput],
  );

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(RUN_MODE_STORAGE_KEY);
      const next =
        storyRef.current.runningShoesReceived === true &&
        saved === "run";
      runningRef.current = next;
      setRunning(next);
    } catch {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (
      isTransitioning ||
      runningShoesGrantRef.current ||
      !shouldGrantRunningShoes(story, mapId)
    ) {
      return;
    }

    runningShoesGrantRef.current = true;
    storyRef.current = grantRunningShoes(story);
    onStoryUpdate(grantRunningShoes);
    showDialogue({
      id: "running-shoes-delivery",
      pages: [
        {
          id: "running-shoes-delivery-1",
          speaker: "Ajudante do Prof. Oak",
          text: "Ah, aí está você! O Prof. Oak pediu para eu te entregar isto. Você recebeu os RUNNING SHOES!",
        },
        {
          id: "running-shoes-delivery-2",
          speaker: "Ajudante do Prof. Oak",
          text: "Pressione R para alternar entre andar (WALK) e correr (RUN).",
        },
      ],
    });
  }, [
    isTransitioning,
    mapId,
    onStoryUpdate,
    showDialogue,
    story,
  ]);

  const showInteraction = useCallback(
    (
      message: string,
      id = "system-message",
      speaker?: string,
    ) => {
      showDialogue(
        onDialogueInteraction({
          kind: "text",
          id,
          text: message,
          speaker,
        }),
      );
    },
    [onDialogueInteraction, showDialogue],
  );

  const advanceDialogue = useCallback((): boolean => {
    const active = dialogueRef.current;
    if (!active) return false;

    const currentPage =
      active.pages[dialoguePageIndexRef.current];
    if (currentPage?.choices?.length) {
      return true;
    }

    const next = dialoguePageIndexRef.current + 1;
    if (next < active.pages.length) {
      dialoguePageIndexRef.current = next;
      setDialoguePageIndex(next);
      return true;
    }

    const onComplete =
      dialogueCompletionRef.current;
    dialogueRef.current = null;
    dialoguePageIndexRef.current = 0;
    dialogueCompletionRef.current = null;
    setDialoguePageIndex(0);
    setDialogue(null);
    onComplete?.();
    return true;
  }, []);

  const createBattleContext =
    useCallback((): BattleSceneContext | null => {
      const player = playerRef.current;
      const activeLayout = layoutRef.current;
      const definition = WORLD_MAPS[mapIdRef.current];

      if (!activeLayout || !definition) {
        return null;
      }

      const viewport = viewportRef.current;
      const visibleTileWidth = viewport
        ? Math.max(
            3,
            Math.floor(
              viewport.clientWidth / (TILE_SIZE * WORLD_ZOOM),
            ),
          )
        : FALLBACK_BATTLE_ARENA_WIDTH;
      const visibleTileHeight = viewport
        ? Math.max(
            3,
            Math.floor(
              viewport.clientHeight / (TILE_SIZE * WORLD_ZOOM),
            ),
          )
        : FALLBACK_BATTLE_ARENA_HEIGHT;
      const arenaWidth = Math.min(
        visibleTileWidth,
        activeLayout.width,
      );
      const arenaHeight = Math.min(
        visibleTileHeight,
        activeLayout.height,
      );
      const cropX = Math.max(
        0,
        Math.min(
          activeLayout.width - arenaWidth,
          player.tileX - Math.floor(arenaWidth / 2),
        ),
      );
      const cropY = Math.max(
        0,
        Math.min(
          activeLayout.height - arenaHeight,
          player.tileY - Math.floor(arenaHeight / 2),
        ),
      );

      const blocked: Array<{ x: number; y: number }> = [];

      for (
        let localY = 0;
        localY < arenaHeight;
        localY += 1
      ) {
        for (
          let localX = 0;
          localX < arenaWidth;
          localX += 1
        ) {
          const worldX = cropX + localX;
          const worldY = cropY + localY;
          const cell =
            activeLayout.cells[
              worldY * activeLayout.width + worldX
            ];
          const occupied =
            worldObjectsRef.current.some(
              (object) =>
                object.x === worldX &&
                object.y === worldY,
            ) ||
            storyObjectsRef.current.some(
              (object) =>
                storyObjectBlocksMovement(object) &&
                object.x === worldX &&
                object.y === worldY,
            );

          if (
            !cell ||
            isWaterCell(activeLayout, worldX, worldY) ||
            (cell.collision !== 0 &&
              !isVermilionGymBeamWalkable(
                storyRef.current,
                mapIdRef.current,
                worldX,
                worldY,
              )) ||
            occupied
          ) {
            blocked.push({
              x: localX,
              y: localY,
            });
          }
        }
      }

      const seedBuffer = new Uint32Array(1);
      if (
        typeof crypto !== "undefined" &&
        crypto.getRandomValues
      ) {
        crypto.getRandomValues(seedBuffer);
      } else {
        seedBuffer[0] = Date.now() >>> 0;
      }

      return {
        mapId: mapIdRef.current,
        mapLabel: definition.label,
        previewUrl: definition.previewUrl,
        mapWidth: activeLayout.width,
        mapHeight: activeLayout.height,
        cropX,
        cropY,
        arenaWidth,
        arenaHeight,
        blocked,
        seed: seedBuffer[0],
      };
    }, []);

  const triggerTrainerBattle = useCallback(
    (trainer: TrainerStoryObject) => {
      const currentStory = storyRef.current;

      if (trainer.defeated) {
        showInteraction(
          trainer.defeatedText.replace(
            /^[^:]+:\s*/,
            "",
          ),
          `trainer:${trainer.trainerId}:defeated`,
          trainer.trainerName,
        );
        return;
      }

      if (
        !currentStory.starter ||
        !currentStory.playerPokemon ||
        !currentStory.firstBattleComplete
      ) {
        showInteraction(
          `${trainer.trainerName}: Volte quando tiver começado sua jornada.`,
        );
        return;
      }

      if (!storyHasHealthyPokemon(currentStory)) {
        showInteraction(
          "Seu time está sem HP. Procure o Pokémon Center de Viridian.",
        );
        return;
      }

      if (trainerBattleLockRef.current) {
        return;
      }

      const context = createBattleContext();
      if (!context) {
        return;
      }

      trainerBattleLockRef.current = true;
      resetInput();
      showDialogue(
        onDialogueInteraction({
          kind: "text",
          id: `trainer:${trainer.trainerId}:challenge`,
          speaker: trainer.trainerName,
          text: trainer.challengeText.replace(
            /^[^:]+:\s*/,
            "",
          ),
        }),
        () => {
          onTrainerBattleTrigger(context, {
            id: trainer.trainerId,
            name: trainer.trainerName,
            rewardMoney: trainer.rewardMoney,
            badgeId: trainer.badgeId,
            party: trainer.party,
          });
        },
      );
    },
    [
      createBattleContext,
      onTrainerBattleTrigger,
      resetInput,
      showDialogue,
      showInteraction,
      onDialogueInteraction,
    ],
  );

  const interact = useCallback(() => {
    if (pausedRef.current) {
      return;
    }

    if (advanceDialogue()) {
      return;
    }

    const player = playerRef.current;
    const delta = DIRECTION_DELTA[player.facing];
    const targetX = player.tileX + delta.x;
    const targetY = player.tileY + delta.y;

    if (
      mapIdRef.current === "sea-cottage" &&
      player.facing === "north" &&
      targetX === 4 &&
      targetY === 5
    ) {
      showDialogue(
        onDialogueInteraction({
          kind: "script",
          id: "bill-computer",
        }),
      );
      return;
    }

    if (
      isPokemonStoragePcAt(
        mapIdRef.current,
        targetX,
        targetY,
      )
    ) {
      onPokemonStorageOpen();
      return;
    }

    const interactionPoints = [
      { x: targetX, y: targetY },
    ];

    if (
      isCounterCell(
        layoutRef.current,
        targetX,
        targetY,
      )
    ) {
      interactionPoints.push({
        x: targetX + delta.x,
        y: targetY + delta.y,
      });
    }

    const storyObject = interactionPoints
      .map(({ x, y }) =>
        storyObjectsRef.current.find(
          (candidate) =>
            candidate.x === x && candidate.y === y,
        ),
      )
      .find(
        (candidate): candidate is StoryObject =>
          candidate !== undefined,
      );

    if (storyObject) {
      if (
        storyObject.kind === "starter" &&
        !storyRef.current.starter
      ) {
        onRequestStarterChoice();
        return;
      }

      if (storyObject.kind === "oak") {
        if (!storyRef.current.starter) {
          onRequestStarterChoice();
        } else {
          showDialogue(
            onDialogueInteraction({
              kind: "script",
              id: "lab-oak",
            }),
          );
        }
        return;
      }

      if (storyObject.kind === "rival") {
        showDialogue(
          onDialogueInteraction({
            kind: "script",
            id: "lab-rival",
          }),
        );
        return;
      }

      if (storyObject.kind === "trainer") {
        triggerTrainerBattle(storyObject);
        return;
      }

      if (storyObject.kind === "mart-clerk") {
        onMartOpen();
        return;
      }

      if (storyObject.kind === "dialogue") {
        showDialogue(
          onDialogueInteraction(storyObject.request),
        );
        return;
      }

      showInteraction(
        `${storyObject.label} ficou no laboratório de Oak.`,
      );
      return;
    }

    const object = interactionPoints
      .map(({ x, y }) =>
        worldObjectsRef.current.find(
          (candidate) =>
            candidate.x === x && candidate.y === y,
        ),
      )
      .find(
        (candidate): candidate is WorldObject =>
          candidate !== undefined,
      );

    if (object) {
      showDialogue(
        onDialogueInteraction(
          resolveWorldObjectDialogueRequest(
            mapIdRef.current,
            object.x,
            object.y,
            displayObjectName(object),
          ),
        ),
      );
    }
  }, [
    advanceDialogue,
    onDialogueInteraction,
    onMartOpen,
    onStoryUpdate,
    onPokemonStorageOpen,
    onRequestStarterChoice,
    showDialogue,
    showInteraction,
    triggerTrainerBattle,
  ]);

  const loadMap = useCallback(
    async (
      nextMapId: string,
      spawn: { x: number; y: number },
      facing: Direction,
    ) => {
      const definition = WORLD_MAPS[nextMapId];
      if (!definition) return;

      const token = loadTokenRef.current + 1;
      loadTokenRef.current = token;
      transitioningRef.current = true;
      setIsTransitioning(true);
      resetInput();

      try {
        const [layoutResponse, worldResponse] = await Promise.all([
          fetch(definition.layoutUrl),
          definition.worldUrl
            ? fetch(definition.worldUrl)
            : Promise.resolve(null),
        ]);

        if (!layoutResponse.ok) {
          throw new Error(
            `Failed to load ${definition.label}: ${layoutResponse.status}`,
          );
        }

        const rawLayout =
          (await layoutResponse.json()) as MapLayout;
        const nextLayout = await hydrateMapBehaviors(
          rawLayout,
          definition.tilesets,
        );
        const nextWorldData = worldResponse?.ok
          ? ((await worldResponse.json()) as WorldMapData)
          : null;

        if (loadTokenRef.current !== token) {
          return;
        }

        mapIdRef.current = nextMapId;
        layoutRef.current = nextLayout;
        worldObjectsRef.current =
          renderableObjects(nextWorldData);
        storyObjectsRef.current = mapStoryObjects(
          nextMapId,
          storyRef.current,
          nextLayout,
          worldObjectsRef.current,
        );
        const requestedCell = getMapCell(
          nextLayout,
          spawn.x,
          spawn.y,
        );
        const resolvedSpawn =
          requestedCell && requestedCell.collision === 0
            ? spawn
            : definition.spawn;

        playerRef.current = createPlayer(
          resolvedSpawn.x,
          resolvedSpawn.y,
          facing,
        );
        savePlayerPosition(
          nextMapId,
          playerRef.current,
        );
        pendingWarpRef.current = null;
        cameraPositionRef.current.ready = false;

        setMapId(nextMapId);
        setLayout(nextLayout);
        setWorldData(nextWorldData);
        onMapAudioContextChange({
          mapId: nextMapId,
          musicId:
            nextWorldData?.music ??
            definition.fallbackMusicId,
        });

        requestAnimationFrame(() => {
          transitioningRef.current = false;
          setIsTransitioning(false);
        });
      } catch (error) {
        console.error(error);
        transitioningRef.current = false;
        setIsTransitioning(false);
      }
    },
    [onMapAudioContextChange, resetInput],
  );

  useEffect(() => {
    const saved = readSavedPlayerPosition();
    const currentStory = storyRef.current;
    const canResumeSavedPosition = Boolean(
      currentStory.starter &&
        currentStory.playerPokemon,
    );
    const initialMapId =
      canResumeSavedPosition && saved
        ? saved.mapId
        : "pallet-town";
    const initialDefinition = WORLD_MAPS[initialMapId];

    void loadMap(
      initialMapId,
      canResumeSavedPosition && saved
        ? { x: saved.x, y: saved.y }
        : initialDefinition.spawn,
      canResumeSavedPosition && saved
        ? saved.facing
        : "south",
    );
  }, [loadMap]);

  useEffect(() => {
    if (
      !respawnRequest ||
      !shouldApplyRespawnRequest(
        respawnRequest,
        appliedRespawnIdRef.current,
      )
    ) {
      return;
    }

    appliedRespawnIdRef.current = respawnRequest.id;
    void loadMap(
      respawnRequest.mapId,
      respawnRequest.spawn,
      "south",
    );
    onRespawnApplied(respawnRequest.id);
  }, [loadMap, onRespawnApplied, respawnRequest]);

  useEffect(() => {
    if (!layout || !foregroundRef.current) {
      return;
    }

    const canvas = foregroundRef.current;
    canvas.getContext("2d")?.clearRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    void renderForegroundLayer(
      canvas,
      layout,
      mapDefinition.tilesets,
    ).catch((error) => {
      console.error("Failed to build foreground layer", error);
    });
  }, [layout, mapDefinition.tilesets]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (pausedRef.current) {
        return;
      }

      const lowerKey = event.key.toLowerCase();

      if (
        lowerKey === "r" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        if (!event.repeat) toggleRunning();
        return;
      }

      if (
        event.key === " " ||
        event.key === "Enter" ||
        lowerKey === "e"
      ) {
        event.preventDefault();
        if (!event.repeat) interact();
        return;
      }

      const direction = keyToDirection(event.key);
      if (!direction) return;

      event.preventDefault();
      setDirectionPressed(direction, true);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const direction = keyToDirection(event.key);
      if (!direction) return;

      event.preventDefault();
      setDirectionPressed(direction, false);
    };

    const onBlur = () => resetInput();

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [interact, resetInput, setDirectionPressed, toggleRunning]);

  useEffect(() => {
    let animationFrame = 0;
    let previousTime = performance.now();

    const isOccupied = (x: number, y: number) =>
      worldObjectsRef.current.some(
        (object) => object.x === x && object.y === y,
      ) ||
      storyObjectsRef.current.some(
        (object) =>
          storyObjectBlocksMovement(object) &&
          object.x === x &&
          object.y === y,
      );

    const canWalk = (
      activeLayout: MapLayout,
      x: number,
      y: number,
    ) => {
      if (
        x < 0 ||
        y < 0 ||
        x >= activeLayout.width ||
        y >= activeLayout.height
      ) {
        return false;
      }

      const cell = activeLayout.cells[y * activeLayout.width + x];
      if (
        !cell ||
        (cell.collision !== 0 &&
          !isVermilionGymBeamWalkable(
            storyRef.current,
            mapIdRef.current,
            x,
            y,
          ))
      ) {
        return false;
      }

      return !isOccupied(x, y);
    };

    const startStep = (
      direction: Direction,
      now: number,
    ): boolean => {
      const activeLayout = layoutRef.current;
      const player = playerRef.current;

      if (
        !activeLayout ||
        transitioningRef.current ||
        pausedRef.current ||
        dialogueRef.current
      ) {
        return false;
      }

      player.facing = direction;
      savePlayerPosition(
        mapIdRef.current,
        player,
      );

      const edgeTransition = resolveWorldTransition(
        mapIdRef.current,
        player.tileX,
        player.tileY,
        direction,
      );

      if (edgeTransition) {
        const blockedGate = resolveBlockedPlayerEdgeGate(
          storyRef.current,
          mapIdRef.current,
          edgeTransition.mapId,
        );
        if (blockedGate) {
          showDialogue(
            onDialogueInteraction(
              blockedGate.blockedRequest,
            ),
          );
          player.blockedUntil = now + 500;
          return false;
        }

        const nextStory =
          applyStoryOverworldStep(
            storyRef.current,
          );
        storyRef.current = nextStory;
        onStoryUpdate(applyStoryOverworldStep);
        if (!storyHasHealthyPokemon(nextStory)) {
          return false;
        }

        void loadMap(
          edgeTransition.mapId,
          edgeTransition.spawn,
          direction,
        );
        return false;
      }

      const delta = DIRECTION_DELTA[direction];
      const nextX = player.tileX + delta.x;
      const nextY = player.tileY + delta.y;

      const blockedTileGate =
        resolveBlockedPlayerTileGate(
          storyRef.current,
          mapIdRef.current,
          nextX,
          nextY,
        );
      if (blockedTileGate) {
        showDialogue(
          onDialogueInteraction(
            blockedTileGate.blockedRequest,
          ),
        );
        player.blockedUntil = now + 500;
        return false;
      }

      if (
        isLedgeForDirection(
          activeLayout,
          nextX,
          nextY,
          direction,
        )
      ) {
        const landingX = nextX + delta.x;
        const landingY = nextY + delta.y;
        const landingWarp = resolveWarpTransitionAt(
          mapIdRef.current,
          landingX,
          landingY,
        );

        if (
          !landingWarp &&
          !canWalk(activeLayout, landingX, landingY)
        ) {
          player.blockedUntil = now + BLOCKED_RETRY_MS;
          return false;
        }

        player.moving = true;
        player.jumping = true;
        player.stepDuration = JUMP_DURATION_MS;
        player.fromX = player.visualX;
        player.fromY = player.visualY;
        player.toX = landingX * TILE_SIZE;
        player.toY = landingY * TILE_SIZE;
        player.targetTileX = landingX;
        player.targetTileY = landingY;
        player.stepStartedAt = now;
        player.foot = player.foot === 0 ? 1 : 0;
        pendingWarpRef.current = landingWarp;
        return true;
      }

      if (
        isLedgeCell(
          activeLayout,
          nextX,
          nextY,
        )
      ) {
        // A directional ledge approached from the wrong side remains blocked.
        player.blockedUntil = now + BLOCKED_RETRY_MS;
        return false;
      }

      const warp = resolveWarpTransitionAt(
        mapIdRef.current,
        nextX,
        nextY,
      );

      if (!warp && !canWalk(activeLayout, nextX, nextY)) {
        player.blockedUntil = now + BLOCKED_RETRY_MS;
        return false;
      }

      player.moving = true;
      player.jumping = false;
      player.stepDuration =
        storyRef.current.runningShoesReceived &&
        runningRef.current
          ? RUN_STEP_DURATION_MS
          : STEP_DURATION_MS;
      player.fromX = player.visualX;
      player.fromY = player.visualY;
      player.toX = nextX * TILE_SIZE;
      player.toY = nextY * TILE_SIZE;
      player.targetTileX = nextX;
      player.targetTileY = nextY;
      player.stepStartedAt = now;
      player.foot = player.foot === 0 ? 1 : 0;
      pendingWarpRef.current = warp;

      return true;
    };

    const maybeTriggerLabBattle = () => {
      const player = playerRef.current;
      const currentStory = storyRef.current;

      if (
        mapIdRef.current !== "oak-lab" ||
        !currentStory.starter ||
        currentStory.firstBattleComplete ||
        battleTriggerRef.current
      ) {
        return;
      }

      if (
        player.tileY === 8 &&
        player.tileX >= 5 &&
        player.tileX <= 7
      ) {
        const context = createBattleContext();
        if (!context) return;

        battleTriggerRef.current = true;
        resetInput();
        onFirstBattleTrigger(context);
      }
    };

    const maybeTriggerRoute22RivalBattle = () => {
      const player = playerRef.current;
      const currentStory = storyRef.current;

      if (
        isStoryTrainerDefeated(
          currentStory,
          ROUTE22_EARLY_RIVAL_TRAINER_ID,
        ) ||
        !isRoute22EarlyRivalTriggerTile(
          mapIdRef.current,
          player.tileX,
          player.tileY,
        ) ||
        !currentStory.firstBattleComplete ||
        !currentStory.playerPokemon ||
        !storyHasHealthyPokemon(currentStory) ||
        trainerBattleLockRef.current
      ) {
        return;
      }

      const encounter =
        route22EarlyRivalEncounter(
          currentStory.rivalStarter,
        );
      const context = createBattleContext();
      if (!encounter || !context) {
        return;
      }

      trainerBattleLockRef.current = true;
      resetInput();
      showDialogue(
        onDialogueInteraction({
          kind: "text",
          id: "trainer:route22-rival-early:challenge",
          speaker: "Blue",
          text: ROUTE22_EARLY_RIVAL_CHALLENGE_TEXT.replace(
            /^Blue:\s*/,
            "",
          ),
        }),
        () => {
          onTrainerBattleTrigger(
            context,
            encounter,
          );
        },
      );
    };

    const maybeTriggerCeruleanRivalBattle = () => {
      const player = playerRef.current;
      const currentStory = storyRef.current;

      if (
        isStoryTrainerDefeated(
          currentStory,
          CERULEAN_RIVAL_TRAINER_ID,
        ) ||
        !isCeruleanRivalTriggerTile(
          mapIdRef.current,
          player.tileX,
          player.tileY,
        ) ||
        !currentStory.firstBattleComplete ||
        !currentStory.playerPokemon ||
        !storyHasHealthyPokemon(currentStory) ||
        trainerBattleLockRef.current
      ) {
        return;
      }

      const encounter = ceruleanRivalEncounter(
        currentStory.rivalStarter,
      );
      if (!encounter) {
        return;
      }

      const context = createBattleContext();
      if (!context) {
        return;
      }

      trainerBattleLockRef.current = true;
      resetInput();
      showInteraction(
        CERULEAN_RIVAL_CHALLENGE_TEXT,
      );
      onTrainerBattleTrigger(context, encounter);
    };

    const maybeTriggerSsAnneRivalBattle = () => {
      const player = playerRef.current;
      const currentStory = storyRef.current;

      if (
        isStoryTrainerDefeated(
          currentStory,
          SS_ANNE_RIVAL_TRAINER_ID,
        ) ||
        !isSsAnneRivalTriggerTile(
          mapIdRef.current,
          player.tileX,
          player.tileY,
        ) ||
        !currentStory.firstBattleComplete ||
        !currentStory.playerPokemon ||
        !storyHasHealthyPokemon(currentStory) ||
        trainerBattleLockRef.current
      ) {
        return;
      }

      const encounter = ssAnneRivalEncounter(
        currentStory.rivalStarter,
      );
      if (!encounter) {
        return;
      }

      const context = createBattleContext();
      if (!context) {
        return;
      }

      trainerBattleLockRef.current = true;
      resetInput();
      showInteraction(
        SS_ANNE_RIVAL_CHALLENGE_TEXT,
      );
      onTrainerBattleTrigger(context, encounter);
    };

    const maybeTriggerCeruleanRocketBattle = () => {
      const player = playerRef.current;
      const currentStory = storyRef.current;

      if (
        isStoryTrainerDefeated(
          currentStory,
          CERULEAN_ROCKET_TRAINER_ID,
        ) ||
        !isCeruleanRocketTriggerTile(
          mapIdRef.current,
          player.tileX,
          player.tileY,
        ) ||
        !hasStoryKeyItem(
          currentStory,
          "ss-ticket",
        ) ||
        !currentStory.firstBattleComplete ||
        !currentStory.playerPokemon ||
        !storyHasHealthyPokemon(currentStory) ||
        trainerBattleLockRef.current
      ) {
        return;
      }

      const rocket = storyObjectsRef.current.find(
        (
          object,
        ): object is TrainerStoryObject =>
          object.kind === "trainer" &&
          object.trainerId ===
            CERULEAN_ROCKET_TRAINER_ID,
      );
      if (!rocket) {
        return;
      }

      triggerTrainerBattle(rocket);
    };

    const maybeTriggerWildBattle = () => {
      const activeLayout = layoutRef.current;
      const player = playerRef.current;
      const currentStory = storyRef.current;

      const encounterTable =
        LAND_ENCOUNTERS[mapIdRef.current];

      if (
        !encounterTable ||
        !activeLayout ||
        !currentStory.playerPokemon ||
        !currentStory.firstBattleComplete ||
        !storyHasHealthyPokemon(currentStory) ||
        wildBattleLockRef.current
      ) {
        return;
      }

      const cell =
        activeLayout.cells[
          player.tileY * activeLayout.width + player.tileX
        ];

      if (!cell) {
        return;
      }

      const terrain = encounterTable.terrain ?? "grass";
      // Grass encounters keep the FireRed 0x00D metatile rule. Cave tables
      // instead roll on any walkable cave-floor tile.
      if (
        (terrain === "grass" && cell.metatile !== 0x00d) ||
        (terrain === "cave" && cell.collision !== 0)
      ) {
        return;
      }

      if (wildEncounterCooldownRef.current > 0) {
        wildEncounterCooldownRef.current -= 1;
        return;
      }

      const rollBuffer = new Uint32Array(1);
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(rollBuffer);
      } else {
        rollBuffer[0] = Date.now() >>> 0;
      }

      const encounterRoll = rollBuffer[0] % 100;
      if (
        encounterRoll >= encounterTable.encounterRate
      ) {
        return;
      }

      const context = createBattleContext();
      if (!context) return;

      const partyLevels = [
        currentStory.playerPokemon,
        ...currentStory.capturedPokemon,
      ]
        .slice(0, 6)
        .filter(
          (pokemon) =>
            pokemon.currentHp > 0,
        )
        .map((pokemon) => pokemon.level);
      const encounter =
        resolveScaledWildEncounter(
          mapIdRef.current,
          rollBuffer[0] >>> 8,
          partyLevels,
        );
      if (!encounter) {
        return;
      }

      const primary = encounter.members[0];
      wildBattleLockRef.current = true;
      wildEncounterCooldownRef.current = 5;
      resetInput();
      onWildBattleTrigger(context, {
        species: primary.species,
        level: primary.level,
        members: encounter.members,
        areaLevel: encounter.areaLevel,
        equivalentPartyStrength:
          encounter.equivalentPartyStrength,
      });
    };

    const maybeTriggerTrainerBattle = () => {
      const activeLayout = layoutRef.current;
      const player = playerRef.current;
      const currentStory = storyRef.current;

      if (
        !activeLayout ||
        !currentStory.firstBattleComplete ||
        trainerBattleLockRef.current
      ) {
        return;
      }

      for (const object of storyObjectsRef.current) {
        if (
          object.kind !== "trainer" ||
          object.defeated
        ) {
          continue;
        }

        const delta =
          DIRECTION_DELTA[object.facing];

        for (
          let distance = 1;
          distance <= object.sightRange;
          distance += 1
        ) {
          const x =
            object.x + delta.x * distance;
          const y =
            object.y + delta.y * distance;

          if (
            x < 0 ||
            y < 0 ||
            x >= activeLayout.width ||
            y >= activeLayout.height
          ) {
            break;
          }

          if (
            player.tileX === x &&
            player.tileY === y
          ) {
            triggerTrainerBattle(object);
            return;
          }

          const cell =
            activeLayout.cells[
              y * activeLayout.width + x
            ];

          if (
            !cell ||
            (cell.collision !== 0 &&
              !isVermilionGymBeamWalkable(
                storyRef.current,
                mapIdRef.current,
                x,
                y,
              )) ||
            worldObjectsRef.current.some(
              (worldObject) =>
                worldObject.x === x &&
                worldObject.y === y,
            ) ||
            storyObjectsRef.current.some(
              (storyObject) =>
                storyObject.id !== object.id &&
                storyObjectBlocksMovement(storyObject) &&
                storyObject.x === x &&
                storyObject.y === y,
            )
          ) {
            break;
          }
        }
      }
    };

    const renderScene = (
      now: number,
      deltaTime: number,
    ) => {
      const activeLayout = layoutRef.current;
      const viewport = viewportRef.current;
      const camera = cameraRef.current;
      const playerElement = playerElementRef.current;
      const player = playerRef.current;

      if (!activeLayout || !viewport || !camera || !playerElement) {
        return;
      }

      let frame = IDLE_FRAME[player.facing];
      let jumpLift = 0;

      if (player.moving) {
        const progress = Math.min(
          1,
          (now - player.stepStartedAt) /
            Math.max(1, player.stepDuration),
        );

        if (player.jumping) {
          jumpLift =
            Math.sin(progress * Math.PI) *
            TILE_SIZE *
            0.8;
        }

        player.visualX =
          player.fromX + (player.toX - player.fromX) * progress;
        player.visualY =
          player.fromY + (player.toY - player.fromY) * progress;

        frame =
          progress < 0.72
            ? WALK_FRAME[player.facing][player.foot]
            : IDLE_FRAME[player.facing];

        if (progress >= 1) {
          player.visualX = player.toX;
          player.visualY = player.toY;
          player.tileX = player.targetTileX;
          player.tileY = player.targetTileY;
          player.moving = false;
          player.jumping = false;
          jumpLift = 0;

          const pendingWarp =
            pendingWarpRef.current;
          pendingWarpRef.current = null;

          savePlayerPosition(
            mapIdRef.current,
            player,
          );
          const nextStory =
            applyStoryOverworldStep(
              storyRef.current,
            );
          storyRef.current = nextStory;
          onStoryUpdate(applyStoryOverworldStep);

          if (
            !storyHasHealthyPokemon(nextStory)
          ) {
            return;
          }

          if (pendingWarp) {
            void loadMap(
              pendingWarp.mapId,
              pendingWarp.spawn,
              player.facing,
            );
            return;
          }

          maybeTriggerLabBattle();
          maybeTriggerRoute22RivalBattle();
          maybeTriggerCeruleanRivalBattle();
          maybeTriggerSsAnneRivalBattle();
          maybeTriggerCeruleanRocketBattle();
          maybeTriggerTrainerBattle();
          maybeTriggerWildBattle();
        }
      }

      if (
        !player.moving &&
        !transitioningRef.current &&
        !pausedRef.current &&
        now >= player.blockedUntil
      ) {
        const intent =
          pressedRef.current[pressedRef.current.length - 1];

        if (intent) {
          startStep(intent, now);
        }
      }

      if (!player.moving) {
        frame = IDLE_FRAME[player.facing];
      }

      const frameOffset = framePosition(frame);
      playerElement.style.left = `${player.visualX}px`;
      playerElement.style.top =
        `${player.visualY - TILE_SIZE - jumpLift}px`;
      playerElement.style.backgroundPosition =
        `${frameOffset.x}px ${frameOffset.y}px`;
      playerElement.style.transform =
        player.facing === "east" ? "scaleX(-1)" : "scaleX(1)";
      playerElement.style.zIndex = String(
        100 + Math.round(player.visualY),
      );

      const viewportWidth = viewport.clientWidth;
      const viewportHeight = viewport.clientHeight;
      const worldWidth =
        activeLayout.width * TILE_SIZE * WORLD_ZOOM;
      const worldHeight =
        activeLayout.height * TILE_SIZE * WORLD_ZOOM;

      const targetCameraX = clampCamera(
        viewportWidth / 2 -
          (player.visualX + TILE_SIZE / 2) * WORLD_ZOOM,
        viewportWidth,
        worldWidth,
      );
      const targetCameraY = clampCamera(
        viewportHeight / 2 -
          (player.visualY + TILE_SIZE / 2) * WORLD_ZOOM,
        viewportHeight,
        worldHeight,
      );

      const cameraPosition = cameraPositionRef.current;

      if (!cameraPosition.ready) {
        cameraPosition.x = targetCameraX;
        cameraPosition.y = targetCameraY;
        cameraPosition.ready = true;
      } else {
        const response =
          1 - Math.exp(-deltaTime / CAMERA_RESPONSE_MS);
        cameraPosition.x +=
          (targetCameraX - cameraPosition.x) * response;
        cameraPosition.y +=
          (targetCameraY - cameraPosition.y) * response;
      }

      camera.style.transform =
        `translate3d(${cameraPosition.x}px, ${cameraPosition.y}px, 0)`;
    };

    const tick = (now: number) => {
      const deltaTime = Math.min(50, now - previousTime);
      previousTime = now;
      renderScene(now, deltaTime);
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, [
    createBattleContext,
    loadMap,
    onFirstBattleTrigger,
    onTrainerBattleTrigger,
    onWildBattleTrigger,
    resetInput,
    showInteraction,
    triggerTrainerBattle,
  ]);

  const handlePadPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    direction: Direction,
  ) => {
    event.preventDefault();
    if (pausedRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDirectionPressed(direction, true);
  };

  const handlePadPointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
    direction: Direction,
  ) => {
    event.preventDefault();
    setDirectionPressed(direction, false);
  };

  return (
    <div
      ref={viewportRef}
      className="viewport"
      tabIndex={0}
      aria-label="Tactimon overworld"
    >
      {layout && (
        <div ref={cameraRef} className="camera-layer">
          <div
            className="world"
            style={{
              width: layout.width * TILE_SIZE,
              height: layout.height * TILE_SIZE,
              transform: `scale(${WORLD_ZOOM})`,
            }}
          >
            <div
              className="map-base"
              style={{
                backgroundImage: `url("${mapDefinition.previewUrl}")`,
              }}
            />

            {visibleObjects.map((object) => {
              const frameWidth = object.frame_width ?? 16;
              const frameHeight = object.frame_height ?? 16;
              const frameCount = Math.max(1, object.frame_count);
              const columns = Math.max(1, Math.min(6, frameCount));
              const rows = Math.ceil(frameCount / columns);

              return (
                <div
                  key={`world-${object.local_id}`}
                  className="world-object"
                  title={displayObjectName(object)}
                  style={{
                    left: object.x * TILE_SIZE,
                    top:
                      object.y * TILE_SIZE +
                      TILE_SIZE -
                      frameHeight,
                    width: frameWidth,
                    height: frameHeight,
                    zIndex: 100 + object.y * TILE_SIZE,
                    backgroundImage: `url("/game-assets/${object.sprite_file}")`,
                    backgroundSize:
                      `${columns * frameWidth}px ${rows * frameHeight}px`,
                  }}
                />
              );
            })}

            {storyObjects
              .filter(
                (object) => object.renderSprite !== false,
              )
              .map((object) => (
              <div
                key={object.id}
                className="world-object story-object"
                title={object.label}
                style={{
                  left: object.x * TILE_SIZE,
                  top:
                    object.y * TILE_SIZE +
                    TILE_SIZE -
                    object.frameHeight,
                  width: object.frameWidth,
                  height: object.frameHeight,
                  zIndex: 100 + object.y * TILE_SIZE,
                  backgroundImage: `url("${object.spriteUrl}")`,
                  backgroundSize:
                    `${object.sheetWidth}px ${object.sheetHeight}px`,
                }}
              />
              ))}

            <div
              ref={playerElementRef}
              className="player"
              style={{
                width: PLAYER_SPRITE.frameWidth,
                height: PLAYER_SPRITE.frameHeight,
                backgroundImage: `url("${PLAYER_SPRITE.url}")`,
                backgroundSize:
                  `${PLAYER_SPRITE.sheetWidth}px ${PLAYER_SPRITE.sheetHeight}px`,
              }}
            />

            <canvas
              ref={foregroundRef}
              className="map-foreground"
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      <div className="world-hud">
        <div key={mapId} className="location-chip location-enter">
          {mapDefinition.label}
        </div>
        <div className="world-resource-chip">
          <strong>₽{story.money.toLocaleString("pt-BR")}</strong>
          <span>Potion ×{story.inventory.potion}</span>
          <span>Ball ×{story.inventory["poke-ball"]}</span>
        </div>
        {story.runningShoesReceived && (
          <button
            type="button"
            className="run-mode-indicator"
            onClick={toggleRunning}
            aria-pressed={running}
            title="R alterna caminhada e corrida"
          >
            {running ? "RUN" : "WALK"}
          </button>
        )}
        <div className="control-hint">
          WASD / setas · E/Space interage
          {story.runningShoesReceived ? " · R alterna WALK/RUN" : ""}
        </div>
      </div>

      {dialogue && dialogue.pages[dialoguePageIndex] && (
        <div className="interaction-toast dialogue-panel">
          {dialogue.pages[dialoguePageIndex].speaker && (
            <strong className="dialogue-speaker">
              {dialogue.pages[dialoguePageIndex].speaker}
            </strong>
          )}
          <span>
            {dialogue.pages[dialoguePageIndex].text}
          </span>
          {dialogue.pages[dialoguePageIndex].choices?.length ? (
            <div className="dialogue-choices">
              {dialogue.pages[
                dialoguePageIndex
              ].choices?.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="dialogue-continue"
                  onClick={() => {
                    showDialogue(
                      onDialogueInteraction(
                        choice.request,
                      ),
                    );
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              className="dialogue-continue"
              onClick={() => {
                advanceDialogue();
              }}
            >
              {dialoguePageIndex + 1}/{dialogue.pages.length}
              {" · "}Avançar
            </button>
          )}
        </div>
      )}

      <div
        className={`transition-curtain ${
          isTransitioning ? "visible" : ""
        }`}
      />

      <div className="touch-dpad" aria-label="Controles direcionais">
        {(
          [
            ["north", "▲"],
            ["west", "◀"],
            ["south", "▼"],
            ["east", "▶"],
          ] as const
        ).map(([direction, icon]) => (
          <button
            key={direction}
            type="button"
            className={direction}
            aria-label={direction}
            onPointerDown={(event) =>
              handlePadPointerDown(event, direction)
            }
            onPointerUp={(event) =>
              handlePadPointerUp(event, direction)
            }
            onPointerCancel={(event) =>
              handlePadPointerUp(event, direction)
            }
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

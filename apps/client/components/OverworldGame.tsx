"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { renderForegroundLayer } from "@/lib/mapRenderer";
import {
  DIRECTION_DELTA,
  Direction,
  MapLayout,
  PLAYER_SPRITE,
  resolveWorldTransition,
  TILE_SIZE,
  WORLD_MAPS,
  WORLD_ZOOM,
  WorldMapData,
  WorldObject,
} from "@/lib/maps";

const STEP_DURATION_MS = 142;
const BLOCKED_RETRY_MS = 90;
const CAMERA_RESPONSE_MS = 72;
const INTERACTION_DURATION_MS = 1800;

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
  foot: 0 | 1;
  blockedUntil: number;
};

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
    foot: 0,
    blockedUntil: 0,
  };
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

export function OverworldGame() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const playerElementRef = useRef<HTMLDivElement>(null);
  const foregroundRef = useRef<HTMLCanvasElement>(null);

  const layoutRef = useRef<MapLayout | null>(null);
  const worldDataRef = useRef<WorldMapData | null>(null);
  const worldObjectsRef = useRef<WorldObject[]>([]);
  const mapIdRef = useRef("pallet-town");
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
  const interactionTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const [mapId, setMapId] = useState("pallet-town");
  const [layout, setLayout] = useState<MapLayout | null>(null);
  const [worldData, setWorldData] = useState<WorldMapData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [interaction, setInteraction] = useState<string | null>(null);

  const mapDefinition = WORLD_MAPS[mapId];
  const visibleObjects = renderableObjects(worldData);

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

  const showInteraction = useCallback((message: string) => {
    if (interactionTimerRef.current) {
      clearTimeout(interactionTimerRef.current);
    }

    setInteraction(message);
    interactionTimerRef.current = setTimeout(() => {
      setInteraction(null);
    }, INTERACTION_DURATION_MS);
  }, []);

  const interact = useCallback(() => {
    const player = playerRef.current;
    const delta = DIRECTION_DELTA[player.facing];
    const targetX = player.tileX + delta.x;
    const targetY = player.tileY + delta.y;

    const object = worldObjectsRef.current.find(
      (candidate) =>
        candidate.x === targetX &&
        candidate.y === targetY,
    );

    if (object) {
      showInteraction(
        `${displayObjectName(object)} · diálogo ainda não importado`,
      );
    }
  }, [showInteraction]);

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
          fetch(definition.worldUrl),
        ]);

        if (!layoutResponse.ok) {
          throw new Error(
            `Failed to load ${definition.label}: ${layoutResponse.status}`,
          );
        }

        const nextLayout =
          (await layoutResponse.json()) as MapLayout;
        const nextWorldData = worldResponse.ok
          ? ((await worldResponse.json()) as WorldMapData)
          : null;

        if (loadTokenRef.current !== token) {
          return;
        }

        mapIdRef.current = nextMapId;
        layoutRef.current = nextLayout;
        worldDataRef.current = nextWorldData;
        worldObjectsRef.current = renderableObjects(nextWorldData);
        playerRef.current = createPlayer(
          spawn.x,
          spawn.y,
          facing,
        );
        cameraPositionRef.current.ready = false;

        setMapId(nextMapId);
        setLayout(nextLayout);
        setWorldData(nextWorldData);

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
    [resetInput],
  );

  useEffect(() => {
    void loadMap(
      "pallet-town",
      WORLD_MAPS["pallet-town"].spawn,
      "south",
    );
  }, [loadMap]);

  useEffect(() => {
    return () => {
      if (interactionTimerRef.current) {
        clearTimeout(interactionTimerRef.current);
      }
    };
  }, []);

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
      const lowerKey = event.key.toLowerCase();

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
  }, [interact, resetInput, setDirectionPressed]);

  useEffect(() => {
    let animationFrame = 0;
    let previousTime = performance.now();

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
      if (!cell || cell.collision !== 0) {
        return false;
      }

      return !worldObjectsRef.current.some(
        (object) => object.x === x && object.y === y,
      );
    };

    const startStep = (
      direction: Direction,
      now: number,
    ): boolean => {
      const activeLayout = layoutRef.current;
      const player = playerRef.current;

      if (!activeLayout || transitioningRef.current) {
        return false;
      }

      player.facing = direction;

      const transition = resolveWorldTransition(
        mapIdRef.current,
        player.tileX,
        player.tileY,
        direction,
      );

      if (transition) {
        void loadMap(
          transition.mapId,
          transition.spawn,
          direction,
        );
        return false;
      }

      const delta = DIRECTION_DELTA[direction];
      const nextX = player.tileX + delta.x;
      const nextY = player.tileY + delta.y;

      if (!canWalk(activeLayout, nextX, nextY)) {
        player.blockedUntil = now + BLOCKED_RETRY_MS;
        return false;
      }

      player.moving = true;
      player.fromX = player.visualX;
      player.fromY = player.visualY;
      player.toX = nextX * TILE_SIZE;
      player.toY = nextY * TILE_SIZE;
      player.targetTileX = nextX;
      player.targetTileY = nextY;
      player.stepStartedAt = now;
      player.foot = player.foot === 0 ? 1 : 0;

      return true;
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

      if (player.moving) {
        const progress = Math.min(
          1,
          (now - player.stepStartedAt) / STEP_DURATION_MS,
        );

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
        }
      }

      if (
        !player.moving &&
        !transitioningRef.current &&
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
      playerElement.style.top = `${player.visualY - TILE_SIZE}px`;
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
  }, [loadMap]);

  const handlePadPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    direction: Direction,
  ) => {
    event.preventDefault();
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
                  key={object.local_id}
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
        <div className="control-hint">
          WASD / setas · E/Space interage
        </div>
      </div>

      {interaction && (
        <div className="interaction-toast">{interaction}</div>
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

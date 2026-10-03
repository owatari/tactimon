"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapLayout,
  PLAYER_SPRITE,
  TILE_SIZE,
  WORLD_MAPS,
} from "@/lib/maps";

type Direction = "south" | "north" | "west" | "east";

type PlayerState = {
  x: number;
  y: number;
  facing: Direction;
};

const VIEWPORT_WIDTH = 768;
const VIEWPORT_HEIGHT = 576;
const ZOOM = 3;
const MOVE_COOLDOWN_MS = 115;

const IDLE_FRAME: Record<Direction, number> = {
  south: 0,
  north: 1,
  west: 2,
  east: 2,
};

const WALK_FRAMES: Record<Direction, [number, number]> = {
  south: [3, 4],
  north: [5, 6],
  west: [7, 8],
  east: [7, 8],
};

const DELTA: Record<Direction, { x: number; y: number }> = {
  south: { x: 0, y: 1 },
  north: { x: 0, y: -1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
};

function framePosition(frame: number) {
  const column = frame % PLAYER_SPRITE.columns;
  const row = Math.floor(frame / PLAYER_SPRITE.columns);
  return {
    x: -(column * PLAYER_SPRITE.frameWidth),
    y: -(row * PLAYER_SPRITE.frameHeight),
  };
}

export function OverworldGame() {
  const mapDefinition = WORLD_MAPS["pallet-town"];
  const [layout, setLayout] = useState<MapLayout | null>(null);
  const [player, setPlayer] = useState<PlayerState>({
    ...mapDefinition.spawn,
    facing: "south",
  });
  const [walking, setWalking] = useState(false);
  const [walkPhase, setWalkPhase] = useState(0);
  const [showCollision, setShowCollision] = useState(false);
  const lastMoveAt = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    fetch(mapDefinition.layoutUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load map layout: ${response.status}`);
        }
        return response.json() as Promise<MapLayout>;
      })
      .then((data) => {
        if (active) setLayout(data);
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    return () => {
      active = false;
    };
  }, [mapDefinition.layoutUrl]);

  useEffect(() => {
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
    };
  }, []);

  const cellAt = useCallback(
    (x: number, y: number) => {
      if (!layout || x < 0 || y < 0 || x >= layout.width || y >= layout.height) {
        return null;
      }
      return layout.cells[y * layout.width + x] ?? null;
    },
    [layout],
  );

  const canWalk = useCallback(
    (x: number, y: number) => {
      const cell = cellAt(x, y);
      return Boolean(cell && cell.collision === 0);
    },
    [cellAt],
  );

  const move = useCallback(
    (direction: Direction) => {
      const now = performance.now();
      if (now - lastMoveAt.current < MOVE_COOLDOWN_MS) return;
      lastMoveAt.current = now;

      setPlayer((current) => {
        const delta = DELTA[direction];
        const nextX = current.x + delta.x;
        const nextY = current.y + delta.y;

        if (!canWalk(nextX, nextY)) {
          return { ...current, facing: direction };
        }

        setWalking(true);
        setWalkPhase((phase) => (phase + 1) % 2);

        if (stopTimer.current) clearTimeout(stopTimer.current);
        stopTimer.current = setTimeout(() => setWalking(false), MOVE_COOLDOWN_MS);

        return {
          x: nextX,
          y: nextY,
          facing: direction,
        };
      });
    },
    [canWalk],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction: Direction | undefined =
        event.key === "ArrowUp" || event.key.toLowerCase() === "w"
          ? "north"
          : event.key === "ArrowDown" || event.key.toLowerCase() === "s"
            ? "south"
            : event.key === "ArrowLeft" || event.key.toLowerCase() === "a"
              ? "west"
              : event.key === "ArrowRight" || event.key.toLowerCase() === "d"
                ? "east"
                : undefined;

      if (!direction) return;
      event.preventDefault();
      move(direction);
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  const currentCell = cellAt(player.x, player.y);
  const frame = walking
    ? WALK_FRAMES[player.facing][walkPhase]
    : IDLE_FRAME[player.facing];
  const frameOffset = framePosition(frame);

  const camera = useMemo(() => {
    const playerCenterX = (player.x * TILE_SIZE + TILE_SIZE / 2) * ZOOM;
    const playerFeetY = (player.y * TILE_SIZE + TILE_SIZE) * ZOOM;

    return {
      x: VIEWPORT_WIDTH / 2 - playerCenterX,
      y: VIEWPORT_HEIGHT / 2 - playerFeetY,
    };
  }, [player.x, player.y]);

  if (!layout) {
    return <div className="loading-state">Carregando Pallet Town…</div>;
  }

  return (
    <div className="game-layout">
      <div
        className="viewport"
        style={{
          width: VIEWPORT_WIDTH,
          height: VIEWPORT_HEIGHT,
        }}
      >
        <div
          className="world"
          style={{
            width: layout.width * TILE_SIZE,
            height: layout.height * TILE_SIZE,
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${ZOOM})`,
          }}
        >
          <div
            className="map-layer"
            style={{
              width: layout.width * TILE_SIZE,
              height: layout.height * TILE_SIZE,
              backgroundImage: `url("${mapDefinition.previewUrl}")`,
            }}
          />

          {showCollision && (
            <div
              className="collision-layer"
              style={{
                gridTemplateColumns: `repeat(${layout.width}, ${TILE_SIZE}px)`,
              }}
            >
              {layout.cells.map((cell, index) => (
                <div
                  key={index}
                  className={cell.collision === 0 ? "walkable" : "blocked"}
                  style={{ width: TILE_SIZE, height: TILE_SIZE }}
                />
              ))}
            </div>
          )}

          <div
            className="player"
            style={{
              left: player.x * TILE_SIZE,
              top: player.y * TILE_SIZE - TILE_SIZE,
              width: PLAYER_SPRITE.frameWidth,
              height: PLAYER_SPRITE.frameHeight,
              backgroundImage: `url("${PLAYER_SPRITE.url}")`,
              backgroundPosition: `${frameOffset.x}px ${frameOffset.y}px`,
              backgroundSize: `${PLAYER_SPRITE.sheetWidth}px ${PLAYER_SPRITE.sheetHeight}px`,
              transform: player.facing === "east" ? "scaleX(-1)" : undefined,
            }}
          />
        </div>

        <div className="location-chip">{mapDefinition.label}</div>
        <div className="control-hint">WASD / setas</div>
      </div>

      <aside className="side-panel">
        <div>
          <span className="panel-label">Mapa</span>
          <strong>{mapDefinition.label}</strong>
        </div>
        <div className="stat-grid">
          <div>
            <span>X</span>
            <strong>{player.x}</strong>
          </div>
          <div>
            <span>Y</span>
            <strong>{player.y}</strong>
          </div>
          <div>
            <span>Elevation</span>
            <strong>{currentCell?.elevation ?? "-"}</strong>
          </div>
          <div>
            <span>Collision</span>
            <strong>{currentCell?.collision ?? "-"}</strong>
          </div>
        </div>

        <label className="debug-toggle">
          <input
            type="checkbox"
            checked={showCollision}
            onChange={(event) => setShowCollision(event.target.checked)}
          />
          Mostrar collision map
        </label>

        <div className="dpad" aria-label="Controles direcionais">
          <button onClick={() => move("north")} className="north" aria-label="Norte">
            ▲
          </button>
          <button onClick={() => move("west")} className="west" aria-label="Oeste">
            ◀
          </button>
          <button onClick={() => move("south")} className="south" aria-label="Sul">
            ▼
          </button>
          <button onClick={() => move("east")} className="east" aria-label="Leste">
            ▶
          </button>
        </div>

        <p className="panel-note">
          Tiles com collision diferente de zero bloqueiam movimento. O próximo passo
          é conectar eventos, NPCs e a saída norte para Route 1.
        </p>
      </aside>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { DuelSpeciesId } from "@tactimon/battle-engine";

type AnimationName = "idle" | "walk" | "attack" | "hurt" | "faint";

type RuntimeAnimation = {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  durations: number[];
  file: string;
  directionRows: number;
};

type RuntimeSpecies = {
  id: string;
  animations: Partial<Record<AnimationName, RuntimeAnimation>>;
  creditsFile: string | null;
};

type RuntimeManifest = {
  source: string;
  directions: string[];
  species: Record<DuelSpeciesId, RuntimeSpecies>;
};

type Facing = "up" | "down" | "left" | "right";

type Props = {
  species: DuelSpeciesId;
  side: "player" | "rival";
  animation?: AnimationName;
  facing?: Facing;
  speed?: 1 | 2;
  onAnimationComplete?: () => void;
};

const SPRITE_TILE_FILL = 1.18;

let manifestPromise: Promise<RuntimeManifest> | null = null;

function loadManifest(): Promise<RuntimeManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(
      "/game-assets/pokemon-sprites/manifest.json",
    ).then((response) => {
      if (!response.ok) {
        throw new Error(
          `SpriteCollab runtime manifest unavailable: ${response.status}`,
        );
      }
      return response.json() as Promise<RuntimeManifest>;
    });
  }

  return manifestPromise;
}

export function PokemonBattleSprite({
  species,
  side,
  animation = "idle",
  facing,
  speed = 1,
  onAnimationComplete,
}: Props) {
  const [manifest, setManifest] =
    useState<RuntimeManifest | null>(null);
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);
  const onAnimationCompleteRef = useRef(
    onAnimationComplete,
  );

  useEffect(() => {
    onAnimationCompleteRef.current =
      onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    let active = true;

    loadManifest()
      .then((next) => {
        if (active) setManifest(next);
      })
      .catch((error: unknown) => {
        console.error(error);
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const data =
    manifest?.species[species]?.animations[animation] ??
    manifest?.species[species]?.animations.idle ??
    null;

  useEffect(() => {
    setFrame(0);

    if (!data) {
      return;
    }

    const terminal = animation === "faint";
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let currentFrame = 0;

    const advance = () => {
      if (cancelled) return;

      const duration =
        data.durations[currentFrame] ??
        data.durations[data.durations.length - 1] ??
        6;

      timeout = setTimeout(() => {
        if (cancelled) return;

        if (
          terminal &&
          currentFrame >= data.frames - 1
        ) {
          onAnimationCompleteRef.current?.();
          return;
        }

        currentFrame =
          currentFrame >= data.frames - 1
            ? 0
            : currentFrame + 1;
        setFrame(currentFrame);
        advance();
      }, Math.max(25, (duration * (1000 / 60)) / speed));
    };

    advance();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [animation, data, speed]);

  if (failed) {
    return (
      <div className="pokemon-sprite-missing">
        SpriteCollab ausente
      </div>
    );
  }

  if (!manifest || !data) {
    return <div className="pokemon-sprite-loading" />;
  }

  const desiredDirection =
    facing ?? (side === "player" ? "right" : "left");
  const directionIndex = Math.min(
    Math.max(0, data.directionRows - 1),
    Math.max(
      0,
      manifest.directions.indexOf(desiredDirection),
    ),
  );

  const idle =
    manifest.species[species]?.animations.idle ??
    data;
  const referenceSide =
    Math.max(
      1,
      idle.frameWidth,
      idle.frameHeight,
    ) / SPRITE_TILE_FILL;

  // Keep one source pixel at the same visual scale for every animation.
  // The idle canvas slightly overfills one tile to compensate for transparent
  // SpriteCollab margins; every other animation reuses that exact source-pixel
  // scale and may extend outside the tile without changing Pokémon size.
  const frameWidthPercent =
    (data.frameWidth / referenceSide) * 100;
  const frameHeightPercent =
    (data.frameHeight / referenceSide) * 100;
  const backgroundX =
    data.frames <= 1
      ? 0
      : (frame / (data.frames - 1)) * 100;
  const backgroundY =
    data.directionRows <= 1
      ? 0
      : (directionIndex / (data.directionRows - 1)) * 100;

  return (
    <div
      className={`pokemon-battle-sprite ${side}`}
      title={`${species} · ${manifest.source}`}
    >
      <div
        className="pokemon-battle-sprite-frame"
        style={{
          width:
            `min(${frameWidthPercent}cqw, ${frameWidthPercent}cqh)`,
          height:
            `min(${frameHeightPercent}cqw, ${frameHeightPercent}cqh)`,
          backgroundImage:
            `url("/game-assets/pokemon-sprites/${data.file}")`,
          backgroundSize:
            `${data.frames * 100}% ${data.directionRows * 100}%`,
          backgroundPosition:
            `${backgroundX}% ${backgroundY}%`,
        }}
      />
    </div>
  );
}

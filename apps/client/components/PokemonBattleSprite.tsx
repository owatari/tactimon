"use client";

import { useEffect, useState } from "react";
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
};

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
}: Props) {
  const [manifest, setManifest] =
    useState<RuntimeManifest | null>(null);
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);

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

    if (!data || data.frames <= 1) {
      return;
    }

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
        currentFrame = (currentFrame + 1) % data.frames;
        setFrame(currentFrame);
        advance();
      }, Math.max(50, duration * (1000 / 60)));
    };

    advance();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [data]);

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
  const directionIndex = Math.max(
    0,
    manifest.directions.indexOf(desiredDirection),
  );

  const sheetWidth = data.frameWidth * data.frames;
  const sheetHeight = data.frameHeight * data.directionRows;
  const longestSide = Math.max(data.frameWidth, data.frameHeight);
  const battleScale = Math.max(
    1.45,
    Math.min(2.5, 92 / longestSide),
  );

  return (
    <div
      className={`pokemon-battle-sprite ${side}`}
      title={`${species} · ${manifest.source}`}
      style={{
        width: data.frameWidth,
        height: data.frameHeight,
        backgroundImage:
          `url("/game-assets/pokemon-sprites/${data.file}")`,
        backgroundSize:
          `${sheetWidth}px ${sheetHeight}px`,
        backgroundPosition:
          `-${frame * data.frameWidth}px -${directionIndex * data.frameHeight}px`,
        transform: `scale(${battleScale})`,
      }}
    />
  );
}

"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { DuelSpeciesId } from "@tactimon/battle-engine";
import {
  SPRITE_GROUND_Y,
  spriteFrameLayout,
  type SpriteBounds,
} from "@/lib/spriteLayout";

type AnimationName = "idle" | "walk" | "attack" | "hurt" | "faint";

type RuntimeAnimation = {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  durations: number[];
  file: string;
  directionRows: number;
  bounds?: SpriteBounds | null;
  groundX?: number;
  groundY?: number;
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
    if (
      failed &&
      animation === "faint"
    ) {
      onAnimationCompleteRef.current?.();
    }
  }, [animation, failed]);

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
  // Scale from the visible idle body (shared by every animation, so the
  // Pokémon never changes size between frames) and anchor the frame by its
  // ground point instead of the transparent canvas edges.
  const layout = spriteFrameLayout(idle, data);
  const tile = (value: number) =>
    `calc(${value.toFixed(4)} * 100cqmin)`;
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
          width: tile(layout.width),
          height: tile(layout.height),
          left: `calc(50% + ${tile(layout.left - 0.5)})`,
          top: `calc(${SPRITE_GROUND_Y * 100}% + ${tile(
            layout.top - SPRITE_GROUND_Y,
          )})`,
          bottom: "auto",
          transform: "none",
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

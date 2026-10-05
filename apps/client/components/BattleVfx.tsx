"use client";

import { useEffect, useRef, useState } from "react";
import type { DuelMoveId } from "@tactimon/battle-engine";

type RuntimeVfx = {
  file: string;
  frame_width: number;
  frame_height: number;
  frames: number;
  frame_duration_ms: number;
  placement: "target";
  effect_animation_id: number;
  archive_entry: number;
  animation_index: number;
  mapping: "canonical" | "proxy";
  note: string;
};

type RuntimeManifest = {
  source: string;
  moves: Partial<Record<DuelMoveId, RuntimeVfx>>;
};

/** Moves with hand-drawn CSS effects (see globals.css `.vfx-<move>`). */
const LEGACY_FX = new Set<string>([
  "scratch",
  "tackle",
  "growl",
  "tail-whip",
  "vine-whip",
  "razor-leaf",
  "seed-bomb",
  "ember",
  "flame-burst",
  "water-gun",
  "aqua-jet",
  "metal-claw",
  "bite",
]);

type Props = {
  moveId: DuelMoveId;
  /** Move type: picks the particle effect when there is no extracted sprite. */
  type?: string;
  category?: "physical" | "special" | "status";
  nonce: number;
  speed?: 1 | 2;
  onComplete?: () => void;
};

let manifestPromise: Promise<RuntimeManifest | null> | null = null;

function loadManifest(): Promise<RuntimeManifest | null> {
  if (!manifestPromise) {
    manifestPromise = fetch("/game-assets/battle-vfx/manifest.json")
      .then((response) => {
        if (!response.ok) return null;
        return response.json() as Promise<RuntimeManifest>;
      })
      .catch(() => null);
  }

  return manifestPromise;
}

export function BattleVfx({
  moveId,
  type,
  category,
  nonce,
  speed = 1,
  onComplete,
}: Props) {
  const [manifest, setManifest] = useState<RuntimeManifest | null>(null);
  const [frame, setFrame] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let active = true;
    void loadManifest().then((next) => {
      if (active) setManifest(next);
    });

    return () => {
      active = false;
    };
  }, []);

  const data = manifest?.moves[moveId] ?? null;

  useEffect(() => {
    setFrame(0);

    if (!data) {
      const timeout = window.setTimeout(() => {
        onCompleteRef.current?.();
      }, (type && !LEGACY_FX.has(moveId) ? 640 : 420) / speed);

      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;
    let currentFrame = 0;
    let timeout: number | null = null;

    const advance = () => {
      if (cancelled) return;

      const duration = Math.max(
        24,
        data.frame_duration_ms / speed,
      );
      timeout = window.setTimeout(() => {
        if (cancelled) return;

        if (currentFrame >= data.frames - 1) {
          onCompleteRef.current?.();
          return;
        }

        currentFrame += 1;
        setFrame(currentFrame);
        advance();
      }, duration);
    };

    advance();

    return () => {
      cancelled = true;
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
    };
  }, [data, nonce, speed]);

  if (!data && type && !LEGACY_FX.has(moveId)) {
    return (
      <div
        key={nonce}
        className={`battle-fx fx-${type} fx-cat-${category ?? "physical"}`}
        aria-hidden="true"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            style={{ "--i": index } as React.CSSProperties}
          />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div
        key={nonce}
        className={`battle-vfx-fallback vfx-${moveId}`}
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div
      key={nonce}
      className={`battle-vfx-sprite battle-vfx-${data.mapping}`}
      title={`EoS effect ${data.effect_animation_id} · ${data.mapping}`}
      style={{
        width: data.frame_width,
        height: data.frame_height,
        backgroundImage: `url("/game-assets/battle-vfx/${data.file}")`,
        backgroundSize:
          `${data.frame_width * data.frames}px ${data.frame_height}px`,
        backgroundPosition:
          `-${frame * data.frame_width}px 0px`,
      }}
      aria-hidden="true"
    />
  );
}

"use client";

import { useEffect, useState } from "react";
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

type Props = {
  moveId: DuelMoveId;
  nonce: number;
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

export function BattleVfx({ moveId, nonce }: Props) {
  const [manifest, setManifest] = useState<RuntimeManifest | null>(null);
  const [frame, setFrame] = useState(0);

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
    if (!data || data.frames <= 1) return;

    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % data.frames);
    }, Math.max(45, data.frame_duration_ms));

    return () => clearInterval(timer);
  }, [data, nonce]);

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
      className="battle-vfx-sprite"
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

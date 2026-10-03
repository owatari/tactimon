"use client";

import { useEffect } from "react";
import {
  musicManager,
  resolveBattleMusic,
  resolveMapMusic,
  type BattleMusicKind,
} from "@/lib/music";

type Props = {
  mapId: string;
  mapMusicId: number | null;
  battleKind: BattleMusicKind | null;
};

export function GameMusic({
  mapId,
  mapMusicId,
  battleKind,
}: Props) {
  useEffect(() => musicManager.installUnlock(), []);

  useEffect(() => {
    musicManager.setTrack(
      battleKind
        ? resolveBattleMusic(battleKind)
        : resolveMapMusic(mapMusicId, mapId),
    );
  }, [battleKind, mapId, mapMusicId]);

  return null;
}

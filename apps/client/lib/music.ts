"use client";

export type BattleMusicKind =
  | "wild"
  | "trainer"
  | "rival"
  | "boss"
  | "dungeon";

export type MusicTrack = {
  id: string;
  fireRedMusicId: number;
  url: string;
  loop: boolean;
  volume: number;
};

const FIRE_RED_TRACK_IDS = {
  route1: 291,
  trainerBattle: 297,
  wildBattle: 298,
  pallet: 300,
  oakLab: 301,
  pokeCenter: 303,
  viridian: 314,
} as const;

const FALLBACK_MAP_MUSIC: Record<string, number> = {
  "pallet-town": FIRE_RED_TRACK_IDS.pallet,
  "route-1": FIRE_RED_TRACK_IDS.route1,
  "viridian-city": FIRE_RED_TRACK_IDS.viridian,
  "oak-lab": FIRE_RED_TRACK_IDS.oakLab,
  "viridian-mart": FIRE_RED_TRACK_IDS.pokeCenter,
};

function fireRedTrack(
  fireRedMusicId: number,
  volume = 0.62,
): MusicTrack {
  return {
    id: `firered-${fireRedMusicId}`,
    fireRedMusicId,
    url: `/game-assets/music/firered/${fireRedMusicId}.wav`,
    loop: true,
    volume,
  };
}

const TRACK_REGISTRY = new Map<number, MusicTrack>([
  [FIRE_RED_TRACK_IDS.route1, fireRedTrack(FIRE_RED_TRACK_IDS.route1)],
  [
    FIRE_RED_TRACK_IDS.trainerBattle,
    fireRedTrack(FIRE_RED_TRACK_IDS.trainerBattle, 0.66),
  ],
  [
    FIRE_RED_TRACK_IDS.wildBattle,
    fireRedTrack(FIRE_RED_TRACK_IDS.wildBattle, 0.66),
  ],
  [FIRE_RED_TRACK_IDS.pallet, fireRedTrack(FIRE_RED_TRACK_IDS.pallet)],
  [FIRE_RED_TRACK_IDS.oakLab, fireRedTrack(FIRE_RED_TRACK_IDS.oakLab)],
  [
    FIRE_RED_TRACK_IDS.pokeCenter,
    fireRedTrack(FIRE_RED_TRACK_IDS.pokeCenter),
  ],
  [FIRE_RED_TRACK_IDS.viridian, fireRedTrack(FIRE_RED_TRACK_IDS.viridian)],
]);

export function resolveMapMusic(
  mapMusicId: number | null,
  mapId: string,
): MusicTrack | null {
  const id = mapMusicId ?? FALLBACK_MAP_MUSIC[mapId];
  if (id == null) return null;
  return TRACK_REGISTRY.get(id) ?? fireRedTrack(id);
}

export function resolveBattleMusic(
  kind: BattleMusicKind,
): MusicTrack | null {
  switch (kind) {
    case "wild":
      return TRACK_REGISTRY.get(FIRE_RED_TRACK_IDS.wildBattle) ?? null;
    case "trainer":
    case "rival":
      return TRACK_REGISTRY.get(FIRE_RED_TRACK_IDS.trainerBattle) ?? null;
    case "boss":
    case "dungeon":
      return null;
  }
}

type AudioSlot = {
  audio: HTMLAudioElement;
  track: MusicTrack;
};

class MusicManager {
  private desired: MusicTrack | null = null;
  private current: AudioSlot | null = null;
  private fadingOut: AudioSlot | null = null;
  private unlocked = false;
  private unlockInstalled = false;
  private transitionToken = 0;
  private readonly fadeMs = 520;
  private readonly failedTracks = new Set<string>();

  installUnlock(): () => void {
    if (typeof window === "undefined" || this.unlockInstalled) {
      return () => {};
    }

    this.unlockInstalled = true;

    const cleanup = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      this.unlockInstalled = false;
    };

    const unlock = () => {
      this.unlocked = true;
      cleanup();
      void this.applyDesired();
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });

    return cleanup;
  }

  setTrack(track: MusicTrack | null): void {
    if (this.desired?.id === track?.id) {
      return;
    }

    this.desired = track;
    if (this.unlocked) {
      void this.applyDesired();
    }
  }

  private async applyDesired(): Promise<void> {
    const track = this.desired;
    const token = ++this.transitionToken;

    if (!track) {
      this.stopFadingOut();
      if (this.current) {
        this.current.audio.pause();
        this.current.audio.currentTime = 0;
        this.current = null;
      }
      return;
    }

    if (this.failedTracks.has(track.id)) {
      return;
    }

    if (this.current?.track.id === track.id) {
      if (this.current.audio.paused) {
        try {
          await this.current.audio.play();
        } catch (error) {
          this.handlePlayError(track, error);
        }
      }
      return;
    }

    this.stopFadingOut();
    if (this.current) {
      this.current.audio.volume = this.current.track.volume;
    }

    const incoming: AudioSlot = {
      track,
      audio: new Audio(track.url),
    };
    incoming.audio.loop = track.loop;
    incoming.audio.preload = "auto";
    incoming.audio.volume = 0;

    try {
      await incoming.audio.play();
    } catch (error) {
      if (token !== this.transitionToken) return;
      this.handlePlayError(track, error);
      return;
    }

    if (token !== this.transitionToken) {
      incoming.audio.pause();
      return;
    }

    const outgoing = this.current;
    this.current = incoming;
    this.fadingOut = outgoing;
    const startedAt = performance.now();

    const fade = (now: number) => {
      if (token !== this.transitionToken) {
        return;
      }

      const progress = Math.min(
        1,
        (now - startedAt) / this.fadeMs,
      );
      incoming.audio.volume = track.volume * progress;

      if (outgoing) {
        outgoing.audio.volume =
          outgoing.track.volume * (1 - progress);
      }

      if (progress < 1) {
        requestAnimationFrame(fade);
        return;
      }

      if (outgoing && this.fadingOut === outgoing) {
        outgoing.audio.pause();
        outgoing.audio.currentTime = 0;
        this.fadingOut = null;
      }
    };

    requestAnimationFrame(fade);
  }

  private stopFadingOut(): void {
    if (!this.fadingOut) return;
    this.fadingOut.audio.pause();
    this.fadingOut.audio.currentTime = 0;
    this.fadingOut = null;
  }

  private handlePlayError(
    track: MusicTrack,
    error: unknown,
  ): void {
    if (
      error instanceof DOMException &&
      error.name === "NotAllowedError"
    ) {
      this.unlocked = false;
      this.installUnlock();
      return;
    }

    this.failedTracks.add(track.id);
    console.warn(
      `Music asset unavailable: ${track.url}. Run the FireRed music extractor.`,
      error,
    );
  }
}

export const musicManager = new MusicManager();

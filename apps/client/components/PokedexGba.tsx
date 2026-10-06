"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { duelSpeciesTypes } from "@tactimon/battle-engine";
import { GbaCanvas } from "@/components/GbaCanvas";
import { browserLoader } from "@/lib/gba/assets";
import {
  initialDexState,
  stepDex,
  type DexContext,
  type DexKey,
  type DexState,
} from "@/lib/gba/dex";
import {
  buildDexRegistrationScreen,
  buildDexScreen,
  type DexEnv,
  type RgbaImage,
} from "@/lib/gba/dexRender";
import type { GbaScreen } from "@/lib/gba/engine";
import { speciesDexAreas } from "@/lib/gba/dexAreas";
import { localizedSpeciesName } from "@/lib/i18n/names";
import { getPokedex, pokedexDisplayName, pokedexFrontSpriteUrl, POKEDEX_SPECIES } from "@/lib/pokedex";
import { romName } from "@/lib/gba/romText";
import { t, useLocale } from "@/lib/i18n";
import type { StoryState } from "@/lib/story";

type Props = {
  story: StoryState;
  musicVolume?: number;
  onClose: () => void;
};

const KEYS: Record<string, DexKey> = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  Enter: "a",
  z: "a",
  Z: "a",
  " ": "a",
  e: "a",
  E: "a",
  Escape: "b",
  x: "b",
  X: "b",
  Backspace: "b",
  Tab: "b",
  Shift: "start",
  c: "start",
  C: "start",
  q: "l",
  Q: "l",
  PageUp: "l",
  r: "r",
  R: "r",
  PageDown: "r",
};

/** FireRed type ids: NORMAL 0 ... DARK 17 (MYSTERY 9). */
const TYPE_ID: Record<string, number> = {
  normal: 0,
  fighting: 1,
  flying: 2,
  poison: 3,
  ground: 4,
  rock: 5,
  bug: 6,
  ghost: 7,
  steel: 8,
  fire: 10,
  water: 11,
  grass: 12,
  electric: 13,
  psychic: 14,
  ice: 15,
  dragon: 16,
  dark: 17,
};

const imageCache = new Map<string, Promise<RgbaImage | null>>();

function loadImage(url: string): Promise<RgbaImage | null> {
  let hit = imageCache.get(url);
  if (!hit) {
    hit = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    imageCache.set(url, hit);
  }
  return hit;
}

export function playPokemonCry(dex: number, volume = 0.7): void {
  try {
    const audio = new Audio(`/game-assets/gba-ui/cries/${String(dex).padStart(3, "0")}.wav`);
    audio.volume = Math.max(0, Math.min(1, volume));
    void audio.play().catch(() => undefined);
  } catch {
    /* audio unavailable */
  }
}

function useDexEnv(): DexEnv {
  return useMemo<DexEnv>(
    () => ({
      load: browserLoader,
      loadImage,
      speciesName: (dex) =>
        romName(localizedSpeciesName(POKEDEX_SPECIES[dex - 1]), pokedexDisplayName(POKEDEX_SPECIES[dex - 1])),
      speciesTypes: (dex) => {
        try {
          return duelSpeciesTypes(POKEDEX_SPECIES[dex - 1] as never).map((t) => TYPE_ID[t] ?? 9);
        } catch {
          return [0];
        }
      },
      frontSpriteUrl: (dex) => pokedexFrontSpriteUrl(POKEDEX_SPECIES[dex - 1]),
      trainerSpriteUrl: () => "/game-assets/firered/trainers/front/red.png",
      speciesAreas: (dex) => speciesDexAreas(POKEDEX_SPECIES[dex - 1]),
    }),
    [],
  );
}

function useDexContext(story: StoryState): DexContext {
  return useMemo<DexContext>(() => {
    const dex = getPokedex(story);
    return {
      flags: dex.entries.map((e) => ({ seen: e.status !== "unseen", caught: e.status === "caught" })),
    };
  }, [story]);
}

/** The Kanto Pokédex rendered from FireRed ROM graphics (tiles, palettes, fonts, footprints) with ROM cries. */
export function PokedexGba({ story, musicVolume = 70, onClose }: Props) {
  const locale = useLocale();
  const [state, setState] = useState<DexState>(() => initialDexState());
  const [screen, setScreen] = useState<GbaScreen | null>(null);
  const [tick, setTick] = useState(0);
  const [missing, setMissing] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const ctx = useDexContext(story);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const env = useDexEnv();
  useEffect(() => {
    let cancelled = false;
    buildDexScreen(state, ctx, env, tick)
      .then((built) => {
        if (!cancelled) setScreen(built);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [state, ctx, env, tick, locale]);

  // The selected habitat page frame pulses (palette cycle) while a category page is open.
  useEffect(() => {
    if (state.screen !== "category") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 66);
    return () => window.clearInterval(id);
  }, [state.screen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = KEYS[event.key];
      if (!key) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat && (key === "a" || key === "b" || key === "start")) return;
      const result = stepDex(stateRef.current, key, ctxRef.current);
      if (result.close) {
        onClose();
        return;
      }
      if (result.cry) playPokemonCry(result.cry, musicVolume / 100);
      stateRef.current = result.state;
      setState(result.state);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [musicVolume, onClose]);

  if (missing) {
    return (
      <p className="start-menu-notice">
        {t("ROM UI assets are missing. Run tools/asset-extractor/convert_ui.py and restart the dev server.")}
      </p>
    );
  }

  return <GbaCanvas screen={screen} className="pokedex-gba" />;
}

/** FireRed page shown for a newly registered species: the entry is shown with its cry, A (or B) continues. */
export function PokedexRegistration({
  story,
  species,
  musicVolume = 70,
  onDone,
}: {
  story: StoryState;
  species: string;
  musicVolume?: number;
  onDone: () => void;
}) {
  const locale = useLocale();
  const ctx = useDexContext(story);
  const env = useDexEnv();
  const [screen, setScreen] = useState<GbaScreen | null>(null);
  const dex = POKEDEX_SPECIES.indexOf(species) + 1;

  useEffect(() => {
    let cancelled = false;
    buildDexRegistrationScreen(dex, ctx, env)
      .then((built) => {
        if (!cancelled) setScreen(built);
      })
      .catch(() => onDone());
    return () => {
      cancelled = true;
    };
  }, [dex, ctx, env, locale, onDone]);

  useEffect(() => {
    playPokemonCry(dex, musicVolume / 100);
  }, [dex, musicVolume]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!["Enter", " ", "z", "Z", "x", "X", "Escape"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) onDone();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onDone]);

  return (
    <div className="dex-registration" role="dialog" aria-modal="true">
      <GbaCanvas screen={screen} className="pokedex-gba" />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getOverworldControl } from "@/lib/autoplay/bridge";
import { AUTO_SPEEDS, setAutoSpeed, setAutoplay, useGameClock } from "@/lib/autoplay/gameClock";
import { AutoPlayer, type AutoStatus } from "@/lib/autoplay/runtime";
import { t } from "@/lib/i18n";
import type { StoryState } from "@/lib/story";

type Props = {
  story: StoryState;
  onStoryUpdate: (update: (story: StoryState) => StoryState) => void;
};

declare global {
  interface Window {
    __tactimon_auto?: { debug: () => unknown; status: () => AutoStatus; setSpeed: (speed: number) => void; setOn: (on: boolean) => void };
  }
}

/**
 * AUTO tab: a small docked panel (it never pauses the game) with the Auto Player switch and the
 * 1x / 2x / 4x / 8x / 16x speed buttons. While it is on the game is muted and runs at that speed, and
 * a bot plays: it talks to everybody, walks through every exit, fights with Auto Battle / Auto Catch
 * and clicks through the result screens. For testing only.
 */
export function AutoPanel({ story, onStoryUpdate }: Props) {
  const clock = useGameClock();
  const [open, setOpen] = useState(false);
  const storyRef = useRef(story);
  storyRef.current = story;
  const updateRef = useRef(onStoryUpdate);
  updateRef.current = onStoryUpdate;

  const player = useMemo(
    () =>
      new AutoPlayer({
        getStory: () => storyRef.current,
        updateStory: (update) => updateRef.current(update),
      }),
    [],
  );
  const status = useSyncExternalStore(
    (listener) => player.subscribe(listener),
    () => player.status,
    () => player.status,
  );

  useEffect(() => {
    if (clock.autoplay) player.start();
    else player.stop();
  }, [clock.autoplay, player]);

  useEffect(() => () => player.stop(), [player]);

  useEffect(() => {
    window.__tactimon_auto = {
      debug: () => {
        const snap = getOverworldControl()?.snapshot();
        if (!snap) return null;
        const grid = Array.from({ length: snap.height }, (_, y) =>
          Array.from({ length: snap.width }, (_, x) => (x === snap.x && y === snap.y ? "@" : snap.walkable(x, y) ? "." : "#")).join(""),
        );
        return { ...snap, trace: player.trace, walkable: undefined, grid, exits: snap.exits.slice(0, 12) };
      },
      status: () => player.status,
      setSpeed: (speed) => setAutoSpeed(speed as (typeof AUTO_SPEEDS)[number]),
      setOn: (on) => setAutoplay(on),
    };
    return () => {
      delete window.__tactimon_auto;
    };
  }, [player]);

  return (
    <aside className={`auto-panel${open ? " open" : ""}${clock.autoplay ? " on" : ""}`} data-auto-panel>
      <button type="button" className="auto-toggle" data-auto-open onClick={() => setOpen((value) => !value)}>
        {t("AUTO")} {clock.autoplay ? `· ${clock.speed}×` : ""}
      </button>
      {open && (
        <div className="auto-body">
          <label className="auto-switch">
            <input
              type="checkbox"
              checked={clock.autoplay}
              data-auto-switch
              onChange={(event) => setAutoplay(event.target.checked)}
            />
            <span>{clock.autoplay ? t("Auto Player ON (muted)") : t("Auto Player OFF")}</span>
          </label>
          <div className="auto-speeds" role="group" aria-label={t("Speed")}>
            {AUTO_SPEEDS.map((speed) => (
              <button
                type="button"
                key={speed}
                className={clock.speed === speed ? "active" : ""}
                data-auto-speed={speed}
                onClick={() => setAutoSpeed(speed)}
              >
                {speed}×
              </button>
            ))}
          </div>
          <dl className="auto-status" data-auto-status>
            <dt>{t("Goal")}</dt>
            <dd>{status.goal}</dd>
            <dt>{t("Map")}</dt>
            <dd>
              {status.mapId} ({status.x},{status.y})
            </dd>
            <dt>{t("Maps seen")}</dt>
            <dd>{status.maps}</dd>
            <dt>{t("Stalls")}</dt>
            <dd>{status.stalls}</dd>
          </dl>
          <ol className="auto-log">
            {status.log.slice(-6).map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}

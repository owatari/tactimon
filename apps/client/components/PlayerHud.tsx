"use client";

import type { MenuScreen } from "@/lib/gameMenu";
import { t } from "@/lib/i18n";

/** 12×12 pixel icons: '#' is ink, 'o' the accent, anything else transparent. */
const ICONS: Record<string, readonly string[]> = {
  pokedex: [
    "............",
    ".##########.",
    ".#oooooooo#.",
    ".#o######o#.",
    ".#o#....#o#.",
    ".#o#.##.#o#.",
    ".#o#.##.#o#.",
    ".#o#....#o#.",
    ".#o######o#.",
    ".#oooooooo#.",
    ".##########.",
    "............",
  ],
  map: [
    "............",
    "..##..##..#.",
    ".#oo##oo##o#",
    ".#oo#oo#oo#.",
    ".#oo#oo#oo#.",
    ".#oo#oo#oo#.",
    ".#oo#oo#oo#.",
    ".#oo#oo#oo#.",
    ".#oo#oo#oo#.",
    "..##..##..#.",
    "............",
    "............",
  ],
  party: [
    "............",
    "...######...",
    "..##oooo##..",
    ".##oooooo##.",
    ".#oooooooo#.",
    ".##########.",
    ".#........#.",
    ".##......##.",
    "..##....##..",
    "...######...",
    "............",
    "............",
  ],
  bag: [
    "............",
    "....####....",
    "...#....#...",
    "..########..",
    ".#oooooooo#.",
    ".#oo####oo#.",
    ".#oo#..#oo#.",
    ".#oo####oo#.",
    ".#oooooooo#.",
    ".#oooooooo#.",
    "..########..",
    "............",
  ],
  card: [
    "............",
    ".##########.",
    ".#oooooooo#.",
    ".#o##oooooo#",
    ".#o##o####o#",
    ".#o##oooooo#",
    ".#oooo####o#",
    ".#oooooooo#.",
    ".##########.",
    "............",
    "............",
    "............",
  ],
  options: [
    "............",
    "....####....",
    "..#.#oo#.#..",
    "...#oooo#...",
    ".##oo##oo##.",
    ".#oo#..#oo#.",
    ".#oo#..#oo#.",
    ".##oo##oo##.",
    "...#oooo#...",
    "..#.#oo#.#..",
    "....####....",
    "............",
  ],
};

function PixelIcon({ name }: { name: string }) {
  const rows = ICONS[name] ?? [];
  return (
    <svg
      className="hud-icon"
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "#" || cell === "o" ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              className={cell === "#" ? "ink" : "accent"}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export type HudWindow = {
  id: string;
  screen: MenuScreen;
  label: string;
  key: string;
  enabled: boolean;
  icon: string;
};

type Props = {
  windows: readonly HudWindow[];
  running: boolean;
  canRun: boolean;
  /** Key presses the world already understands (E interact, Escape back, R run). */
  onKey: (key: string) => void;
  onOpen: (screen: MenuScreen) => void;
};

/** The always-visible MMO-style HUD: window buttons top right, interact / back / run bottom right. */
export function PlayerHud({ windows, running, canRun, onKey, onOpen }: Props) {
  return (
    <>
      <nav className="player-hud-windows" aria-label={t("Windows")}>
        {windows.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="hud-round"
            disabled={!entry.enabled}
            title={`${entry.label} (${entry.key})`}
            aria-label={entry.label}
            data-hud={entry.id}
            onClick={() => onOpen(entry.screen)}
          >
            <PixelIcon name={entry.icon} />
            <kbd>{entry.key}</kbd>
          </button>
        ))}
      </nav>
      <div className="player-hud-actions">
        {canRun && (
          <button
            type="button"
            className="hud-action"
            data-hud="run"
            aria-pressed={running}
            title={t("R toggles walking and running")}
            onClick={() => onKey("r")}
          >
            <b>{running ? t("RUN") : t("WALK")}</b>
            <kbd>R</kbd>
          </button>
        )}
        <button
          type="button"
          className="hud-action"
          data-hud="back"
          onClick={() => onKey("Escape")}
        >
          <b>{t("BACK")}</b>
          <kbd>ESC</kbd>
        </button>
        <button
          type="button"
          className="hud-action primary"
          data-hud="interact"
          onClick={() => onKey("e")}
        >
          <b>{t("INTERACT")}</b>
          <kbd>E</kbd>
        </button>
      </div>
    </>
  );
}

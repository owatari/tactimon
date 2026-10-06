"use client";

import { useEffect, useRef, useState } from "react";
import type { StarterSpeciesId } from "@tactimon/battle-engine";
import { STARTER_META } from "@/lib/story";
import {
  INITIAL_STARTER_CHOICE,
  STARTER_ORDER,
  stepStarterChoice,
  type StarterChoiceKey,
  type StarterChoiceState,
} from "@/lib/starterChoice";
import { t, useLocale } from "@/lib/i18n";

type Props = {
  onChoose: (starter: StarterSpeciesId) => void;
  onClose: () => void;
};

const KEYS: Record<string, StarterChoiceKey> = {
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  Enter: "confirm",
  z: "confirm",
  Z: "confirm",
  " ": "confirm",
  Escape: "back",
  x: "back",
  X: "back",
};

const BALL_COLORS = {
  o: "#202020",
  r: "#e83828",
  d: "#a01810",
  w: "#f8f8f8",
  g: "#b8b8b8",
};

// 12x12 FireRed-style Poké Ball, drawn pixel by pixel.
const BALL_PIXELS = [
  "....oooo....",
  "..oorrrroo..",
  ".orrrrrrrro.",
  ".orrwrrrrdo.",
  "orrwrrrrrrdo",
  "oooooooooooo",
  "owwwwooowwwo",
  "owwwwowowwgo",
  ".owwwooowgo.",
  ".owwwwwwggo.",
  "..oogggggoo.",
  "....oooo....",
];

function PokeBall({ selected }: { selected: boolean }) {
  return (
    <svg
      className={`starter-ball${selected ? " selected" : ""}`}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {BALL_PIXELS.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch in BALL_COLORS ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={BALL_COLORS[ch as keyof typeof BALL_COLORS]}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function StarterChoice({ onChoose, onClose }: Props) {
  useLocale();
  const [state, setState] = useState<StarterChoiceState>(
    INITIAL_STARTER_CHOICE,
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const press = (key: StarterChoiceKey) => {
    const result = stepStarterChoice(stateRef.current, key);
    stateRef.current = result.state;
    setState(result.state);
    if (result.chosen) onChoose(result.chosen);
    else if (result.close) onClose();
  };
  const pressRef = useRef(press);
  pressRef.current = press;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = KEYS[event.key];
      if (!key) return;
      event.preventDefault();
      event.stopPropagation();
      pressRef.current(key);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const species = STARTER_ORDER[state.index];
  const meta = STARTER_META[species];
  const typeName = t(meta.type.toUpperCase());

  return (
    <div className="starter-scene" role="dialog" aria-modal="true">
      <div className="starter-info fr-window">
        <img
          className="starter-portrait"
          src={`/game-assets/pokemon-sprites/${species}/portrait.png`}
          alt=""
        />
        <div className="starter-info-copy">
          <strong>{meta.name.toUpperCase()}</strong>
          <span>{typeName}</span>
          <small>{t(meta.description)}</small>
        </div>
      </div>

      <div className="starter-table" aria-label={t("PROF. OAK")}>
        {STARTER_ORDER.map((id, index) => (
          <button
            key={id}
            type="button"
            className="starter-ball-slot"
            aria-label={STARTER_META[id].name}
            onClick={() => {
              if (stateRef.current.stage !== "pick") return;
              stateRef.current = { ...stateRef.current, index };
              setState(stateRef.current);
              press("confirm");
            }}
            onMouseEnter={() =>
              state.stage === "pick" && setState((s) => ({ ...s, index }))
            }
          >
            {state.index === index && (
              <span className="starter-cursor" aria-hidden="true">
                ▼
              </span>
            )}
            <PokeBall selected={state.index === index} />
          </button>
        ))}
      </div>

      {state.stage === "confirm" && (
        <div className="starter-yesno fr-window" role="menu">
          {[t("YES"), t("NO")].map((label, i) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className={state.answer === i ? "selected" : ""}
              onMouseEnter={() =>
                setState((s) => ({ ...s, answer: i as 0 | 1 }))
              }
              onClick={() => {
                stateRef.current = {
                  ...stateRef.current,
                  answer: i as 0 | 1,
                };
                press("confirm");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="starter-textbox fr-window">
        <p>
          {state.stage === "pick"
            ? t("PROF. OAK: Those are POKé BALLS. They contain POKéMON! Choose one!")
            : t("So, you want the {type}-type POKéMON, {name}?", {
                type: typeName,
                name: meta.name.toUpperCase(),
              })}
        </p>
        <small>{t("←/→ select · Z confirm · X back")}</small>
      </div>
    </div>
  );
}

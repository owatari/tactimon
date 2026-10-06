"use client";

import { useEffect, useRef, useState } from "react";
import type { StarterSpeciesId } from "@tactimon/battle-engine";
import { STARTER_META } from "@/lib/story";
import {
  INITIAL_STARTER_CHOICE,
  STARTER_ORDER,
  pointStarterChoice,
  stepStarterChoice,
  type StarterChoiceKey,
  type StarterChoiceState,
} from "@/lib/starterChoice";
import { t, useLocale } from "@/lib/i18n";

type Props = {
  onChoose: (starter: StarterSpeciesId) => void;
  /** Tells the overworld which real ball on Oak's table to zoom to / highlight. */
  onFocusChange?: (starter: StarterSpeciesId | null) => void;
  /** Hover/click on a real ball in the lab (nonce makes repeats distinct). */
  pointer?: {
    kind: "hover" | "click";
    starter: StarterSpeciesId;
    nonce: number;
  } | null;
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

export function StarterChoice({
  onChoose,
  onFocusChange,
  pointer,
  onClose,
}: Props) {
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

  useEffect(() => {
    if (!pointer) return;
    const next = pointStarterChoice(
      stateRef.current,
      pointer.starter,
      pointer.kind === "click",
    );
    stateRef.current = next;
    setState(next);
  }, [pointer]);

  const species = STARTER_ORDER[state.index];
  const focusRef = useRef(onFocusChange);
  focusRef.current = onFocusChange;
  useEffect(() => {
    focusRef.current?.(species);
  }, [species]);
  useEffect(() => () => focusRef.current?.(null), []);
  const meta = STARTER_META[species];
  const typeName = t(meta.type.toUpperCase());

  return (
    <div className="starter-scene" role="dialog" aria-modal="true">
      <div className="starter-info fr-window">
        <img
          className="starter-portrait"
          key={species}
          src={`/game-assets/pokemon-sprites/${species}/portrait.png`}
          alt=""
        />
        <div className="starter-info-copy">
          <strong>{meta.name.toUpperCase()}</strong>
          <span>{typeName}</span>
          <small>{t(meta.description)}</small>
        </div>
      </div>

      <div className="starter-pager" aria-hidden="false">
        <button
          type="button"
          className="fr-window"
          aria-label={t("Previous")}
          onClick={() => press("left")}
          disabled={state.stage !== "pick"}
        >
          ◀
        </button>
        <button
          type="button"
          className="fr-window"
          aria-label={t("Next")}
          onClick={() => press("right")}
          disabled={state.stage !== "pick"}
        >
          ▶
        </button>
        <button
          type="button"
          className="fr-window starter-pick"
          onClick={() => press("confirm")}
          disabled={state.stage !== "pick"}
        >
          {meta.name.toUpperCase()}
        </button>
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

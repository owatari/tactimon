"use client";

import { useMemo, useState } from "react";
import type { PokemonProgression } from "@tactimon/battle-engine";
import { t, useLocale } from "@/lib/i18n";
import { localizedSpeciesName } from "@/lib/i18n/names";
import { pokemonDisplayName } from "@/lib/pokemonName";
import {
  PC_BOX_COUNT,
  PC_PER_BOX,
  boxMembers,
  buyNextPcBox,
  pcBoxPrice,
  unlockedPcBoxes,
} from "@/lib/pcBoxes";
import { applyPcAction, type PcActionMessage, type PcSource, type PcTarget } from "@/lib/pcActions";
import { reorderPartyMoves } from "@/lib/gameMenu";
import type { StoryState } from "@/lib/story";
import { useDragDrop } from "./dragDrop";
import { MoveSlots } from "./MoveSlots";
import { ShinyStar } from "./ShinyStar";
import { FrontSprite, SummaryInfo, SummaryStats } from "./StartMenu";

type Props = {
  story: StoryState;
  onStoryChange: (update: (current: StoryState) => StoryState) => void;
  onClose: () => void;
};

type Picked = PcSource | null;

const sameSource = (a: Picked, b: Picked) => Boolean(a && b && a.kind === b.kind && a.index === b.index);

function messageText(message: PcActionMessage): string {
  switch (message) {
    case "deposited":
      return t("Pokémon sent to the PC.");
    case "withdrawn":
      return t("Pokémon withdrawn to the party.");
    case "swapped":
      return t("Pokémon swapped places.");
    case "moved":
      return t("Pokémon moved to the box.");
    case "lead-locked":
      return t("The lead Pokémon cannot be swapped.");
    case "party-full":
      return t("Your party already has 6 Pokémon.");
    case "box-full":
      return t("That box is full.");
    default:
      return t("That Pokémon could not be moved.");
  }
}

/**
 * The PC window: party on the left, a box with tabs on the right (5 free, more for sale), the Summary
 * of the hovered or pinned Pokémon below. Drag a Pokémon onto a slot, a box tab or the party; or pin
 * it, press MOVE and click the destination (no dragging needed).
 */
export function PcWindow({ story, onStoryChange, onClose }: Props) {
  useLocale();
  const [box, setBox] = useState(0);
  const [pinned, setPinned] = useState<Picked>(null);
  const [armed, setArmed] = useState(false);
  const [hover, setHover] = useState<Picked>(null);
  const [notice, setNotice] = useState(() => t("PC Storage: organize the Pokémon in your party and Box."));

  const open = unlockedPcBoxes(story);
  const members = useMemo(() => boxMembers(story, box), [story, box]);
  const lead = story.playerPokemon;

  const lookup = (source: Picked): PokemonProgression | null => {
    if (!source) return null;
    return (source.kind === "party" ? story.capturedPokemon[source.index] : story.boxedPokemon[source.index]) ?? null;
  };

  const act = (source: PcSource, target: PcTarget) => {
    const result = applyPcAction(story, source, target);
    setNotice(messageText(result.message));
    setArmed(false);
    if (result.accepted) {
      onStoryChange(() => result.story);
      setPinned(null);
    }
  };

  const { dragProps, dragging, over, ghost } = useDragDrop<PcSource>((source, drop) => {
    if (drop.kind === "party-slot") act(source, { kind: "party-slot", slot: Number(drop.id) });
    else if (drop.kind === "box-slot") {
      const index = Number(drop.id);
      if (source.kind === "party") act(source, { kind: "box-slot", index });
      else act(source, { kind: "box-slot", index });
    } else if (drop.kind === "box-tab" || drop.kind === "box-empty") {
      act(source, { kind: "box", box: Number(drop.id) });
    }
  });

  /** Click while MOVE is armed: the clicked place is the destination. */
  const place = (target: PcTarget) => {
    if (armed && pinned) act(pinned, target);
  };

  const shownSource = pinned ?? hover;
  const shown = lookup(shownSource);
  const shownIsParty = shownSource?.kind === "party";

  const dropClass = (kind: string, id: string | number) =>
    dragging && over?.kind === kind && over.id === String(id) ? " drop-over" : "";

  const slotButton = (pokemon: PokemonProgression, source: PcSource, className: string, dropKind: string, dropId: number) => (
    <button
      type="button"
      key={`${source.kind}-${source.index}-${pokemon.species}`}
      className={`pc-slot${className}${sameSource(pinned, source) ? " pinned" : ""}${sameSource(dragging, source) ? " dragging" : ""}${dropClass(dropKind, dropId)}`}
      data-drop-kind={dropKind}
      data-drop-id={dropId}
      data-pc={`${source.kind}-${source.index}`}
      onMouseEnter={() => setHover(source)}
      onFocus={() => setHover(source)}
      onMouseLeave={() => setHover(null)}
      onClick={() => {
        if (armed && pinned && !sameSource(pinned, source)) {
          if (dropKind === "party-slot") place({ kind: "party-slot", slot: dropId });
          else place({ kind: "box-slot", index: dropId });
          return;
        }
        setPinned((current) => (sameSource(current, source) ? null : source));
        setArmed(false);
      }}
      {...dragProps(source, <b className="drag-chip">{pokemonDisplayName(pokemon)}</b>)}
    >
      <FrontSprite species={pokemon.species} name={localizedSpeciesName(pokemon.species)} compact shiny={pokemon.shiny} />
      <span className="pc-slot-name">
        {pokemonDisplayName(pokemon)}
        {pokemon.shiny && <ShinyStar />}
      </span>
      <span className="pc-slot-level">Lv{pokemon.level}</span>
    </button>
  );

  const partySlots = Array.from({ length: 6 }, (_, slot) => slot);
  const emptyCells = Math.max(0, PC_PER_BOX - members.length);

  return (
    <div className="mart-overlay pc-overlay" data-input-back>
      <section className="pc-window" aria-label={t("PC Storage")}>
        {ghost}
        <header className="pc-header">
          <h2>{t("PC Storage")}</h2>
          <strong className="pc-money">₽{story.money.toLocaleString("pt-BR")}</strong>
          <button type="button" className="pc-close" data-input-back onClick={onClose}>
            {t("Disconnect")}
          </button>
        </header>

        <div className="pc-body">
          <aside className="pc-party" aria-label={t("Party")}>
            <h3>{t("Party")}</h3>
            {partySlots.map((slot) => {
              const pokemon = slot === 0 ? lead : story.capturedPokemon[slot - 1];
              if (!pokemon) {
                return (
                  <button
                    type="button"
                    key={`party-empty-${slot}`}
                    className={`pc-slot empty${dropClass("party-slot", slot)}`}
                    data-drop-kind="party-slot"
                    data-drop-id={slot}
                    data-pc-party-empty={slot}
                    onClick={() => place({ kind: "party-slot", slot })}
                  >
                    —
                  </button>
                );
              }
              if (slot === 0) {
                return (
                  <button
                    type="button"
                    key="party-lead"
                    className={`pc-slot lead${dropClass("party-slot", 0)}`}
                    data-drop-kind="party-slot"
                    data-drop-id={0}
                    data-pc="lead"
                    onMouseEnter={() => setHover(null)}
                    onClick={() => setNotice(t("The lead Pokémon cannot be swapped."))}
                  >
                    <FrontSprite species={pokemon.species} name={localizedSpeciesName(pokemon.species)} compact shiny={pokemon.shiny} />
                    <span className="pc-slot-name">{pokemonDisplayName(pokemon)}</span>
                    <span className="pc-slot-level">Lv{pokemon.level}</span>
                  </button>
                );
              }
              return slotButton(pokemon, { kind: "party", index: slot - 1 }, "", "party-slot", slot);
            })}
          </aside>

          <div className="pc-box">
            <nav className="pc-tabs" aria-label={t("Boxes")}>
              {Array.from({ length: PC_BOX_COUNT }, (_, index) => {
                const locked = index >= open;
                const next = index === open;
                if (locked && !next) return null;
                if (next) {
                  const price = pcBoxPrice(index + 1);
                  return (
                    <button
                      type="button"
                      key={`buy-${index}`}
                      className="pc-tab buy"
                      data-pc-buy
                      disabled={story.money < price}
                      title={t("Buy box {n} for ₽{price}", { n: index + 1, price: price.toLocaleString("pt-BR") })}
                      onClick={() => {
                        const bought = buyNextPcBox(story);
                        if (bought.accepted) {
                          onStoryChange((current) => buyNextPcBox(current).story);
                          setNotice(t("Box {n} bought!", { n: index + 1 }));
                          setBox(index);
                        } else {
                          setNotice(t("Not enough money."));
                        }
                      }}
                    >
                      + ₽{price.toLocaleString("pt-BR")}
                    </button>
                  );
                }
                return (
                  <button
                    type="button"
                    key={index}
                    className={`pc-tab${index === box ? " active" : ""}${dropClass("box-tab", index)}`}
                    data-drop-kind="box-tab"
                    data-drop-id={index}
                    data-pc-tab={index}
                    onClick={() => (armed && pinned ? place({ kind: "box", box: index }) : setBox(index))}
                  >
                    {index + 1}
                    <small>{boxMembers(story, index).length}</small>
                  </button>
                );
              })}
            </nav>

            <div className="pc-grid">
              {members.map((index) =>
                slotButton(story.boxedPokemon[index], { kind: "box", index }, "", "box-slot", index),
              )}
              {Array.from({ length: emptyCells }, (_, cell) => (
                <button
                  type="button"
                  key={`empty-${cell}`}
                  className={`pc-slot empty${dropClass("box-empty", box)}`}
                  data-drop-kind="box-empty"
                  data-drop-id={box}
                  tabIndex={-1}
                  onClick={() => place({ kind: "box", box })}
                />
              ))}
            </div>
          </div>

          <section className="pc-summary" aria-live="polite">
            {shown ? (
              <>
                {pinned && (
                  <div className="pc-actions">
                    <button
                      type="button"
                      data-pc-move
                      aria-pressed={armed}
                      onClick={() => {
                        setArmed((current) => !current);
                        setNotice(armed ? "" : t("Click where it should go."));
                      }}
                    >
                      {t("MOVE")}
                    </button>
                    {shownIsParty ? (
                      <button type="button" onClick={() => act(pinned, { kind: "box", box })}>
                        {t("Deposit")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => act(pinned, { kind: "party-slot", slot: story.capturedPokemon.length + 1 })}
                      >
                        {t("Withdraw")}
                      </button>
                    )}
                  </div>
                )}
                <h3>
                  {pokemonDisplayName(shown)}
                  {shown.shiny && <ShinyStar />} · Lv{shown.level}
                </h3>
                <div className="pokemon-window-card-top">
                  <FrontSprite species={shown.species} name={localizedSpeciesName(shown.species)} shiny={shown.shiny} />
                  <SummaryInfo pokemon={shown} story={story} />
                </div>
                <SummaryStats pokemon={shown} />
                <MoveSlots
                  moves={shown.activeMoves}
                  movePp={shown.movePp}
                  onReorder={
                    pinned && shownSource && shownSource.kind === "party"
                      ? (from, to) => {
                          const result = reorderPartyMoves(story, shownSource.index + 1, from, to);
                          if (result.accepted) onStoryChange(() => result.story);
                        }
                      : undefined
                  }
                />
              </>
            ) : (
              <p className="pokemon-window-hint">
                {t("Point at a Pokémon to see its Summary. Drag it to a slot, a box tab or the party.")}
              </p>
            )}
          </section>
        </div>

        <p className="pc-notice">{notice}</p>
      </section>
    </div>
  );
}

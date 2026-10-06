"use client";

import { useState } from "react";
import { t, useLocale } from "@/lib/i18n";
import {
  calculateDuelPokemonMaxHp,
  type PokemonProgression,
} from "@tactimon/battle-engine";
import {
  POKEMON_STORAGE_CAPACITY,
  type CapturedPokemon,
  type PokemonStorageActionResult,
} from "@/lib/story";

type Props = {
  starter: PokemonProgression | null;
  party: readonly CapturedPokemon[];
  storage: readonly CapturedPokemon[];
  onDeposit: (
    capturedIndex: number,
  ) => PokemonStorageActionResult;
  onWithdraw: (
    boxedIndex: number,
  ) => PokemonStorageActionResult;
  onClose: () => void;
};

function displayName(species: string): string {
  return (
    species.charAt(0).toUpperCase() +
    species.slice(1)
  );
}

function actionMessage(
  action: "deposit" | "withdraw",
  result: PokemonStorageActionResult,
): string {
  if (result.accepted) {
    return action === "deposit"
      ? t("Pokémon sent to the PC.")
      : t("Pokémon withdrawn to the party.");
  }

  if (result.reason === "party-full") {
    return t("Your party already has 6 Pokémon.");
  }

  if (result.reason === "storage-full") {
    return t("The PC Storage is full.");
  }

  return t("That Pokémon could not be moved.");
}

function PokemonSummary({
  pokemon,
}: {
  pokemon: PokemonProgression;
}) {
  const maxHp = calculateDuelPokemonMaxHp(pokemon);

  return (
    <div className="mart-item-copy">
      <span>
        {pokemon.nickname ?? displayName(pokemon.species)}
        {pokemon.shiny ? " ★" : ""} · Lv.{" "}
        {pokemon.level}
      </span>
      <strong>
        HP {pokemon.currentHp}/{maxHp}
      </strong>
      <small>
        {pokemon.activeMoves
          .map((move) => displayName(move))
          .join(" · ")}
      </small>
    </div>
  );
}

export function StorageOverlay({
  starter,
  party,
  storage,
  onDeposit,
  onWithdraw,
  onClose,
}: Props) {
  useLocale();
  const [notice, setNotice] = useState<string>(() =>
    t("PC Storage: organize the Pokémon in your party and Box."),
  );
  const partyCount = (starter ? 1 : 0) + party.length;

  return (
    <div className="mart-overlay">
      <section className="mart-panel">
        <div className="mart-header">
          <div>
            <span className="eyebrow">
              {t("VIRIDIAN POKÉMON CENTER")}
            </span>
            <h2>{t("PC Storage")}</h2>
          </div>
          <strong>
            {storage.length}/{POKEMON_STORAGE_CAPACITY}
          </strong>
        </div>

        <p className="mart-copy">{notice}</p>

        <h3>
          {t("Party")} · {partyCount}/6
        </h3>
        <div className="mart-item-list">
          {starter && (
            <article className="mart-item-card">
              <PokemonSummary pokemon={starter} />
              <div className="mart-item-actions">
                <button type="button" disabled>
                  {t("Starter")}
                </button>
              </div>
            </article>
          )}

          {party.map((pokemon, index) => (
            <article
              key={`party-${index}-${pokemon.species}`}
              className="mart-item-card"
            >
              <PokemonSummary pokemon={pokemon} />
              <div className="mart-item-actions">
                <button
                  type="button"
                  disabled={
                    storage.length >=
                    POKEMON_STORAGE_CAPACITY
                  }
                  onClick={() =>
                    setNotice(
                      actionMessage(
                        "deposit",
                        onDeposit(index),
                      ),
                    )
                  }
                >
                  {t("Deposit")}
                </button>
              </div>
            </article>
          ))}
        </div>

        <h3>
          {t("Box")} · {storage.length}
        </h3>
        {storage.length === 0 ? (
          <p className="mart-copy">
            {t("No Pokémon stored.")}
          </p>
        ) : (
          <div className="mart-item-list">
            {storage.map((pokemon, index) => (
              <article
                key={`box-${index}-${pokemon.species}`}
                className="mart-item-card"
              >
                <PokemonSummary pokemon={pokemon} />
                <div className="mart-item-actions">
                  <button
                    type="button"
                    disabled={partyCount >= 6}
                    onClick={() =>
                      setNotice(
                        actionMessage(
                          "withdraw",
                          onWithdraw(index),
                        ),
                      )
                    }
                  >
                    {t("Withdraw")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <button
          type="button"
          className="mart-close"
          onClick={onClose}
        >
          {t("Disconnect")}
        </button>
      </section>
    </div>
  );
}

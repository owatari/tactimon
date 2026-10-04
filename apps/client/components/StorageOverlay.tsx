"use client";

import { useState } from "react";
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
      ? "Pokémon enviado ao PC."
      : "Pokémon retirado para a party.";
  }

  if (result.reason === "party-full") {
    return "Sua party já está com 6 Pokémon.";
  }

  if (result.reason === "storage-full") {
    return "O PC Storage está cheio.";
  }

  return "Não foi possível mover esse Pokémon.";
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
        {displayName(pokemon.species)} · Lv.{" "}
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
  const [notice, setNotice] = useState(
    "PC Storage: organize os Pokémon da sua party e do Box.",
  );
  const partyCount = (starter ? 1 : 0) + party.length;

  return (
    <div className="mart-overlay">
      <section className="mart-panel">
        <div className="mart-header">
          <div>
            <span className="eyebrow">
              VIRIDIAN POKÉMON CENTER
            </span>
            <h2>PC Storage</h2>
          </div>
          <strong>
            {storage.length}/{POKEMON_STORAGE_CAPACITY}
          </strong>
        </div>

        <p className="mart-copy">{notice}</p>

        <h3>Party · {partyCount}/6</h3>
        <div className="mart-item-list">
          {starter && (
            <article className="mart-item-card">
              <PokemonSummary pokemon={starter} />
              <div className="mart-item-actions">
                <button type="button" disabled>
                  Starter
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
                  Depositar
                </button>
              </div>
            </article>
          ))}
        </div>

        <h3>Box · {storage.length}</h3>
        {storage.length === 0 ? (
          <p className="mart-copy">
            Nenhum Pokémon armazenado.
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
                    Retirar
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
          Desconectar
        </button>
      </section>
    </div>
  );
}

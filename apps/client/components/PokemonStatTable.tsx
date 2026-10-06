import {
  calculateDuelPokemonStats,
  natureEffect,
  totalEv,
  type NatureStat,
  type PokemonProgression,
} from "@tactimon/battle-engine";
import { t, useLocale } from "@/lib/i18n";

type Row = { label: string; stat: "hp" | NatureStat; value: number; iv: number; ev: number };

/** STAT / IV / EV table shared by the capture screen and the Summary; the nature tints its two stats. */
export function PokemonStatTable({ pokemon }: { pokemon: PokemonProgression }) {
  useLocale();
  const stats = calculateDuelPokemonStats(pokemon);
  const effect = pokemon.nature ? natureEffect(pokemon.nature) : null;
  const showEvs = totalEv(pokemon.evs) > 0;
  const iv = (stat: Row["stat"]) => pokemon.ivs?.[stat] ?? 15;
  const rows: Row[] = [
    { label: "HP", stat: "hp", value: stats.hp, iv: iv("hp"), ev: pokemon.evs.hp },
    { label: t("ATTACK"), stat: "attack", value: stats.attack, iv: iv("attack"), ev: pokemon.evs.attack },
    { label: t("DEFENSE"), stat: "defense", value: stats.defense, iv: iv("defense"), ev: pokemon.evs.defense },
    { label: t("SP. ATK"), stat: "specialAttack", value: stats.specialAttack, iv: iv("specialAttack"), ev: pokemon.evs.specialAttack },
    { label: t("SP. DEF"), stat: "specialDefense", value: stats.specialDefense, iv: iv("specialDefense"), ev: pokemon.evs.specialDefense },
    { label: t("SPEED"), stat: "speed", value: stats.speed, iv: iv("speed"), ev: pokemon.evs.speed },
  ];
  const tint = (stat: Row["stat"]) =>
    stat === "hp" ? undefined : effect?.up === stat ? "nature-up" : effect?.down === stat ? "nature-down" : undefined;
  const arrow = (stat: Row["stat"]) =>
    stat === "hp" ? "" : effect?.up === stat ? " ▲" : effect?.down === stat ? " ▼" : "";

  return (
    <table className="capture-stats">
      <thead>
        <tr>
          <th />
          <th>{t("STAT")}</th>
          <th>IV</th>
          {showEvs && <th>EV</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.stat}>
            <th className={tint(row.stat)}>
              {row.label}
              {arrow(row.stat)}
            </th>
            <td className={tint(row.stat)}>{row.value}</td>
            <td className="capture-iv-cell">
              <span className="capture-iv-bar" aria-hidden="true">
                <i style={{ width: `${(row.iv / 31) * 100}%` }} />
              </span>
              <b>{row.iv}</b>
            </td>
            {showEvs && <td>{row.ev}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

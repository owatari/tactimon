import { NATURE_IDS, natureEffect, type NatureId, type NatureStat } from "@tactimon/battle-engine";
import { t, tx } from "./i18n";

/** Display names (English keys, translated through the `natures` catalog). */
const NATURE_LABELS: Record<NatureId, string> = {
  hardy: tx("Hardy"),
  lonely: tx("Lonely"),
  brave: tx("Brave"),
  adamant: tx("Adamant"),
  naughty: tx("Naughty"),
  bold: tx("Bold"),
  docile: tx("Docile"),
  relaxed: tx("Relaxed"),
  impish: tx("Impish"),
  lax: tx("Lax"),
  timid: tx("Timid"),
  hasty: tx("Hasty"),
  serious: tx("Serious"),
  jolly: tx("Jolly"),
  naive: tx("Naive"),
  modest: tx("Modest"),
  mild: tx("Mild"),
  quiet: tx("Quiet"),
  bashful: tx("Bashful"),
  rash: tx("Rash"),
  calm: tx("Calm"),
  gentle: tx("Gentle"),
  sassy: tx("Sassy"),
  careful: tx("Careful"),
  quirky: tx("Quirky"),
};

export function natureName(nature: NatureId): string {
  return t(NATURE_LABELS[nature]);
}

const STAT_LABELS: Record<NatureStat, string> = {
  attack: tx("ATTACK"),
  defense: tx("DEFENSE"),
  specialAttack: tx("SP. ATK"),
  specialDefense: tx("SP. DEF"),
  speed: tx("SPEED"),
};

export function natureStatLabel(stat: NatureStat): string {
  return t(STAT_LABELS[stat]);
}

/** "ATTACK ▲ SP. ATK ▼" style summary; `null` for neutral natures. */
export function natureEffectText(nature: NatureId): string | null {
  const { up, down } = natureEffect(nature);
  if (!up || !down) return null;
  return `+${natureStatLabel(up)} −${natureStatLabel(down)}`;
}

export { NATURE_IDS };

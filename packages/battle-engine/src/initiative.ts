import type { BattleUnit } from "./types";

export function orderByInitiative(units: readonly BattleUnit[]): BattleUnit[] {
  return [...units].sort((a, b) => a.speed !== b.speed ? b.speed - a.speed : a.id.localeCompare(b.id));
}

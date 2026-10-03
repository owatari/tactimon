export const MAX_PARTY_SIZE = 6;
export const MAX_MOVE_SLOTS = 4;
export const MAX_IV = 31;
export const MAX_EV_PER_STAT = 252;
export const MAX_TOTAL_EV = 510;

export interface MoveDefinition {
  id: string;
  type: string;
  category: "physical" | "special" | "status";
  power: number | null;
  accuracy: number | null;
  apCost: number;
  minRange: number;
  maxRange: number;
  lineOfSight: boolean;
  shape: string;
}

export interface AutoEvProfile { hp:number; attack:number; defense:number; specialAttack:number; specialDefense:number; speed:number; }
export interface SpeciesDefinition { id:string; catchRate:number; autoEvProfile:AutoEvProfile; }
export interface EncounterDefinition { id:string; arenaId:string; capturePolicy:"allowed"|"forbidden"; captureHpThresholdRatio:number; maxPlayerPokemon:number; }

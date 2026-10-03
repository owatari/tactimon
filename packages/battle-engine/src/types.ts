export type UnitId = string;

export interface Point { x: number; y: number; }

export interface BattleUnit {
  id: UnitId;
  ownerId: string | null;
  wild: boolean;
  boss: boolean;
  currentHp: number;
  maxHp: number;
  speed: number;
  position: Point;
  captureAttempted: boolean;
}

export type CapturePolicy = "allowed" | "forbidden";

export interface EncounterRules {
  capturePolicy: CapturePolicy;
  captureHpThresholdRatio: number;
}

export type EquipmentSlot =
  | { kind: "held"; itemId: string }
  | { kind: "berry"; itemId: string }
  | null;

export interface PokemonEquipment {
  unlockedHeldIds: string[];
  active: EquipmentSlot;
}

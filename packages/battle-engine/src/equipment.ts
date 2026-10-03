import type { EquipmentSlot, PokemonEquipment } from "./types";

export function unlockHeld(equipment: PokemonEquipment, itemId: string): PokemonEquipment {
  if (equipment.unlockedHeldIds.includes(itemId)) return equipment;
  return { ...equipment, unlockedHeldIds: [...equipment.unlockedHeldIds, itemId] };
}

export function equipHeld(equipment: PokemonEquipment, itemId: string): PokemonEquipment {
  if (!equipment.unlockedHeldIds.includes(itemId)) throw new Error(`Held item "${itemId}" is not unlocked on this Pokémon`);
  return { ...equipment, active: { kind: "held", itemId } };
}

export function equipBerry(equipment: PokemonEquipment, itemId: string): PokemonEquipment {
  return { ...equipment, active: { kind: "berry", itemId } };
}

export function clearEquipment(equipment: PokemonEquipment): PokemonEquipment {
  return { ...equipment, active: null };
}

export function consumeBerry(equipment: PokemonEquipment): PokemonEquipment {
  if (equipment.active?.kind !== "berry") return equipment;
  return { ...equipment, active: null };
}

export function activeEquipment(equipment: PokemonEquipment): EquipmentSlot { return equipment.active; }

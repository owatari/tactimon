import {
  DUEL_MOVES,
  type DuelInventory,
  calculateDuelPokemonStats,
  grantRareCandy,
  type DuelMajorStatus,
  type PokemonProgression,
  type ProgressionReward,
} from "@tactimon/battle-engine";
import {
  isBagItemId,
  itemDisplayName,
  type OverworldItemId,
} from "./items";
import type {
  CapturedPokemon,
  StoryState,
} from "./story";

export const REPEL_STEPS = 100;

type HealEffect = { kind: "heal"; amount: number };
type CureEffect = {
  kind: "cure";
  statuses: readonly Exclude<DuelMajorStatus, null>[];
};
type ItemEffect =
  | HealEffect
  | CureEffect
  | { kind: "revive" }
  | { kind: "pp"; amount: number | "max"; allMoves: boolean }
  | { kind: "rare-candy" }
  | { kind: "repel" };

export const ITEM_EFFECTS: Partial<
  Record<OverworldItemId, ItemEffect>
> = {
  potion: { kind: "heal", amount: 20 },
  "super-potion": { kind: "heal", amount: 50 },
  "hyper-potion": { kind: "heal", amount: 200 },
  antidote: { kind: "cure", statuses: ["poison"] },
  "parlyz-heal": { kind: "cure", statuses: ["paralysis"] },
  awakening: { kind: "cure", statuses: ["sleep"] },
  "burn-heal": { kind: "cure", statuses: ["burn"] },
  "lava-cookie": {
    kind: "cure",
    statuses: ["poison", "paralysis", "sleep", "burn"],
  },
  revive: { kind: "revive" },
  ether: { kind: "pp", amount: 10, allMoves: false },
  "max-ether": { kind: "pp", amount: "max", allMoves: false },
  elixir: { kind: "pp", amount: 10, allMoves: true },
  "rare-candy": { kind: "rare-candy" },
  repel: { kind: "repel" },
};

/** Whether the Bag can use this item on the field at all. */
export function isFieldUsableItem(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ITEM_EFFECTS, id);
}

/** Needs a target move chosen after the Pokémon (Ether / Max Ether). */
export function itemNeedsMoveTarget(id: string): boolean {
  const effect = ITEM_EFFECTS[id as OverworldItemId];
  return effect?.kind === "pp" && !effect.allMoves;
}

/** Applies to the whole player (no Pokémon target). */
export function itemTargetsTrainer(id: string): boolean {
  return ITEM_EFFECTS[id as OverworldItemId]?.kind === "repel";
}

export type ItemUseResult = {
  accepted: boolean;
  story: StoryState;
  message: string;
  reward?: ProgressionReward;
  partyIndex?: number;
};

function quantityOf(
  story: StoryState,
  id: OverworldItemId,
): number {
  return isBagItemId(id)
    ? (story.bagItems?.[id] ?? 0)
    : (story.inventory[id] ?? 0);
}

function consume(
  story: StoryState,
  id: OverworldItemId,
): StoryState {
  const next = quantityOf(story, id) - 1;

  if (isBagItemId(id)) {
    const bagItems = { ...story.bagItems };
    if (next > 0) bagItems[id] = next;
    else delete bagItems[id];
    return { ...story, bagItems };
  }

  return {
    ...story,
    inventory: { ...story.inventory, [id]: next },
  };
}

function withPartyMember(
  story: StoryState,
  partyIndex: number,
  update: (pokemon: PokemonProgression) => PokemonProgression,
): StoryState {
  if (partyIndex === 0 && story.playerPokemon) {
    return {
      ...story,
      playerPokemon: update(story.playerPokemon),
    };
  }

  return {
    ...story,
    capturedPokemon: story.capturedPokemon.map(
      (pokemon, index) =>
        index === partyIndex - 1
          ? ({
              ...update(pokemon),
              species: pokemon.species,
            } as CapturedPokemon)
          : pokemon,
    ),
  };
}

function memberAt(
  story: StoryState,
  partyIndex: number,
): PokemonProgression | null {
  return partyIndex === 0
    ? story.playerPokemon
    : (story.capturedPokemon[partyIndex - 1] ?? null);
}

const refuse = (
  story: StoryState,
  message: string,
): ItemUseResult => ({ accepted: false, story, message });

/**
 * Uses a Bag item from the Start menu. Nothing is consumed when the
 * item would have no effect, as in FireRed.
 */
export function useBagItem(
  story: StoryState,
  itemId: OverworldItemId,
  partyIndex: number,
  moveIndex = 0,
): ItemUseResult {
  const effect = ITEM_EFFECTS[itemId];
  if (!effect) {
    return refuse(story, "Este item não pode ser usado agora.");
  }
  if (quantityOf(story, itemId) <= 0) {
    return refuse(story, "Você não tem mais este item.");
  }

  if (effect.kind === "repel") {
    if ((story.repelSteps ?? 0) > 0) {
      return refuse(story, "O efeito do Repel ainda está ativo.");
    }
    return {
      accepted: true,
      story: { ...consume(story, itemId), repelSteps: REPEL_STEPS },
      message: "Repel usado! Pokémon fracos ficarão longe.",
    };
  }

  const target = memberAt(story, partyIndex);
  if (!target) {
    return refuse(story, "Não há Pokémon nesse slot.");
  }
  const maxHp = calculateDuelPokemonStats(target).hp;
  const name = itemDisplayName(itemId);

  if (effect.kind === "heal") {
    if (target.currentHp <= 0) {
      return refuse(story, "Não teve efeito: o Pokémon desmaiou.");
    }
    if (target.currentHp >= maxHp) {
      return refuse(story, "Não teve efeito: o HP já está cheio.");
    }
    const healed = Math.min(maxHp, target.currentHp + effect.amount);
    return {
      accepted: true,
      story: withPartyMember(consume(story, itemId), partyIndex, (p) => ({
        ...p,
        currentHp: healed,
      })),
      message: `${name} restaurou ${healed - target.currentHp} HP.`,
    };
  }

  if (effect.kind === "cure") {
    if (
      target.currentHp <= 0 ||
      !target.status ||
      !effect.statuses.includes(target.status)
    ) {
      return refuse(story, "Não teve efeito.");
    }
    return {
      accepted: true,
      story: withPartyMember(consume(story, itemId), partyIndex, (p) => ({
        ...p,
        status: null,
        sleepTurnsRemaining: 0,
      })),
      message: `${name} curou o problema de status.`,
    };
  }

  if (effect.kind === "revive") {
    if (target.currentHp > 0) {
      return refuse(story, "Não teve efeito: o Pokémon não desmaiou.");
    }
    return {
      accepted: true,
      story: withPartyMember(consume(story, itemId), partyIndex, (p) => ({
        ...p,
        currentHp: Math.max(1, Math.floor(maxHp / 2)),
        status: null,
        sleepTurnsRemaining: 0,
      })),
      message: "O Pokémon foi revivido!",
    };
  }

  if (effect.kind === "pp") {
    const moves = effect.allMoves
      ? target.activeMoves
      : [target.activeMoves[moveIndex]].filter(Boolean);
    const restorable = moves.filter(
      (moveId) =>
        (target.movePp[moveId] ?? DUEL_MOVES[moveId].maxPp) <
        DUEL_MOVES[moveId].maxPp,
    );
    if (restorable.length === 0) {
      return refuse(story, "Não teve efeito: o PP já está cheio.");
    }
    return {
      accepted: true,
      story: withPartyMember(consume(story, itemId), partyIndex, (p) => {
        const movePp = { ...p.movePp };
        for (const moveId of restorable) {
          const max = DUEL_MOVES[moveId].maxPp;
          movePp[moveId] =
            effect.amount === "max"
              ? max
              : Math.min(max, (movePp[moveId] ?? max) + effect.amount);
        }
        return { ...p, movePp };
      }),
      message: "O PP foi restaurado.",
    };
  }

  // rare-candy
  const reward = grantRareCandy(target);
  if (!reward) {
    return refuse(story, "Não teve efeito: já está no nível 100.");
  }
  return {
    accepted: true,
    story: withPartyMember(
      consume(story, itemId),
      partyIndex,
      () => reward.progression,
    ),
    message: `Subiu para o nível ${reward.newLevel}!`,
    reward,
    partyIndex,
  };
}

/** Repel keeps away wild packs whose members are all below the lead's level. */
export function repelBlocksEncounter(
  story: StoryState,
  members: readonly { level: number }[],
): boolean {
  if ((story.repelSteps ?? 0) <= 0) {
    return false;
  }

  const lead = [story.playerPokemon, ...story.capturedPokemon].find(
    (pokemon) => pokemon && pokemon.currentHp > 0,
  );

  return (
    Boolean(lead) &&
    members.every((member) => member.level < (lead?.level ?? 0))
  );
}

/** Bag items that the battle engine can use (stored in `bagItems`). */
const BATTLE_BAG_ITEM_IDS = [
  "super-potion",
  "hyper-potion",
  "antidote",
  "parlyz-heal",
  "awakening",
  "burn-heal",
  "great-ball",
] as const;

/** Battle bag = engine inventory + usable Bag items. */
export function toBattleInventory(
  story: StoryState,
): DuelInventory {
  const inventory: DuelInventory = { ...story.inventory };
  for (const id of BATTLE_BAG_ITEM_IDS) {
    const amount = story.bagItems?.[id] ?? 0;
    if (amount > 0) {
      inventory[id] = amount;
    }
  }

  return inventory;
}

/** Writes the post-battle counts back to the inventory and the Bag. */
export function applyBattleInventory(
  story: StoryState,
  inventory: DuelInventory,
): StoryState {
  const bagItems = { ...story.bagItems };
  for (const id of BATTLE_BAG_ITEM_IDS) {
    const amount = inventory[id] ?? 0;
    if (amount > 0) bagItems[id] = amount;
    else delete bagItems[id];
  }

  return {
    ...story,
    inventory: {
      potion: inventory.potion,
      "poke-ball": inventory["poke-ball"],
    },
    bagItems,
  };
}

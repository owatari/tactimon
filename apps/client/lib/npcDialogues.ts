type DialogueFactory = (
  firstBattleComplete: boolean,
) => string;

const VIRIDIAN_NPC_DIALOGUES: Record<
  string,
  DialogueFactory
> = {
  "16,22": () =>
    "Garoto: É ótimo poder carregar Pokémon e usá-los a qualquer hora, em qualquer lugar.",
  "34,11": () =>
    "Homem: O Ginásio Pokémon de Viridian está sempre fechado. Quem será o Líder?",
  "20,12": (firstBattleComplete) =>
    firstBattleComplete
      ? "Mulher: Às vezes vou fazer compras em Pewter City. Preciso atravessar a trilha sinuosa da Viridian Forest."
      : "Mulher: Meu avô ainda não tomou o café dele. Desculpe por ele estar tão mal-humorado.",
  "33,26": () =>
    "Youngster: Caterpie não é venenoso, mas Weedle é. Cuidado com o Poison Sting.",
  "21,6": (firstBattleComplete) =>
    firstBattleComplete
      ? "Velho: Primeiro enfraqueça o Pokémon antes de tentar capturá-lo."
      : "Velho: Esta passagem é propriedade privada por enquanto!",
};

export function resolveNpcDialogue(
  mapId: string,
  x: number,
  y: number,
  firstBattleComplete: boolean,
): string | null {
  if (mapId !== "viridian-city") {
    return null;
  }

  return (
    VIRIDIAN_NPC_DIALOGUES[`${x},${y}`]?.(
      firstBattleComplete,
    ) ?? null
  );
}

/**
 * Headline of the single post-battle results screen. Pure so every outcome
 * (victory, defeat, capture, escape, tutorial) is described in one place.
 */

export type BattleResultKind =
  | "victory"
  | "defeat"
  | "capture"
  | "capture-failed"
  | "escaped"
  | "opponent-fled";

export type BattleResultInput = {
  won: boolean;
  escaped: boolean;
  escapedBy?: "player" | "rival";
  encounterKind: "wild" | "trainer";
  /** Trainer name, or the (first) wild Pokémon's display name. */
  opponentName: string;
  opponentCount: number;
  tutorial?: boolean;
  prizeMoney?: number;
  capture?: {
    success: boolean;
    speciesName: string;
    level: number;
    destination?: "party" | "storage" | null;
  };
};

export type BattleResultHeadline = {
  kind: BattleResultKind;
  title: string;
  message: string;
  note: string | null;
};

export function describeBattleResult(
  input: BattleResultInput,
): BattleResultHeadline {
  if (input.capture) {
    const { speciesName, level, success, destination } =
      input.capture;
    if (success) {
      return {
        kind: "capture",
        title: "CAPTURADO!",
        message: `${speciesName} Lv. ${level} foi capturado!`,
        note:
          destination === "storage"
            ? "Party cheia: enviado ao PC."
            : destination === "party"
              ? "Adicionado à sua party."
              : null,
      };
    }

    return {
      kind: "capture-failed",
      title: "ESCAPOU",
      message: `${speciesName} escapou da Poké Ball.`,
      note: null,
    };
  }

  if (input.escaped) {
    return input.escapedBy === "rival"
      ? {
          kind: "opponent-fled",
          title: "FUGIU",
          message: `${input.opponentName} fugiu do combate.`,
          note: null,
        }
      : {
          kind: "escaped",
          title: "ESCAPOU",
          message: "Você fugiu em segurança.",
          note: null,
        };
  }

  const wildGroup =
    input.encounterKind === "wild" && input.opponentCount > 1;

  if (input.won) {
    return {
      kind: "victory",
      title: "VITÓRIA!",
      message:
        input.encounterKind === "trainer"
          ? `Você derrotou ${input.opponentName}!`
          : wildGroup
            ? `${input.opponentCount} Pokémon selvagens foram derrotados!`
            : `${input.opponentName} selvagem foi derrotado!`,
      note: null,
    };
  }

  return {
    kind: "defeat",
    title: "DERROTA",
    message:
      input.encounterKind === "trainer"
        ? `${input.opponentName} venceu desta vez.`
        : wildGroup
          ? "Seu time foi derrotado pelo grupo selvagem."
          : "Seu time foi derrotado.",
    note: input.tutorial
      ? "O Prof. Oak cuidou do seu Pokémon. A jornada continua!"
      : null,
  };
}

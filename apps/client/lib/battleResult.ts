import { t } from "@/lib/i18n";

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
        title: t("CAPTURED!"),
        message: t("{species} Lv. {level} was captured!", {
          species: speciesName,
          level,
        }),
        note:
          destination === "storage"
            ? t("Party full: sent to the PC.")
            : destination === "party"
              ? t("Added to your party.")
              : null,
      };
    }

    return {
      kind: "capture-failed",
      title: t("ESCAPED"),
      message: t("{species} broke free from the Poké Ball.", {
        species: speciesName,
      }),
      note: null,
    };
  }

  if (input.escaped) {
    return input.escapedBy === "rival"
      ? {
          kind: "opponent-fled",
          title: t("FLED"),
          message: t("{name} fled from the battle.", {
            name: input.opponentName,
          }),
          note: null,
        }
      : {
          kind: "escaped",
          title: t("ESCAPED"),
          message: t("You got away safely."),
          note: null,
        };
  }

  const wildGroup =
    input.encounterKind === "wild" && input.opponentCount > 1;

  if (input.won) {
    return {
      kind: "victory",
      title: t("VICTORY!"),
      message:
        input.encounterKind === "trainer"
          ? t("You defeated {name}!", {
              name: input.opponentName,
            })
          : wildGroup
            ? t("{count} wild Pokémon were defeated!", {
                count: input.opponentCount,
              })
            : t("Wild {name} was defeated!", {
                name: input.opponentName,
              }),
      note: null,
    };
  }

  return {
    kind: "defeat",
    title: t("DEFEAT"),
    message:
      input.encounterKind === "trainer"
        ? t("{name} won this time.", {
            name: input.opponentName,
          })
        : wildGroup
          ? t("Your team was defeated by the wild pack.")
          : t("Your team was defeated."),
    note: input.tutorial
      ? t("Prof. Oak took care of your Pokémon. The journey continues!")
      : null,
  };
}

import { describe, expect, it } from "vitest";
import { describeBattleResult } from "../apps/client/lib/battleResult";

describe("post-battle results headline", () => {
  it("describes trainer and wild victories", () => {
    expect(
      describeBattleResult({
        won: true,
        escaped: false,
        encounterKind: "trainer",
        opponentName: "Brock",
        opponentCount: 2,
      }),
    ).toMatchObject({ kind: "victory", message: "You defeated Brock!" });
    expect(
      describeBattleResult({
        won: true,
        escaped: false,
        encounterKind: "wild",
        opponentName: "Pidgey",
        opponentCount: 8,
      }).message,
    ).toBe("8 wild Pokémon were defeated!");
  });

  it("describes one capture by name and several by count", () => {
    const one = describeBattleResult({
      won: true,
      escaped: false,
      encounterKind: "wild",
      opponentName: "Zubat",
      opponentCount: 1,
      captures: [{ speciesName: "Zubat", level: 6 }],
    });
    expect(one.kind).toBe("capture");
    expect(one.message).toContain("Zubat Lv. 6");
    expect(one.note).toContain("where each one goes");
    const many = describeBattleResult({
      won: true,
      escaped: false,
      encounterKind: "wild",
      opponentName: "Zubat",
      opponentCount: 3,
      captures: [
        { speciesName: "Zubat", level: 6 },
        { speciesName: "Rattata", level: 4 },
        { speciesName: "Pidgey", level: 5 },
      ],
    });
    expect(many.kind).toBe("capture");
    expect(many.message).toContain("3 Pokémon");
  });

  it("keeps the tutorial defeat friendly instead of a whiteout message", () => {
    const result = describeBattleResult({
      won: false,
      escaped: false,
      encounterKind: "trainer",
      opponentName: "Blue",
      opponentCount: 1,
      tutorial: true,
    });
    expect(result.kind).toBe("defeat");
    expect(result.note).toContain("Prof. Oak");
  });

  it("distinguishes player escape from a fleeing opponent", () => {
    const base = {
      won: false,
      escaped: true,
      encounterKind: "wild" as const,
      opponentName: "Abra",
      opponentCount: 1,
    };
    expect(describeBattleResult(base).kind).toBe("escaped");
    expect(
      describeBattleResult({ ...base, escapedBy: "rival" }).message,
    ).toBe("Abra fled from the battle.");
  });
});

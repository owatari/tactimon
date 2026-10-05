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
    ).toMatchObject({ kind: "victory", message: "Você derrotou Brock!" });
    expect(
      describeBattleResult({
        won: true,
        escaped: false,
        encounterKind: "wild",
        opponentName: "Pidgey",
        opponentCount: 8,
      }).message,
    ).toBe("8 Pokémon selvagens foram derrotados!");
  });

  it("describes captures with their destination", () => {
    const result = describeBattleResult({
      won: true,
      escaped: false,
      encounterKind: "wild",
      opponentName: "Zubat",
      opponentCount: 1,
      capture: {
        success: true,
        speciesName: "Zubat",
        level: 6,
        destination: "storage",
      },
    });
    expect(result.kind).toBe("capture");
    expect(result.note).toContain("PC");
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
    ).toBe("Abra fugiu do combate.");
  });
});

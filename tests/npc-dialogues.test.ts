import { describe, expect, it } from "vitest";
import { resolveNpcDialogue } from "../apps/client/lib/npcDialogues";

describe("overworld NPC dialogue", () => {
  it("imports dialogue for existing Viridian NPCs", () => {
    expect(
      resolveNpcDialogue(
        "viridian-city",
        16,
        22,
        true,
      ),
    ).toContain("carregar Pokémon");

    expect(
      resolveNpcDialogue(
        "viridian-city",
        34,
        11,
        true,
      ),
    ).toContain("Ginásio Pokémon");
  });

  it("uses story progress for the Viridian woman", () => {
    expect(
      resolveNpcDialogue(
        "viridian-city",
        20,
        12,
        false,
      ),
    ).toContain("café");

    expect(
      resolveNpcDialogue(
        "viridian-city",
        20,
        12,
        true,
      ),
    ).toContain("Pewter City");
  });

  it("gives unsupported or future world NPCs a safe in-world fallback", () => {
    expect(
      resolveNpcDialogue(
        "route-1",
        16,
        22,
        true,
      ),
    ).toContain("estrada");

    expect(
      resolveNpcDialogue(
        "future-route",
        1,
        1,
        true,
      ),
    ).toContain("Continue explorando");
  });

  it("includes the newly imported Pallet, Route 1 and Oak Lab conversations", () => {
    expect(
      resolveNpcDialogue(
        "pallet-town",
        13,
        17,
        false,
      ),
    ).toContain("tecnologia");

    expect(
      resolveNpcDialogue(
        "route-1",
        19,
        16,
        true,
      ),
    ).toContain("barrancos");

    expect(
      resolveNpcDialogue(
        "oak-lab",
        3,
        11,
        true,
      ),
    ).toContain("assistente");
  });
});

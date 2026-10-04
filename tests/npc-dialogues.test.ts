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

  it("leaves unsupported maps and objects untouched", () => {
    expect(
      resolveNpcDialogue(
        "route-1",
        16,
        22,
        true,
      ),
    ).toBeNull();

    expect(
      resolveNpcDialogue(
        "viridian-city",
        1,
        1,
        true,
      ),
    ).toBeNull();
  });
});

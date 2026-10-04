import { describe, expect, it } from "vitest";
import {
  resolveOverworldDialogues,
} from "../apps/client/lib/overworldDialogues";

describe("Viridian Forest NPC dialogue", () => {
  it("restores the two NPCs inside the forest", () => {
    expect(
      resolveOverworldDialogues("viridian-forest").map(
        ({ id, x, y }) => ({ id, x, y }),
      ),
    ).toEqual([
      {
        id: "viridian-forest-youngster",
        x: 29,
        y: 58,
      },
      {
        id: "viridian-forest-boy",
        x: 45,
        y: 58,
      },
    ]);
  });

  it("restores both NPCs in the south gate", () => {
    expect(
      resolveOverworldDialogues(
        "route-2-forest-south-entrance",
      ),
    ).toHaveLength(2);
  });

  it("restores all three NPCs in the north gate", () => {
    const dialogues = resolveOverworldDialogues(
      "route-2-forest-north-entrance",
    );

    expect(dialogues).toHaveLength(3);
    expect(
      dialogues.map(({ x, y }) => ({ x, y })),
    ).toEqual([
      { x: 5, y: 4 },
      { x: 4, y: 7 },
      { x: 10, y: 5 },
    ]);
  });

  it("does not add these NPCs to unrelated maps", () => {
    expect(
      resolveOverworldDialogues("viridian-city"),
    ).toEqual([]);
  });
});

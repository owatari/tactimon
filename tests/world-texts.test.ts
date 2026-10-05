import { describe, expect, it } from "vitest";
import { resolveWorldObjectDialogueRequest } from "../apps/client/lib/dialogueSystem";
import { WORLD_MAPS } from "../apps/client/lib/maps";
import {
  WORLD_NPC_TEXT,
  WORLD_SIGN_TEXT,
} from "../apps/client/lib/worldTexts";

describe("FireRed world texts", () => {
  it("targets known maps with non-empty pages", () => {
    for (const table of [WORLD_NPC_TEXT, WORLD_SIGN_TEXT]) {
      for (const [key, pages] of Object.entries(table)) {
        expect(Object.keys(WORLD_MAPS), key).toContain(key.split(":")[0]);
        expect(pages.length, key).toBeGreaterThan(0);
        expect(pages.every((page) => page.trim().length > 0), key).toBe(true);
      }
    }
  });

  it("serves curated NPC text instead of the generic fallback", () => {
    const request = resolveWorldObjectDialogueRequest(
      "pewter-city",
      6,
      15,
      "Garota",
    );
    expect(request.kind).toBe("pages");
    if (request.kind === "pages") {
      expect(request.pages[0]).toContain("Clefairy");
    }
  });

  it("keeps every world-data map synced to a world.json url", () => {
    const missing = Object.values(WORLD_MAPS)
      .filter((map) => map.worldUrl === null)
      .map((map) => map.id);
    expect(missing).toEqual([]);
  });
});

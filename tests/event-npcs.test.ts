import { describe, expect, it } from "vitest";
import {
  EVENT_NPC_FLAG_VISIBLE,
  EVENT_NPC_TEXT,
  eventNpcPages,
  eventNpcSignature,
  isEventNpcVisible,
  trainerHiddenByStory,
} from "../apps/client/lib/eventNpcs";
import { cinnabarQuizTrainerId } from "../apps/client/lib/cinnabarQuiz";
import { resolveNpcPositionOverride } from "../apps/client/lib/npcOverrides";
import { chooseStarter, grantStoryBadge, markStoryTrainerDefeated, type StoryState } from "../apps/client/lib/story";
import { resolveWorldObjectDialogueRequest } from "../apps/client/lib/dialogueSystem";

const fresh = chooseStarter("charmander");
const withBoss = (story: StoryState, id: string) => markStoryTrainerDefeated(story, id);

describe("event NPC visibility (ROM hide flags)", () => {
  it("Saffron: Team Rocket's guards until Silph Co. is freed, then the citizens", () => {
    expect(isEventNpcVisible(62, fresh)).toBe(true);
    expect(isEventNpcVisible(63, fresh)).toBe(false);
    const freed = withBoss(fresh, "silph-co-11f-giovanni");
    expect(isEventNpcVisible(62, freed)).toBe(false);
    expect(isEventNpcVisible(63, freed)).toBe(true);
    expect(trainerHiddenByStory("silph-co-5f", fresh)).toBe(false);
    expect(trainerHiddenByStory("silph-co-5f", freed)).toBe(true);
    expect(trainerHiddenByStory("saffron-city", freed)).toBe(false);
  });

  it("Celadon's Rockets leave with the hideout; the Cerulean Cave guard leaves for the Champion", () => {
    expect(isEventNpcVisible(95, fresh)).toBe(true);
    expect(isEventNpcVisible(95, withBoss(fresh, "rocket-hideout-b-4f-giovanni"))).toBe(false);
    expect(isEventNpcVisible(92, fresh)).toBe(true);
    const champion = withBoss(fresh, "league-champion-blue-squirtle");
    expect(isEventNpcVisible(92, champion)).toBe(false);
    expect(isEventNpcVisible(157, fresh)).toBe(false);
    expect(isEventNpcVisible(157, champion)).toBe(true);
  });

  it("Pewter's guide and museum man are there until the Boulder Badge", () => {
    expect(isEventNpcVisible(46, fresh)).toBe(true);
    expect(isEventNpcVisible(80, fresh)).toBe(true);
    const badge = grantStoryBadge(fresh, "boulder");
    expect(isEventNpcVisible(46, badge)).toBe(false);
    expect(isEventNpcVisible(80, badge)).toBe(false);
  });

  it("flags without a rule are never rendered, and the signature follows the story", () => {
    expect(isEventNpcVisible(173, fresh)).toBe(false);
    const a = eventNpcSignature([62, 63, 173], fresh);
    const b = eventNpcSignature([62, 63, 173], withBoss(fresh, "silph-co-11f-giovanni"));
    expect(a).not.toBe(b);
    expect(Object.keys(EVENT_NPC_FLAG_VISIBLE).length).toBeGreaterThan(8);
  });
});

describe("event NPC lines and places", () => {
  it("every event NPC has at least one line, and the dialogue resolver finds them by ROM tile", () => {
    for (const [key, pages] of Object.entries(EVENT_NPC_TEXT)) {
      expect(pages.length, key).toBeGreaterThan(0);
      const [mapId, tile] = key.split(":");
      const [x, y] = tile.split(",").map(Number);
      expect(eventNpcPages(mapId, x, y)).toEqual(pages);
    }
    const request = resolveWorldObjectDialogueRequest("saffron-city", 22, 15, "Rocket M");
    expect(request.kind).toBe("pages");
  });

  it("the Fan Club members take their seats after the chairman's talk", () => {
    expect(resolveNpcPositionOverride("saffron-city-pokemon-trainer-fan-club", 5, fresh)).toBeNull();
    const seated = { ...fresh, keyItemIds: ["bike-voucher"] } as StoryState;
    expect(resolveNpcPositionOverride("saffron-city-pokemon-trainer-fan-club", 5, seated)).toEqual({ x: 10, y: 3 });
    expect(resolveNpcPositionOverride("saffron-city-pokemon-trainer-fan-club", 4, seated)).toEqual({ x: 2, y: 2 });
    expect(isEventNpcVisible(108, fresh)).toBe(false);
    expect(isEventNpcVisible(108, seated)).toBe(true);
  });

  it("each Cinnabar quiz machine has its own trainer behind the door", () => {
    const ids = [1, 2, 3, 4, 5, 6].map((quiz) => cinnabarQuizTrainerId(quiz));
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(6);
  });
});

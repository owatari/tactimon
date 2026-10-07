import { describe, expect, it } from "vitest";
import { resolveNpcPositionOverride } from "../apps/client/lib/npcOverrides";
import { chooseStarter, grantStoryBadge, type StoryState } from "../apps/client/lib/story";

describe("NPCs that stand somewhere else for gameplay reasons", () => {
  const base = chooseStarter("charmander");

  it("the man outside the Viridian Gym stands in front of the door until six badges are earned", () => {
    expect(resolveNpcPositionOverride("viridian-city", 3, base)).toEqual({ x: 36, y: 11 });
    let story: StoryState = base;
    for (const badge of ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh"] as const) story = grantStoryBadge(story, badge);
    expect(resolveNpcPositionOverride("viridian-city", 3, story)).toEqual({ x: 36, y: 11 });
    story = grantStoryBadge(story, "volcano");
    expect(resolveNpcPositionOverride("viridian-city", 3, story)).toBeNull();
  });

  it("the Mt. Moon scientist takes the fossil you left (ROM walk + copyobjectxytoperm)", () => {
    expect(resolveNpcPositionOverride("mt-moon-b2f", 3, base)).toBeNull();
    expect(resolveNpcPositionOverride("mt-moon-b2f", 3, { ...base, mtMoonFossil: "helix" } as StoryState)).toEqual({ x: 14, y: 8 });
    expect(resolveNpcPositionOverride("mt-moon-b2f", 3, { ...base, mtMoonFossil: "dome" } as StoryState)).toEqual({ x: 13, y: 8 });
  });

  it("other maps and NPCs are untouched", () => {
    expect(resolveNpcPositionOverride("pewter-city", 3, base)).toBeNull();
    expect(resolveNpcPositionOverride("viridian-city", 4, base)).toBeNull();
  });
});

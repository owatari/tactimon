import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import { runDialogueInteraction } from "../apps/client/lib/dialogueSystem";
import { canStoryUseRockSmash } from "../apps/client/lib/fieldTechniques";
import { partyCanUseHm, speciesCanUseHm } from "../apps/client/lib/hmParty";
import {
  resolveScriptedWorldObjects,
  smashableRockId,
} from "../apps/client/lib/scriptedWorldObjects";
import { SMASHABLE_ROCKS } from "../apps/client/lib/generated/worldObstacles";
import {
  hasStoryPlayerEvent,
  normalizeStoryState,
} from "../apps/client/lib/story";
import { withHmUsers } from "./helpers/hmParty";

const base = () =>
  normalizeStoryState({
    starter: "squirtle",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("squirtle", 10),
  });

describe("HMs come from the party, not from taught moves", () => {
  it("reads compatibility from the ROM table", () => {
    expect(speciesCanUseHm("squirtle", "surf")).toBe(true);
    expect(speciesCanUseHm("pidgey", "fly")).toBe(true);
    expect(speciesCanUseHm("rattata", "fly")).toBe(false);
    expect(speciesCanUseHm("not-a-species", "cut")).toBe(false);
  });

  it("any capable member of the party is enough", () => {
    expect(partyCanUseHm(base(), "fly")).toBe(false);
    expect(partyCanUseHm(withHmUsers(base(), "pidgeotto"), "fly")).toBe(true);
  });
});

describe("Rock Smash", () => {
  const rock = SMASHABLE_ROCKS[0];
  const id = smashableRockId(rock.mapId, rock.x, rock.y);
  const smash = (story: ReturnType<typeof base>) =>
    runDialogueInteraction(story, {
      kind: "script",
      id: "rock-smash",
      context: { obstacleId: id },
    });

  it("places rocks on the mainland maps", () => {
    expect(SMASHABLE_ROCKS.length).toBeGreaterThan(10);
    expect(
      resolveScriptedWorldObjects(rock.mapId).some((o) => o.id === id),
    ).toBe(true);
  });

  it("needs only a Pokémon able to use it (no HM, no badge)", () => {
    expect(canStoryUseRockSmash(base())).toBe(true); // Squirtle can

    const broken = smash(base());
    expect(hasStoryPlayerEvent(broken.story, "obstacle", id)).toBe(true);
    const noSmasher = normalizeStoryState({
      ...base(),
      playerPokemon: {
        ...createPokemonProgression("bulbasaur", 5),
        species: "pidgey",
      },
    } as never);
    expect(canStoryUseRockSmash(noSmasher)).toBe(false);
    expect(
      hasStoryPlayerEvent(smash(noSmasher).story, "obstacle", id),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { createPokemonProgression } from "../packages/battle-engine/src";
import {
  resolveWorldObjectDialogueId,
  runDialogueInteraction,
} from "../apps/client/lib/dialogueSystem";
import {
  MOVE_TUTORS,
  canLearnTutorMove,
  chosenMegaTutor,
  teachTutorMove,
  tutorCandidates,
} from "../apps/client/lib/tutors";
import {
  normalizeStoryState,
  type StoryState,
} from "../apps/client/lib/story";

function player(): StoryState {
  const rattata = {
    ...createPokemonProgression("rattata", 10),
    species: "rattata" as const,
  };
  const mankey = {
    ...createPokemonProgression("mankey", 12),
    species: "mankey" as const,
  };
  return normalizeStoryState({
    starter: "bulbasaur",
    firstBattleComplete: true,
    playerPokemon: createPokemonProgression("bulbasaur", 20),
    capturedPokemon: [rattata, mankey],
  } as never);
}

describe("Route 4 move tutors", () => {
  it("stand on Route 4 and speak through scripts", () => {
    for (const tutor of MOVE_TUTORS) {
      expect(resolveWorldObjectDialogueId(tutor.mapId, tutor.x, tutor.y)).toBe(
        `tutor-${tutor.id}`,
      );
    }
  });

  it("only offers compatible party members that do not know the move", () => {
    const story = player();
    expect(canLearnTutorMove(story.playerPokemon!)).toBe(false); // Bulbasaur
    const candidates = tutorCandidates(story, MOVE_TUTORS[0]);
    expect(candidates.map((entry) => entry.pokemon.species)).toEqual([
      "rattata",
      "mankey",
    ]);
  });

  it("teaches into a free slot and locks out the other tutor", () => {
    const story = player();
    const mankey = story.capturedPokemon[1];
    expect(mankey.activeMoves.length).toBeLessThan(4);

    const taught = teachTutorMove(story, "mega-punch", 2, null);
    expect(taught.ok).toBe(true);
    if (!taught.ok) return;
    expect(taught.story.capturedPokemon[1].activeMoves).toContain("mega-punch");
    expect(chosenMegaTutor(taught.story)).toBe("mega-punch");

    expect(teachTutorMove(taught.story, "mega-kick", 1, null)).toEqual({
      ok: false,
      reason: "other-tutor",
    });
    expect(teachTutorMove(taught.story, "mega-punch", 2, null)).toEqual({
      ok: false,
      reason: "knows",
    });
  });

  it("asks which move to forget when four are known", () => {
    const base = player();
    const full = {
      ...base,
      capturedPokemon: base.capturedPokemon.map((pokemon, index) =>
        index === 0
          ? {
              ...pokemon,
              activeMoves: ["tackle", "tail-whip", "quick-attack", "hyper-fang"],
              movePp: {},
            }
          : pokemon,
      ),
    } as StoryState;

    expect(teachTutorMove(full, "mega-kick", 1, null)).toEqual({
      ok: false,
      reason: "no-slot",
    });
    const replaced = teachTutorMove(full, "mega-kick", 1, 3);
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;
    expect(replaced.story.capturedPokemon[0].activeMoves).toEqual([
      "tackle",
      "tail-whip",
      "quick-attack",
      "mega-kick",
    ]);

    const prompt = runDialogueInteraction(full, {
      kind: "script",
      id: "tutor-teach",
      context: { tutorId: "mega-kick", partyIndex: 1 },
    });
    expect(prompt.presentation.pages[0].choices).toHaveLength(5);
  });

  it("walks the NPC dialogue from offer to learning", () => {
    const offer = runDialogueInteraction(player(), {
      kind: "script",
      id: "tutor-mega-punch",
    });
    const first = offer.presentation.pages[0].choices![0];
    const done = runDialogueInteraction(player(), first.request);
    expect(done.story.capturedPokemon[0].activeMoves).toContain("mega-punch");

    const after = runDialogueInteraction(done.story, {
      kind: "script",
      id: "tutor-mega-kick",
    });
    expect(after.presentation.pages[0].text).toContain("voltará");
  });
});

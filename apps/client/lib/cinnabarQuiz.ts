import { CINNABAR_QUIZ } from "./generated/worldObstacles";
import { OVERWORLD_TRAINERS } from "./trainers";

/**
 * Cinnabar Gym quiz machines (FireRed): six yes/no questions, each machine opens one door. A wrong
 * answer sends the trainer behind the door to fight you (he walks up to you); the door opens when
 * you answer right or beat him.
 */

export const CINNABAR_QUIZ_QUESTIONS: Readonly<
  Record<number, { question: string; answer: boolean }>
> = {
  1: { question: "CATERPIE evolui para METAPOD?", answer: true },
  2: { question: "Existem nove Insígnias da POKéMON LEAGUE?", answer: false },
  3: { question: "POLIWAG evolui três vezes?", answer: false },
  4: {
    question: "Golpes elétricos são eficazes contra Pokémon do tipo GROUND?",
    answer: false,
  },
  5: {
    question: "Pokémon da mesma espécie e nível não são idênticos?",
    answer: true,
  },
  6: { question: "A TM28 contém TOMBSTONY?", answer: false },
};

/** Choice that carries "<quiz>:<attempt>" when a wrong answer must start the trainer's fight. */
export const CINNABAR_FIGHT_CHOICE = "cinnabar-fight";

/** ROM tile of the trainer each machine sends after you (read from the machines' scripts). */
const QUIZ_TRAINER_TILE: Readonly<Record<number, readonly [number, number]>> = {
  1: [25, 11],
  2: [17, 5],
  3: [16, 11],
  4: [16, 18],
  5: [4, 19],
  6: [4, 11],
};

export function cinnabarQuizTrainerId(quizId: number): string | null {
  const tile = QUIZ_TRAINER_TILE[quizId];
  if (!tile) return null;
  return (
    OVERWORLD_TRAINERS.find(
      (trainer) =>
        trainer.mapId === "cinnabar-island-gym" &&
        trainer.preferredPosition.x === tile[0] &&
        trainer.preferredPosition.y === tile[1],
    )?.id ?? null
  );
}

export function cinnabarDoorEventId(quizId: number): string {
  return `cinnabar-door:${quizId}`;
}

export function findCinnabarQuiz(
  quizId: number,
): (typeof CINNABAR_QUIZ)[number] | null {
  return CINNABAR_QUIZ.find((quiz) => quiz.id === quizId) ?? null;
}

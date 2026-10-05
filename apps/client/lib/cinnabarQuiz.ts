import { CINNABAR_QUIZ } from "./generated/worldObstacles";

/**
 * Cinnabar Gym quiz machines (FireRed): six yes/no questions, each machine opens
 * one door. In the original a wrong answer forces the trainer behind the door to
 * fight; here a wrong answer simply keeps the door shut and the machine can be tried again.
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

export function cinnabarDoorEventId(quizId: number): string {
  return `cinnabar-door:${quizId}`;
}

export function findCinnabarQuiz(
  quizId: number,
): (typeof CINNABAR_QUIZ)[number] | null {
  return CINNABAR_QUIZ.find((quiz) => quiz.id === quizId) ?? null;
}

import type {
  DialogueDefinition,
  DialogueInteractionResult,
  DialoguePresentation,
  DialogueScriptContext,
} from "./dialogueSystem";
import {
  COIN_PACK_PRICE,
  COIN_PACK_SIZE,
  COIN_PRIZES,
  MAX_SLOT_BET,
  SLOT_SYMBOL_LABEL,
  buyCoins,
  buyPrize,
  playSlots,
} from "./gameCorner";
import {
  IN_GAME_TRADES,
  findInGameTrade,
  hasCompletedTrade,
  performTrade,
  tradeCandidates,
  type InGameTrade,
} from "./inGameTrades";
import {
  dayCareStatus,
  depositAtDayCare,
  withdrawFromDayCare,
} from "./dayCare";
import {
  FIELD_TECHNIQUE_BADGE,
  FIELD_TECHNIQUE_BADGE_LABEL,
  canStoryUseStrength,
} from "./fieldTechniques";
import { KEY_ITEM_LABELS } from "./keyItems";
import {
  DUEL_MOVES,
  speciesDisplayName,
  type WildSpeciesId,
} from "@tactimon/battle-engine";
import { getStoryParty } from "./gameMenu";
import {
  MOVE_TUTORS,
  chosenMegaTutor,
  findMoveTutor,
  teachTutorMove,
  tutorCandidates,
  type MoveTutor,
} from "./tutors";
import { getPokedex } from "./pokedex";
import {
  FUJI_RESCUED_EVENT,
  SAFFRON_GUARDS_OPEN_EVENT,
  silphDoorEventId,
} from "./questEvents";
import {
  SAFARI_BALLS,
  SAFARI_FEE,
  SAFARI_STEPS,
  startSafari,
} from "./safari";
import { getStaticEncounter } from "./staticEncounters";
import {
  completeStoryPlayerEvent,
  grantStoryFieldTechniqueOnce,
  grantStoryKeyItemOnce,
  hasStoryFieldTechnique,
  hasStoryKeyItem,
  hasStoryPlayerEvent,
  removeStoryKeyItem,
  type StoryFieldTechniqueId,
  type StoryKeyItemId,
  type StoryState,
} from "./story";

/**
 * Dialogue scripts for the remaining Kanto field mechanics (HM gifts, rods,
 * key items, Saffron guards, Snorlax and the legendary birds). Merged into
 * `DIALOGUE_DEFINITIONS` by dialogueSystem.ts.
 *
 * This module only imports dialogue *types* so it cannot create a runtime
 * import cycle with dialogueSystem.
 */

function say(
  id: string,
  text: string,
  speaker?: string,
): DialoguePresentation {
  return { id, pages: [{ id: "main", text, speaker }] };
}

function reply(
  story: StoryState,
  id: string,
  text: string,
  speaker?: string,
): DialogueInteractionResult {
  return { story, presentation: say(id, text, speaker) };
}

function slotPrompt(
  story: StoryState,
  text: string,
): DialoguePresentation {
  const coins = story.coins ?? 0;
  const bets = [MAX_SLOT_BET, 1].filter(
    (bet, index, all) => bet <= coins && all.indexOf(bet) === index,
  );
  return {
    id: "slot-machine",
    pages: [
      {
        id: "slots",
        text: `${text} (Moedas: ${coins})`,
        choices: [
          ...bets.map((bet) => ({
            id: `bet-${bet}`,
            label: `Apostar ${bet}`,
            request: {
              kind: "script" as const,
              id: "slot-spin",
              context: { bet },
            },
          })),
          {
            id: "leave",
            label: "Sair",
            request: {
              kind: "text" as const,
              id: "slot-leave",
              text: "Você se afastou da máquina.",
            },
          },
        ],
      },
    ],
  };
}

function contextString(
  context: DialogueScriptContext,
  key: string,
): string | null {
  const value = context[key];
  return typeof value === "string" && value.length > 0
    ? value
    : null;
}


type TechniqueGift = {
  id: string;
  technique: StoryFieldTechniqueId;
  hm: string;
  speaker: string;
  intro: string;
  after: string;
  /** Returns a refusal text when the player is not eligible yet. */
  refuse?: (story: StoryState) => string | null;
};

function techniqueGiftScript(
  gift: TechniqueGift,
): DialogueDefinition {
  return {
    id: gift.id,
    interact: (story) => {
      if (hasStoryFieldTechnique(story, gift.technique)) {
        return reply(story, gift.id, gift.after, gift.speaker);
      }
      const refusal = gift.refuse?.(story);
      if (refusal) {
        return reply(story, gift.id, refusal, gift.speaker);
      }
      const result = grantStoryFieldTechniqueOnce(
        story,
        gift.technique,
      );
      const badge =
        FIELD_TECHNIQUE_BADGE_LABEL[
          FIELD_TECHNIQUE_BADGE[gift.technique]
        ];
      return reply(
        result.story,
        gift.id,
        `${gift.intro} Você recebeu a ${gift.hm}! (Para usá-la fora de batalha você precisa da ${badge}.)`,
        gift.speaker,
      );
    },
  };
}

type KeyItemGift = {
  id: string;
  itemId: StoryKeyItemId;
  speaker: string;
  intro: string;
  after: string;
  refuse?: (story: StoryState) => string | null;
};

function keyItemGiftScript(gift: KeyItemGift): DialogueDefinition {
  return {
    id: gift.id,
    interact: (story) => {
      if (hasStoryKeyItem(story, gift.itemId)) {
        return reply(story, gift.id, gift.after, gift.speaker);
      }
      const refusal = gift.refuse?.(story);
      if (refusal) {
        return reply(story, gift.id, refusal, gift.speaker);
      }
      const result = grantStoryKeyItemOnce(story, gift.itemId);
      return reply(
        result.story,
        gift.id,
        `${gift.intro} Você recebeu ${KEY_ITEM_LABELS[gift.itemId]}!`,
        gift.speaker,
      );
    },
  };
}

function tradeScript(trade: InGameTrade): DialogueDefinition {
  const id = `trade-${trade.id}`;
  const want = speciesDisplayName(trade.want as WildSpeciesId);
  const give = speciesDisplayName(trade.give);
  return {
    id,
    interact: (story) => {
      if (hasCompletedTrade(story, trade.id)) {
        return reply(
          story,
          id,
          `${trade.speaker}: Cuide bem do seu ${give}! Foi uma ótima troca.`,
          trade.speaker,
        );
      }
      const candidates = tradeCandidates(story, trade);
      if (candidates.length === 0) {
        return reply(
          story,
          id,
          `${trade.speaker}: Estou procurando um ${want}. Se você tiver um na equipe, troco pelo meu ${give}!`,
          trade.speaker,
        );
      }
      return {
        story,
        presentation: {
          id,
          pages: [
            {
              id: "offer",
              speaker: trade.speaker,
              text: `Quer trocar um ${want} pelo meu ${give}?`,
              choices: [
                ...candidates.map(({ captureIndex, pokemon }) => ({
                  id: `trade-${captureIndex}`,
                  label: `${want} Lv. ${pokemon.level}`,
                  request: {
                    kind: "script" as const,
                    id: "trade-do",
                    context: { tradeId: trade.id, captureIndex },
                  },
                })),
                {
                  id: "decline",
                  label: "Não, obrigado",
                  request: {
                    kind: "text" as const,
                    id: `${id}-decline`,
                    speaker: trade.speaker,
                    text: "Ah, que pena. Volte se mudar de ideia!",
                  },
                },
              ],
            },
          ],
        },
      };
    },
  };
}

function tutorScript(tutor: MoveTutor): DialogueDefinition {
  const id = `tutor-${tutor.id}`;
  const speaker = "Faixa-preta";
  return {
    id,
    interact: (story) => {
      const used = chosenMegaTutor(story);
      if (used === tutor.id) {
        return reply(
          story,
          id,
          `${speaker}: Agora somos companheiros no caminho do ${tutor.moveName}!`,
          speaker,
        );
      }
      if (used) {
        return reply(
          story,
          id,
          `${speaker}: Você voltará quando entender o valor do ${tutor.moveName}.`,
          speaker,
        );
      }
      const candidates = tutorCandidates(story, tutor);
      if (candidates.length === 0) {
        return reply(
          story,
          id,
          `${speaker}: O ${tutor.moveName} é o ataque definitivo! Mas nenhum Pokémon seu pode aprendê-lo agora.`,
          speaker,
        );
      }
      return {
        story,
        presentation: {
          id,
          pages: [
            {
              id: "offer",
              speaker,
              text: `${tutor.moveName} é o ataque definitivo! Eu ensino de graça, mas só um golpe por treinador. Qual Pokémon vai aprender?`,
              choices: [
                ...candidates.map(({ partyIndex, pokemon }) => ({
                  id: `teach-${partyIndex}`,
                  label: `${speciesDisplayName(pokemon.species as WildSpeciesId)} Lv. ${pokemon.level}`,
                  request: {
                    kind: "script" as const,
                    id: "tutor-teach",
                    context: { tutorId: tutor.id, partyIndex },
                  },
                })),
                {
                  id: "decline",
                  label: "Agora não",
                  request: {
                    kind: "text" as const,
                    id: `${id}-decline`,
                    speaker,
                    text: "Volte quando estiver pronto!",
                  },
                },
              ],
            },
          ],
        },
      };
    },
  };
}

export const QUEST_DIALOGUES: Record<string, DialogueDefinition> = {
  ...Object.fromEntries(
    MOVE_TUTORS.map((tutor) => [`tutor-${tutor.id}`, tutorScript(tutor)]),
  ),
  "tutor-teach": {
    id: "tutor-teach",
    interact: (story, context) => {
      const tutor = findMoveTutor(contextString(context, "tutorId") ?? "");
      const partyIndex =
        typeof context.partyIndex === "number" ? context.partyIndex : -1;
      const replaceIndex =
        typeof context.replaceIndex === "number"
          ? context.replaceIndex
          : null;
      if (!tutor) return reply(story, "tutor-teach", "...");

      const result = teachTutorMove(
        story,
        tutor.id,
        partyIndex,
        replaceIndex,
      );
      if (result.ok) {
        return reply(
          result.story,
          "tutor-teach",
          `Faixa-preta: ${result.name} aprendeu ${tutor.moveName}!`,
          "Faixa-preta",
        );
      }

      if (result.reason === "no-slot") {
        const pokemon = getStoryParty(story)[partyIndex];
        return {
          story,
          presentation: {
            id: "tutor-teach",
            pages: [
              {
                id: "forget",
                speaker: "Faixa-preta",
                text: `${speciesDisplayName(pokemon.species as WildSpeciesId)} já conhece 4 golpes. Qual esquecer para aprender ${tutor.moveName}?`,
                choices: [
                  ...pokemon.activeMoves.map((moveId, index) => ({
                    id: `forget-${index}`,
                    label: DUEL_MOVES[moveId]?.name ?? moveId,
                    request: {
                      kind: "script" as const,
                      id: "tutor-teach",
                      context: {
                        tutorId: tutor.id,
                        partyIndex,
                        replaceIndex: index,
                      },
                    },
                  })),
                  {
                    id: "cancel",
                    label: "Cancelar",
                    request: {
                      kind: "text" as const,
                      id: "tutor-cancel",
                      speaker: "Faixa-preta",
                      text: "Sem problemas. Volte quando decidir.",
                    },
                  },
                ],
              },
            ],
          },
        };
      }

      const text: Record<string, string> = {
        "other-tutor": "Você já aprendeu outro golpe comigo.",
        knows: "Ele já conhece esse golpe.",
        incompatible: "Esse Pokémon não consegue aprender este golpe.",
        "invalid-pokemon": "Não encontrei esse Pokémon.",
        unknown: "...",
      };
      return reply(story, "tutor-teach", text[result.reason], "Faixa-preta");
    },
  },
  ...Object.fromEntries(
    IN_GAME_TRADES.map((trade) => [`trade-${trade.id}`, tradeScript(trade)]),
  ),
  "trade-do": {
    id: "trade-do",
    interact: (story, context) => {
      const tradeId = contextString(context, "tradeId") ?? "";
      const trade = findInGameTrade(tradeId);
      const index = context.captureIndex;
      const result =
        typeof index === "number"
          ? performTrade(story, tradeId, index)
          : null;
      if (!trade || !result?.ok) {
        return reply(
          story,
          "trade-do",
          "Hmm, algo deu errado. A troca não foi feita.",
          trade?.speaker,
        );
      }
      return reply(
        result.story,
        "trade-do",
        `${trade.speaker}: Troca feita! Seu ${result.gave} virou ${result.received} (Lv. ${result.level}). Cuide bem dele!`,
        trade.speaker,
      );
    },
  },
  "route16-fly-woman": techniqueGiftScript({
    id: "route16-fly-woman",
    technique: "fly",
    hm: "HM02 Fly",
    speaker: "Mulher",
    intro:
      "Mulher: Oi! Estou treinando meu Fearow aqui. Você parece alguém que viaja muito. Fique com isto!",
    after:
      "Mulher: Fly leva você a qualquer cidade que já visitou. Abra o Town Map!",
  }),
  "route2-flash-aide": techniqueGiftScript({
    id: "route2-flash-aide",
    technique: "flash",
    hm: "HM05 Flash",
    speaker: "Assistente",
    intro:
      "Assistente: Você já capturou 10 espécies! O Prof. Oak ficará feliz. Aceite este presente do laboratório.",
    after:
      "Assistente: Flash ilumina cavernas escuras, como o Rock Tunnel.",
    refuse: (story) =>
      getPokedex(story).caughtCount >= 10
        ? null
        : "Assistente: Sou assistente do Prof. Oak. Capture pelo menos 10 espécies de Pokémon e eu darei algo útil para cavernas escuras.",
  }),
  "fuchsia-warden": {
    id: "fuchsia-warden",
    interact: (story) => {
      if (hasStoryFieldTechnique(story, "strength")) {
        return reply(
          story,
          "fuchsia-warden",
          "Warden: Strength permite empurrar rochedos grandes. Encoste neles para movê-los!",
          "Warden",
        );
      }
      if (!hasStoryKeyItem(story, "gold-teeth")) {
        return reply(
          story,
          "fuchsia-warden",
          "Warden: Hahfuh? Meus dentes de ouro caíram em algum lugar da Safari Zone! Sem eles não consigo falar direito. Se achar, traga para mim!",
          "Warden",
        );
      }
      const result = grantStoryFieldTechniqueOnce(
        removeStoryKeyItem(story, "gold-teeth"),
        "strength",
      );
      return reply(
        result.story,
        "fuchsia-warden",
        "Warden: Meus dentes de ouro! Muito obrigado! Aceite a HM04 Strength! (Você precisa da Rainbow Badge para usá-la.)",
        "Warden",
      );
    },
  },
  "vermilion-old-rod-guru": keyItemGiftScript({
    id: "vermilion-old-rod-guru",
    itemId: "old-rod",
    speaker: "Pescador",
    intro:
      "Pescador: Eu amo pescar! Você também? Ótimo! Fique com esta vara.",
    after:
      "Pescador: Com a Old Rod, fique de frente para a água e aperte F. Boa pescaria!",
  }),
  "fuchsia-good-rod-guru": keyItemGiftScript({
    id: "fuchsia-good-rod-guru",
    itemId: "good-rod",
    speaker: "Pescador",
    intro:
      "Pescador: Sou irmão do Guru da Pesca! Pescar é uma paixão de família. Aceite esta vara melhor!",
    after:
      "Pescador: A Good Rod fisga Pokémon melhores que a Old Rod. Aperte F de frente para a água.",
  }),
  "route12-super-rod-guru": keyItemGiftScript({
    id: "route12-super-rod-guru",
    itemId: "super-rod",
    speaker: "Pescador",
    intro:
      "Pescador: Meu irmão mais velho pesca em Fuchsia. Eu pesco aqui! Para você, a melhor vara!",
    after:
      "Pescador: A Super Rod atrai os Pokémon mais raros da água.",
  }),
  "celadon-coin-case-man": keyItemGiftScript({
    id: "celadon-coin-case-man",
    itemId: "coin-case",
    speaker: "Homem",
    intro:
      "Homem: Meu Pokémon e eu perdemos tudo no Game Corner... Fique com o meu estojo de moedas.",
    after:
      "Homem: Jogue com cuidado no Game Corner. As moedas vão embora rápido!",
  }),
  "celadon-tea-woman": keyItemGiftScript({
    id: "celadon-tea-woman",
    itemId: "tea",
    speaker: "Senhora",
    intro:
      "Senhora: Ah, você deve estar com sede! Os guardas de Saffron também estão. Leve este chá gelado a eles.",
    after:
      "Senhora: O chá deixa os guardas de Saffron de bom humor.",
  }),
  "lavender-fuji-house": {
    id: "lavender-fuji-house",
    interact: (story) => {
      if (hasStoryKeyItem(story, "poke-flute")) {
        return reply(
          story,
          "lavender-fuji-house",
          "Mr. Fuji: A Poké Flute acorda Pokémon adormecidos, como o Snorlax que bloqueia a estrada.",
          "Mr. Fuji",
        );
      }
      const result = grantStoryKeyItemOnce(story, "poke-flute");
      return reply(
        result.story,
        "lavender-fuji-house",
        "Mr. Fuji: Obrigado por me salvar da Equipe Rocket! Tome a Poké Flute como agradecimento. Você recebeu a Poké Flute!",
        "Mr. Fuji",
      );
    },
  },
  "tower-fuji-rescue": {
    id: "tower-fuji-rescue",
    interact: (story) => {
      if (hasStoryPlayerEvent(story, "story", FUJI_RESCUED_EVENT)) {
        return reply(
          story,
          "tower-fuji-rescue",
          "Mr. Fuji: Vá até a minha casa em Lavender Town.",
          "Mr. Fuji",
        );
      }
      return reply(
        completeStoryPlayerEvent(story, "story", FUJI_RESCUED_EVENT),
        "tower-fuji-rescue",
        "Mr. Fuji: Você me salvou! Os Rocket tomaram a Torre à força. Vou voltar para casa em Lavender Town. Venha me visitar!",
        "Mr. Fuji",
      );
    },
  },
  "saffron-guard": {
    id: "saffron-guard",
    interact: (story) => {
      if (
        hasStoryPlayerEvent(story, "story", SAFFRON_GUARDS_OPEN_EVENT)
      ) {
        return reply(
          story,
          "saffron-guard",
          "Guarda: Obrigado pelo chá! Pode passar. Saffron está livre!",
          "Guarda",
        );
      }
      if (!hasStoryKeyItem(story, "tea")) {
        return reply(
          story,
          "saffron-guard",
          "Guarda: Estou com muita sede... Saffron está fechada, mas aceito um chá gelado em troca da passagem. Ninguém entra sem isso!",
          "Guarda",
        );
      }
      return reply(
        completeStoryPlayerEvent(
          story,
          "story",
          SAFFRON_GUARDS_OPEN_EVENT,
        ),
        "saffron-guard",
        "Guarda: Ah, chá gelado! Obrigado! Os outros guardas também ficam satisfeitos... pode passar por todos os portões de Saffron!",
        "Guarda",
      );
    },
  },
  "strength-boulder": {
    id: "strength-boulder",
    interact: (story) => {
      if (canStoryUseStrength(story)) {
        return reply(
          story,
          "strength-boulder",
          "Um rochedo enorme. Você pode usar Strength para empurrá-lo: ande de encontro a ele.",
        );
      }
      if (hasStoryFieldTechnique(story, "strength")) {
        return reply(
          story,
          "strength-boulder",
          "Um rochedo enorme. Você precisa da Rainbow Badge para usar Strength.",
        );
      }
      return reply(
        story,
        "strength-boulder",
        "Um rochedo enorme. Talvez um Pokémon forte consiga movê-lo.",
      );
    },
  },
  "static-pokemon": {
    id: "static-pokemon",
    interact: (story, context) => {
      const staticId = contextString(context, "staticId");
      const encounter = staticId ? getStaticEncounter(staticId) : null;
      if (!staticId || !encounter) {
        return reply(story, "static-pokemon", "...");
      }
      if (encounter.species === "snorlax") {
        return reply(
          story,
          `static:${staticId}`,
          hasStoryKeyItem(story, "poke-flute")
            ? "Você tocou a Poké Flute! Snorlax acordou e atacou!"
            : "Um Snorlax enorme dorme profundamente no meio do caminho. Nada parece acordá-lo... talvez um som especial.",
        );
      }
      return reply(
        story,
        `static:${staticId}`,
        `${encounter.label.toUpperCase()}: Gyaaah!`,
      );
    },
  },
  "safari-entrance": {
    id: "safari-entrance",
    interact: (story) => {
      if (story.safari) {
        return reply(
          story,
          "safari-entrance",
          "Funcionário: Seu jogo da Safari Zone está em andamento. Boa sorte!",
          "Funcionário",
        );
      }
      return {
        story,
        presentation: {
          id: "safari-entrance",
          pages: [
            {
              id: "offer",
              speaker: "Funcionário",
              text: `Bem-vindo à Safari Zone! Por ₽${SAFARI_FEE} você recebe ${SAFARI_BALLS} Safari Balls e pode andar até ${SAFARI_STEPS} passos. Quer participar?`,
              choices: [
                {
                  id: "pay",
                  label: `Pagar ₽${SAFARI_FEE}`,
                  request: { kind: "script", id: "safari-start" },
                },
                {
                  id: "decline",
                  label: "Agora não",
                  request: {
                    kind: "text",
                    id: "safari-decline",
                    speaker: "Funcionário",
                    text: "Volte quando quiser participar! Por favor, passe pela porta somente depois de pagar.",
                  },
                },
              ],
            },
          ],
        },
      };
    },
  },
  "safari-start": {
    id: "safari-start",
    interact: (story) => {
      const result = startSafari(story);
      if (result.ok) {
        return reply(
          result.story,
          "safari-start",
          `Funcionário: Aqui estão suas ${SAFARI_BALLS} Safari Balls! Avisaremos quando seus passos ou suas bolas acabarem. Entre pela porta!`,
          "Funcionário",
        );
      }
      return reply(
        story,
        "safari-start",
        result.reason === "money"
          ? `Funcionário: Você precisa de ₽${SAFARI_FEE} para entrar.`
          : "Funcionário: Seu jogo já está em andamento!",
        "Funcionário",
      );
    },
  },
  "daycare-gentleman": {
    id: "daycare-gentleman",
    interact: (story) => {
      const status = dayCareStatus(story);
      if (status) {
        return {
          story,
          presentation: {
            id: "daycare-gentleman",
            pages: [
              {
                id: "status",
                speaker: "Cuidador",
                text:
                  status.levelsGained > 0
                    ? `Seu ${status.name} cresceu ${status.levelsGained} nível(is) e está no Lv. ${status.level}! Para retirá-lo são ₽${status.fee}.`
                    : `Seu ${status.name} está ótimo, no Lv. ${status.level}. Ele ganha experiência a cada passo que você dá. Retirá-lo custa ₽${status.fee}.`,
                choices: [
                  {
                    id: "withdraw",
                    label: `Retirar (₽${status.fee})`,
                    request: { kind: "script", id: "daycare-withdraw" },
                  },
                  {
                    id: "stay",
                    label: "Deixar mais um pouco",
                    request: {
                      kind: "text",
                      id: "daycare-stay",
                      speaker: "Cuidador",
                      text: "Certo! Cuidaremos bem dele. Volte quando quiser.",
                    },
                  },
                ],
              },
            ],
          },
        };
      }
      if (story.capturedPokemon.length === 0) {
        return reply(
          story,
          "daycare-gentleman",
          "Cuidador: Eu cuido de Pokémon e os treino enquanto você viaja! Venha com um Pokémon da sua equipe (que não seja o primeiro) e eu o deixo mais forte.",
          "Cuidador",
        );
      }
      return {
        story,
        presentation: {
          id: "daycare-gentleman",
          pages: [
            {
              id: "offer",
              speaker: "Cuidador",
              text: "Eu cuido de Pokémon! Ele ganha experiência a cada passo que você dá. Quer deixar algum?",
              choices: [
                ...story.capturedPokemon.map((pokemon, index) => ({
                  id: `deposit-${index}`,
                  label: `${speciesDisplayName(pokemon.species)} Lv. ${pokemon.level}`,
                  request: {
                    kind: "script" as const,
                    id: "daycare-deposit",
                    context: { captureIndex: index },
                  },
                })),
                {
                  id: "decline",
                  label: "Agora não",
                  request: {
                    kind: "text" as const,
                    id: "daycare-decline",
                    speaker: "Cuidador",
                    text: "Tudo bem. Volte quando precisar!",
                  },
                },
              ],
            },
          ],
        },
      };
    },
  },
  "daycare-deposit": {
    id: "daycare-deposit",
    interact: (story, context) => {
      const index = context.captureIndex;
      const result =
        typeof index === "number"
          ? depositAtDayCare(story, index)
          : null;
      if (!result?.ok) {
        return reply(
          story,
          "daycare-deposit",
          result?.reason === "last-healthy"
            ? "Cuidador: Se eu ficar com ele, você ficará sem Pokémon em condições de lutar!"
            : "Cuidador: Não consigo ficar com ele agora.",
          "Cuidador",
        );
      }
      return reply(
        result.story,
        "daycare-deposit",
        `Cuidador: Muito bem, vou cuidar do seu ${result.name}. Ele ganha 1 ponto de experiência a cada passo seu!`,
        "Cuidador",
      );
    },
  },
  "daycare-withdraw": {
    id: "daycare-withdraw",
    interact: (story) => {
      const result = withdrawFromDayCare(story);
      if (!result.ok) {
        return reply(
          story,
          "daycare-withdraw",
          result.reason === "money"
            ? `Cuidador: Você não tem dinheiro suficiente! Custa ₽${result.fee}.`
            : result.reason === "storage-full"
              ? "Cuidador: Seu PC está cheio! Libere espaço primeiro."
              : "Cuidador: Não há nenhum Pokémon seu aqui.",
          "Cuidador",
        );
      }
      return reply(
        result.story,
        "daycare-withdraw",
        `Cuidador: Aqui está o seu ${result.name} (Lv. ${result.level}). Foram ₽${result.fee}. Ele sente sua falta!`,
        "Cuidador",
      );
    },
  },
  "game-corner-clerk": {
    id: "game-corner-clerk",
    interact: (story) => {
      if (!hasStoryKeyItem(story, "coin-case")) {
        return reply(
          story,
          "game-corner-clerk",
          "Atendente: Bem-vindo ao Game Corner! Você precisa de um Coin Case para guardar suas moedas.",
          "Atendente",
        );
      }
      return {
        story,
        presentation: {
          id: "game-corner-clerk",
          pages: [
            {
              id: "offer",
              speaker: "Atendente",
              text: `Bem-vindo ao Game Corner! Você tem ${story.coins ?? 0} moedas. Quer comprar ${COIN_PACK_SIZE} moedas por ₽${COIN_PACK_PRICE}?`,
              choices: [
                {
                  id: "buy",
                  label: `Comprar (₽${COIN_PACK_PRICE})`,
                  request: { kind: "script", id: "game-corner-buy-coins" },
                },
                {
                  id: "no",
                  label: "Não, obrigado",
                  request: {
                    kind: "text",
                    id: "game-corner-no",
                    speaker: "Atendente",
                    text: "Divirta-se nas máquinas!",
                  },
                },
              ],
            },
          ],
        },
      };
    },
  },
  "game-corner-buy-coins": {
    id: "game-corner-buy-coins",
    interact: (story) => {
      const result = buyCoins(story);
      if (result.ok) {
        return reply(
          result.story,
          "game-corner-buy-coins",
          `Atendente: Obrigado! Aqui estão ${COIN_PACK_SIZE} moedas. Você agora tem ${result.story.coins}.`,
          "Atendente",
        );
      }
      return reply(
        story,
        "game-corner-buy-coins",
        result.reason === "money"
          ? "Atendente: Você não tem dinheiro suficiente."
          : result.reason === "coins-full"
            ? "Atendente: Seu Coin Case está cheio!"
            : "Atendente: Você precisa de um Coin Case.",
        "Atendente",
      );
    },
  },
  "slot-machine": {
    id: "slot-machine",
    interact: (story) => {
      if (!hasStoryKeyItem(story, "coin-case")) {
        return reply(
          story,
          "slot-machine",
          "Uma máquina caça-níquel. Você precisa de um Coin Case para jogar.",
        );
      }
      if ((story.coins ?? 0) <= 0) {
        return reply(
          story,
          "slot-machine",
          "Uma máquina caça-níquel. Você está sem moedas! Compre mais no balcão.",
        );
      }
      return {
        story,
        presentation: slotPrompt(
          story,
          "Uma máquina caça-níquel. Quanto quer apostar?",
        ),
      };
    },
  },
  "slot-spin": {
    id: "slot-spin",
    interact: (story, context) => {
      const bet =
        typeof context.bet === "number" ? context.bet : MAX_SLOT_BET;
      const rolls = [0, 0, 0].map(() =>
        Math.floor(Math.random() * 6_000_000),
      ) as [number, number, number];
      const result = playSlots(story, rolls, bet);
      if (!result.ok) {
        return reply(
          story,
          "slot-spin",
          result.reason === "no-coins"
            ? "Você ficou sem moedas!"
            : "Você precisa de um Coin Case.",
        );
      }

      const reels = result.spin.reels
        .map((symbol) => `[${SLOT_SYMBOL_LABEL[symbol]}]`)
        .join(" ");
      const outcome =
        result.spin.payout > 0
          ? `Você ganhou ${result.spin.payout} moedas!`
          : "Nada desta vez...";
      if ((result.story.coins ?? 0) <= 0) {
        return reply(
          result.story,
          "slot-spin",
          `${reels} ${outcome} Suas moedas acabaram!`,
        );
      }
      return {
        story: result.story,
        presentation: slotPrompt(result.story, `${reels} ${outcome}`),
      };
    },
  },
  "game-corner-prizes": {
    id: "game-corner-prizes",
    interact: (story) => {
      if (!hasStoryKeyItem(story, "coin-case")) {
        return reply(
          story,
          "game-corner-prizes",
          "Atendente: Aqui você troca moedas por prêmios. Traga o seu Coin Case!",
          "Atendente",
        );
      }
      return {
        story,
        presentation: {
          id: "game-corner-prizes",
          pages: [
            {
              id: "menu",
              speaker: "Atendente",
              text: `Você tem ${story.coins ?? 0} moedas. Qual Pokémon quer levar?`,
              choices: [
                ...COIN_PRIZES.map((prize) => ({
                  id: prize.id,
                  label: `${speciesDisplayName(prize.species)} Lv. ${prize.level} — ${prize.cost}`,
                  request: {
                    kind: "script" as const,
                    id: "game-corner-prize-buy",
                    context: { prizeId: prize.id },
                  },
                })),
                {
                  id: "leave",
                  label: "Sair",
                  request: {
                    kind: "text" as const,
                    id: "game-corner-prizes-leave",
                    speaker: "Atendente",
                    text: "Volte quando tiver mais moedas!",
                  },
                },
              ],
            },
          ],
        },
      };
    },
  },
  "game-corner-prize-buy": {
    id: "game-corner-prize-buy",
    interact: (story, context) => {
      const result = buyPrize(
        story,
        contextString(context, "prizeId") ?? "",
      );
      if (result.ok) {
        return reply(
          result.story,
          "game-corner-prize-buy",
          `Atendente: Aqui está! Você recebeu ${speciesDisplayName(result.prize.species)}!${result.destination === "storage" ? " Ele foi enviado ao PC." : ""}`,
          "Atendente",
        );
      }
      const text: Record<string, string> = {
        coins: "Atendente: Você não tem moedas suficientes.",
        "no-case": "Atendente: Você precisa de um Coin Case.",
        "already-received":
          "Atendente: Você já levou este prêmio. Cada Pokémon só pode ser trocado uma vez.",
        "storage-full": "Atendente: Seu PC está cheio! Libere espaço.",
        unknown: "Atendente: Não conheço esse prêmio.",
      };
      return reply(
        story,
        "game-corner-prize-buy",
        text[result.reason],
        "Atendente",
      );
    },
  },
  "game-corner-tm-counter": {
    id: "game-corner-tm-counter",
    interact: (story) =>
      reply(
        story,
        "game-corner-tm-counter",
        "Atendente: Os prêmios deste balcão (TMs) estão em falta. Só são encontrados em raids e dungeons.",
        "Atendente",
      ),
  },
  "tower-ghost": {
    id: "tower-ghost",
    interact: (story) =>
      reply(
        story,
        "tower-ghost",
        hasStoryKeyItem(story, "silph-scope")
          ? "O Silph Scope revela a forma do vulto: é o fantasma de uma Marowak! Ele ataca!"
          : "Um vulto bloqueia a escada. Está escuro demais e você não consegue ver o que é! Seria preciso algum tipo de lente especial...",
      ),
  },
  "silph-card-door": {
    id: "silph-card-door",
    interact: (story, context) => {
      const doorId = contextString(context, "doorId");
      if (!doorId) return reply(story, "silph-card-door", "...");
      if (!hasStoryKeyItem(story, "card-key")) {
        return reply(
          story,
          "silph-card-door",
          "A porta está trancada. É preciso um Card Key para abri-la.",
        );
      }
      return reply(
        completeStoryPlayerEvent(
          story,
          "story",
          silphDoorEventId(doorId),
        ),
        "silph-card-door",
        "Você passou o Card Key no leitor. A porta se abriu!",
      );
    },
  },
  "key-item-ball": {
    id: "key-item-ball",
    interact: (story, context) => {
      const itemId = contextString(
        context,
        "keyItemId",
      ) as StoryKeyItemId | null;
      if (!itemId || !(itemId in KEY_ITEM_LABELS)) {
        return reply(story, "key-item-ball", "...");
      }
      const result = grantStoryKeyItemOnce(story, itemId);
      return reply(
        result.story,
        `key-item:${itemId}`,
        result.granted
          ? `Você encontrou ${KEY_ITEM_LABELS[itemId]}!`
          : "Não há mais nada aqui.",
      );
    },
  },
};

/** ROM object coordinates (map:x,y) → quest dialogue script id. */
export const QUEST_WORLD_OBJECT_DIALOGUE_IDS: Record<string, string> = {
  ...Object.fromEntries(
    MOVE_TUTORS.map((tutor) => [
      `${tutor.mapId}:${tutor.x},${tutor.y}`,
      `tutor-${tutor.id}`,
    ]),
  ),
  ...Object.fromEntries(
    IN_GAME_TRADES.map((trade) => [
      `${trade.mapId}:${trade.x},${trade.y}`,
      `trade-${trade.id}`,
    ]),
  ),
  "route-16-house:4,2": "route16-fly-woman",
  "route-2-east-building:4,6": "route2-flash-aide",
  "fuchsia-city-wardens-house:3,5": "fuchsia-warden",
  "vermilion-house-1:4,5": "vermilion-old-rod-guru",
  "fuchsia-city-house-2:6,5": "fuchsia-good-rod-guru",
  "route-12-fishing-house:4,4": "route12-super-rod-guru",
  "celadon-city-restaurant:1,2": "celadon-coin-case-man",
  "celadon-city-condominiums-1f:2,9": "celadon-tea-woman",
  "fuchsia-city-safari-zone-entrance:7,3": "safari-entrance",
  "celadon-city-game-corner:4,2": "game-corner-clerk",
  "celadon-city-game-corner-prize-room:4,2": "game-corner-prizes",
  "celadon-city-game-corner-prize-room:2,2": "game-corner-tm-counter",
  "celadon-city-game-corner-prize-room:6,2": "game-corner-tm-counter",
  "route-5-day-care:4,4": "daycare-gentleman",
  "route-5-south-entrance:1,5": "saffron-guard",
  "route-6-north-entrance:7,5": "saffron-guard",
  "route-7-east-entrance:6,2": "saffron-guard",
  "route-8-west-entrance:6,2": "saffron-guard",
};

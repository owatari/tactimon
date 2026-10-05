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
  canStoryUseRockSmash,
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
  giftMessage,
  grantGiftPokemon,
  hasReceivedGift,
} from "./giftPokemon";
import {
  CINNABAR_QUIZ_QUESTIONS,
  cinnabarDoorEventId,
} from "./cinnabarQuiz";
import {
  FUJI_RESCUED_EVENT,
  ROCKET_ELEVATOR_FLOORS,
  MANSION_SWITCH_CHOICE,
  SAFFRON_GUARDS_OPEN_EVENT,
  silphDoorEventId,
} from "./questEvents";
import {
  SAFARI_BALLS,
  SAFARI_FEE,
  SAFARI_STEPS,
  startSafari,
} from "./safari";
import { t } from "./i18n";
import { getStaticEncounter } from "./staticEncounters";
import {
  completeStoryPlayerEvent,
  getStoryPlayerChoice,
  grantStoryFieldTechniqueOnce,
  grantStoryKeyItemOnce,
  hasStoryFieldTechnique,
  hasStoryKeyItem,
  hasStoryPlayerEvent,
  removeStoryKeyItem,
  setStoryPlayerChoice,
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
        text: `${t(text)} ${t("(Coins: {coins})", { coins })}`,
        choices: [
          ...bets.map((bet) => ({
            id: `bet-${bet}`,
            label: t("Bet {bet}", { bet }),
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
        t("{intro} You received the {hm}! (To use it outside battle you need the {badge}.)", { intro: t(gift.intro), hm: gift.hm, badge }),
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
        t("{intro} You received {item}!", { intro: t(gift.intro), item: KEY_ITEM_LABELS[gift.itemId] }),
        gift.speaker,
      );
    },
  };
}

function giftBallScript(
  id: string,
  giftId: string,
  species: WildSpeciesId,
  level: number,
  blockedBy: readonly string[] = [],
): DialogueDefinition {
  return {
    id,
    interact: (story) => {
      if (
        hasReceivedGift(story, giftId) ||
        blockedBy.some((other) => hasReceivedGift(story, other))
      ) {
        return reply(story, id, "Não há mais nada aqui.");
      }
      const gift = grantGiftPokemon(story, giftId, species, level);
      return reply(
        gift.story,
        id,
        gift.granted
          ? t("You chose {name}! {gift}", { name: speciesDisplayName(species), gift: giftMessage(species, gift.destination) })
          : "Seu PC está cheio! Libere espaço e volte.",
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
          t("{speaker}: Take good care of your {give}! That was a great trade.", { speaker: t(trade.speaker), give }),
          trade.speaker,
        );
      }
      const candidates = tradeCandidates(story, trade);
      if (candidates.length === 0) {
        return reply(
          story,
          id,
          t("{speaker}: I'm looking for a {want}. If you have one on your team, I'll trade my {give} for it!", { speaker: t(trade.speaker), want, give }),
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
              text: t("Want to trade a {want} for my {give}?", { want, give }),
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
          t("{speaker}: Now we are companions on the path of {move}!", { speaker: t(speaker), move: tutor.moveName }),
          speaker,
        );
      }
      if (used) {
        return reply(
          story,
          id,
          t("{speaker}: You will return when you understand the value of {move}.", { speaker: t(speaker), move: tutor.moveName }),
          speaker,
        );
      }
      const candidates = tutorCandidates(story, tutor);
      if (candidates.length === 0) {
        return reply(
          story,
          id,
          t("{speaker}: {move} is the ultimate attack! But none of your Pokémon can learn it right now.", { speaker: t(speaker), move: tutor.moveName }),
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
              text: t("{move} is the ultimate attack! I teach it for free, but only one move per trainer. Which Pokémon will learn it?", { move: tutor.moveName }),
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
          t("Black Belt: {name} learned {move}!", { name: result.name, move: tutor.moveName }),
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
                text: t("{name} already knows 4 moves. Which one should it forget to learn {move}?", { name: speciesDisplayName(pokemon.species as WildSpeciesId), move: tutor.moveName }),
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
        t("{speaker}: Trade complete! Your {gave} became {received} (Lv. {level}). Take good care of it!", { speaker: t(trade.speaker), gave: result.gave, received: result.received, level: result.level }),
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
  "rock-smash": {
    id: "rock-smash",
    interact: (story, context) => {
      const obstacleId = contextString(context, "obstacleId");
      if (!obstacleId) return reply(story, "rock-smash", "...");
      if (!canStoryUseRockSmash(story)) {
        return reply(
          story,
          "rock-smash",
          t("A cracked rock. A Pokémon that can use Rock Smash could break it."),
        );
      }
      return reply(
        completeStoryPlayerEvent(story, "obstacle", obstacleId),
        "rock-smash",
        t("You used Rock Smash! The rock crumbled."),
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
        encounter.raid
          ? t(
              "{name} is a legendary Pokémon. Raid battles are a future feature: wait for the MMO!",
              { name: encounter.label },
            )
          : `${encounter.label.toUpperCase()}: Gyaaah!`,
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
              text: t("Welcome to the Safari Zone! For ₽{fee} you get {balls} Safari Balls and can walk up to {steps} steps. Want to join?", { fee: SAFARI_FEE, balls: SAFARI_BALLS, steps: SAFARI_STEPS }),
              choices: [
                {
                  id: "pay",
                  label: t("Pay ₽{fee}", { fee: SAFARI_FEE }),
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
          t("Employee: Here are your {balls} Safari Balls! We'll let you know when your steps or your balls run out. Go through the door!", { balls: SAFARI_BALLS }),
          "Funcionário",
        );
      }
      return reply(
        story,
        "safari-start",
        result.reason === "money"
          ? t("Employee: You need ₽{fee} to enter.", { fee: SAFARI_FEE })
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
                    ? t("Your {name} grew {levels} level(s) and is now Lv. {level}! Picking it up costs ₽{fee}.", { name: status.name, levels: status.levelsGained, level: status.level, fee: status.fee })
                    : t("Your {name} is doing great, at Lv. {level}. It gains experience with every step you take. Picking it up costs ₽{fee}.", { name: status.name, level: status.level, fee: status.fee }),
                choices: [
                  {
                    id: "withdraw",
                    label: t("Pick up (₽{fee})", { fee: status.fee }),
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
        t("Caretaker: Very well, I'll look after your {name}. It gains 1 experience point with every step you take!", { name: result.name }),
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
            ? t("Caretaker: You don't have enough money! It costs ₽{fee}.", { fee: result.fee ?? 0 })
            : result.reason === "storage-full"
              ? "Cuidador: Seu PC está cheio! Libere espaço primeiro."
              : "Cuidador: Não há nenhum Pokémon seu aqui.",
          "Cuidador",
        );
      }
      return reply(
        result.story,
        "daycare-withdraw",
        t("Caretaker: Here is your {name} (Lv. {level}). That will be ₽{fee}. It misses you!", { name: result.name, level: result.level, fee: result.fee }),
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
              text: t("Welcome to the Game Corner! You have {coins} coins. Want to buy {pack} coins for ₽{price}?", { coins: story.coins ?? 0, pack: COIN_PACK_SIZE, price: COIN_PACK_PRICE }),
              choices: [
                {
                  id: "buy",
                  label: t("Buy (₽{price})", { price: COIN_PACK_PRICE }),
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
          t("Attendant: Thank you! Here are {pack} coins. You now have {coins}.", { pack: COIN_PACK_SIZE, coins: result.story.coins ?? 0 }),
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
        .map((symbol) => `[${t(SLOT_SYMBOL_LABEL[symbol])}]`)
        .join(" ");
      const outcome =
        result.spin.payout > 0
          ? t("You won {coins} coins!", { coins: result.spin.payout })
          : "Nada desta vez...";
      if ((result.story.coins ?? 0) <= 0) {
        return reply(
          result.story,
          "slot-spin",
          `${reels} ${outcome} ${t("Suas moedas acabaram!")}`,
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
              text: t("You have {coins} coins. Which Pokémon do you want to take?", { coins: story.coins ?? 0 }),
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
          t(result.destination === "storage" ? "Attendant: Here you go! You received {name}! It was sent to the PC." : "Attendant: Here you go! You received {name}!", { name: speciesDisplayName(result.prize.species) }),
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
  "mansion-switch": {
    id: "mansion-switch",
    interact: (story) => {
      return {
        story,
        presentation: {
          id: "mansion-switch",
          pages: [
            {
              id: "ask",
              text: "Uma estátua de Pokémon com um botão escondido. Apertar o interruptor secreto?",
              choices: [
                {
                  id: "press",
                  label: "Apertar",
                  request: { kind: "script", id: "mansion-switch-press" },
                },
                {
                  id: "leave",
                  label: "Não",
                  request: {
                    kind: "text",
                    id: "mansion-switch-leave",
                    text: "Você deixou a estátua em paz.",
                  },
                },
              ],
            },
          ],
        },
      };
    },
  },
  "mansion-switch-press": {
    id: "mansion-switch-press",
    interact: (story) => {
      const current =
        getStoryPlayerChoice(story, MANSION_SWITCH_CHOICE) === "b"
          ? "b"
          : "a";
      return reply(
        setStoryPlayerChoice(
          story,
          MANSION_SWITCH_CHOICE,
          current === "a" ? "b" : "a",
        ),
        "mansion-switch-press",
        "Você apertou o interruptor secreto! Em algum lugar da mansão, barreiras se moveram...",
      );
    },
  },
  "gift-eevee": giftBallScript("gift-eevee", "eevee", "eevee", 25),
  "gift-hitmonlee": giftBallScript(
    "gift-hitmonlee",
    "hitmonlee",
    "hitmonlee",
    25,
    ["hitmonchan"],
  ),
  "gift-hitmonchan": giftBallScript(
    "gift-hitmonchan",
    "hitmonchan",
    "hitmonchan",
    25,
    ["hitmonlee"],
  ),
  "cinnabar-quiz": {
    id: "cinnabar-quiz",
    interact: (story, context) => {
      const quizId = typeof context.quizId === "number" ? context.quizId : 0;
      const quiz = CINNABAR_QUIZ_QUESTIONS[quizId];
      if (!quiz) return reply(story, "cinnabar-quiz", "...");
      if (hasStoryPlayerEvent(story, "story", cinnabarDoorEventId(quizId))) {
        return reply(
          story,
          "cinnabar-quiz",
          "A máquina de quiz já abriu a porta desta sala.",
        );
      }
      const answer = (value: boolean) => ({
        id: value ? "yes" : "no",
        label: value ? "Sim" : "Não",
        request: {
          kind: "script" as const,
          id: "cinnabar-quiz-answer",
          context: { quizId, answer: value },
        },
      });
      return {
        story,
        presentation: {
          id: "cinnabar-quiz",
          pages: [
            {
              id: "question",
              speaker: "Quiz POKéMON",
              text: t("Get it right and the door opens to the next room. {question}", { question: t(quiz.question) }),
              choices: [answer(true), answer(false)],
            },
          ],
        },
      };
    },
  },
  "cinnabar-quiz-answer": {
    id: "cinnabar-quiz-answer",
    interact: (story, context) => {
      const quizId = typeof context.quizId === "number" ? context.quizId : 0;
      const quiz = CINNABAR_QUIZ_QUESTIONS[quizId];
      if (!quiz) return reply(story, "cinnabar-quiz-answer", "...");
      if (context.answer !== quiz.answer) {
        return reply(
          story,
          "cinnabar-quiz-answer",
          "Errado! A porta continua fechada. Pense bem e tente de novo.",
          "Quiz POKéMON",
        );
      }
      return reply(
        completeStoryPlayerEvent(
          story,
          "story",
          cinnabarDoorEventId(quizId),
        ),
        "cinnabar-quiz-answer",
        "Resposta certa! A porta se abriu. Pode passar!",
        "Quiz POKéMON",
      );
    },
  },
  "rocket-elevator": {
    id: "rocket-elevator",
    interact: (story, context) => {
      const here = contextString(context, "floor");
      if (!hasStoryKeyItem(story, "lift-key")) {
        return reply(
          story,
          "rocket-elevator",
          "O elevador está parado. Parece que ele precisa de uma Lift Key para funcionar.",
        );
      }
      return {
        story,
        presentation: {
          id: "rocket-elevator",
          pages: [
            {
              id: "floors",
              text: "Você usou a Lift Key! Para qual andar quer ir?",
              choices: [
                ...ROCKET_ELEVATOR_FLOORS.filter(
                  (floor) => floor.id !== here,
                ).map((floor) => ({
                  id: floor.id,
                  label: floor.label,
                  request: {
                    kind: "warp" as const,
                    mapId: floor.mapId,
                    x: floor.x,
                    y: floor.y,
                    text: t("The elevator takes you to the {floor}.", { floor: floor.label }),
                  },
                })),
                {
                  id: "stay",
                  label: "Ficar",
                  request: {
                    kind: "text" as const,
                    id: "rocket-elevator-stay",
                    text: "Você decidiu não usar o elevador.",
                  },
                },
              ],
            },
          ],
        },
      };
    },
  },
  "silph-president": {
    id: "silph-president",
    interact: (story) => {
      const speaker = "Presidente";
      if (hasStoryPlayerEvent(story, "reward", "silph-master-ball")) {
        return reply(
          story,
          "silph-president",
          "Presidente: Obrigado por salvar a Silph Co.! Cuide bem da Master Ball!",
          speaker,
        );
      }
      if (
        !hasStoryPlayerEvent(story, "trainer", "silph-co-11f-giovanni")
      ) {
        return reply(
          story,
          "silph-president",
          "Presidente: Socorro! A Team Rocket tomou a nossa empresa! Por favor, derrote Giovanni!",
          speaker,
        );
      }
      const bagItems = { ...story.bagItems };
      bagItems["master-ball"] = (bagItems["master-ball"] ?? 0) + 1;
      return reply(
        completeStoryPlayerEvent(
          { ...story, bagItems },
          "reward",
          "silph-master-ball",
        ),
        "silph-president",
        "Presidente: Você nos salvou! Como agradecimento, leve a nossa criação mais valiosa: a Master Ball! Ela nunca falha em capturar um Pokémon. Você recebeu a Master Ball!",
        speaker,
      );
    },
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
          ? t("You found {item}!", { item: KEY_ITEM_LABELS[itemId] })
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
  "silph-co-11f:9,9": "silph-president",
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

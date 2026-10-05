import type {
  DialogueDefinition,
  DialogueInteractionResult,
  DialoguePresentation,
  DialogueScriptContext,
} from "./dialogueSystem";
import {
  FIELD_TECHNIQUE_BADGE,
  FIELD_TECHNIQUE_BADGE_LABEL,
  canStoryUseStrength,
} from "./fieldTechniques";
import { KEY_ITEM_LABELS } from "./keyItems";
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

export const QUEST_DIALOGUES: Record<string, DialogueDefinition> = {
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
  "route-16-house:4,2": "route16-fly-woman",
  "route-2-east-building:4,6": "route2-flash-aide",
  "fuchsia-city-wardens-house:3,5": "fuchsia-warden",
  "vermilion-house-1:4,5": "vermilion-old-rod-guru",
  "fuchsia-city-house-2:6,5": "fuchsia-good-rod-guru",
  "route-12-fishing-house:4,4": "route12-super-rod-guru",
  "celadon-city-restaurant:1,2": "celadon-coin-case-man",
  "celadon-city-condominiums-1f:2,9": "celadon-tea-woman",
  "fuchsia-city-safari-zone-entrance:7,3": "safari-entrance",
  "route-5-south-entrance:1,5": "saffron-guard",
  "route-6-north-entrance:7,5": "saffron-guard",
  "route-7-east-entrance:6,2": "saffron-guard",
  "route-8-west-entrance:6,2": "saffron-guard",
};

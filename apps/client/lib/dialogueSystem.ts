import { t } from "./i18n";
import type {
  OverworldItemId,
} from "./items";
import {
  resolveWorldNpcPages,
} from "./worldTexts";
import {
  QUEST_DIALOGUES,
  QUEST_WORLD_OBJECT_DIALOGUE_IDS,
} from "./questDialogues";
import {
  MAGIKARP_PRICE,
  fossilToRevive,
  giftMessage,
  grantGiftPokemon,
  hasReceivedGift,
} from "./giftPokemon";
import {
  grantStoryFieldTechniqueOnce,
  grantStoryKeyItemOnce,
  removeStoryKeyItem,
} from "./story";
import {
  chooseMtMoonFossil,
  collectOverworldItem,
  completeStoryPlayerEvent,
  getStoryBillStage,
  healStoryParty,
  interactWithBill,
  interactWithCutObstacle,
  interactWithSsAnneCaptain,
  runBillCellSeparator,
  getStoryPlayerChoice,
  setStoryPlayerChoice,
  storyStarterSummary,
  type MtMoonFossilId,
  type StoryState,
} from "./story";
import type {
  PlayerWorldEventNamespace,
} from "./playerWorldState";
import {
  interactWithVermilionGymTrashCan,
} from "./vermilionGym";

export type DialogueChoice = {
  id: string;
  label: string;
  request: DialogueInteractionRequest;
};

export type DialoguePage = {
  id: string;
  text: string;
  speaker?: string;
  choices?: readonly DialogueChoice[];
};

export type DialoguePresentation = {
  id: string;
  pages: DialoguePage[];
};

export type DialogueCondition = (
  story: StoryState,
) => boolean;

export type DialogueVariant = {
  when?: DialogueCondition;
  pages:
    | readonly DialoguePage[]
    | ((story: StoryState) => readonly DialoguePage[]);
};

export type DialogueScriptContextValue =
  | string
  | number
  | boolean
  | null;

export type DialogueScriptContext = Readonly<
  Record<string, DialogueScriptContextValue>
>;

export type DialogueInteractionResult = {
  story: StoryState;
  presentation: DialoguePresentation;
};

export type DialogueScriptHandler = (
  story: StoryState,
  context: DialogueScriptContext,
) => DialogueInteractionResult;

export type DialogueDefinition = {
  id: string;
  variants?: readonly DialogueVariant[];
  interact?: DialogueScriptHandler;
};

export type DialogueInteractionRequest =
  | {
      kind: "script";
      id: string;
      context?: DialogueScriptContext;
    }
  | {
      kind: "text";
      id: string;
      text: string;
      speaker?: string;
    }
  | { kind: "lab-oak" }
  | { kind: "lab-rival" }
  | { kind: "bill" }
  | { kind: "bill-computer" }
  | { kind: "ss-anne-captain" }
  | { kind: "nurse" }
  | {
      kind: "complete-event";
      namespace: PlayerWorldEventNamespace;
      eventId: string;
      text: string;
      speaker?: string;
    }
  | {
      kind: "set-choice";
      choiceId: string;
      value: string;
      text: string;
      speaker?: string;
    }
  | {
      kind: "pages";
      id: string;
      pages: readonly string[];
      speaker?: string;
    }
  | {
      /** Shows `text`, then the overworld moves the player to the map/tile. */
      kind: "warp";
      mapId: string;
      x: number;
      y: number;
      text: string;
      speaker?: string;
    }
  | { kind: "cut"; obstacleId: string }
  | {
      kind: "fossil";
      fossilId: MtMoonFossilId;
      fossilName: string;
    }
  | {
      kind: "pickup";
      pickupId: string;
      itemId: OverworldItemId;
      itemName: string;
    };

function page(
  id: string,
  text: string,
  speaker?: string,
): DialoguePage {
  return { id, text, speaker };
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

function invalidScriptContext(
  story: StoryState,
  id: string,
): DialogueInteractionResult {
  return {
    story,
    presentation: dialoguePresentationFromText(
      id,
      "Este evento está com contexto inválido.",
    ),
  };
}

function one(
  id: string,
  text: string,
  speaker?: string,
): DialogueDefinition {
  return {
    id,
    variants: [
      {
        pages: [page("main", text, speaker)],
      },
    ],
  };
}

const DIALOGUE_DEFINITIONS: Record<
  string,
  DialogueDefinition
> = {
  ...QUEST_DIALOGUES,
  "lab-oak": {
    id: "lab-oak",
    variants: [
      {
        pages: (story) => [
          page(
            "main",
            storyStarterSummary(story) ??
              "Cuide bem do seu primeiro Pokémon.",
            "Prof. Oak",
          ),
        ],
      },
    ],
  },
  "lab-rival": {
    id: "lab-rival",
    variants: [
      {
        pages: (story) => [
          page(
            "main",
            story.starter
              ? "Quando você tentar sair, vamos ver quem treinou melhor."
              : "Ei! Escolha logo o seu Pokémon.",
            "Blue",
          ),
        ],
      },
    ],
  },
  bill: {
    id: "bill",
    interact: (story) => {
      const result = interactWithBill(story);
      return {
        story: result.story,
        presentation: dialoguePresentationFromText(
          "bill",
          result.message,
        ),
      };
    },
  },
  "bill-computer": {
    id: "bill-computer",
    interact: (story) => {
      const result = runBillCellSeparator(story);
      return {
        story: result.story,
        presentation: dialoguePresentationFromText(
          "bill-computer",
          result.message,
        ),
      };
    },
  },
  "ss-anne-captain": {
    id: "ss-anne-captain",
    interact: (story) => {
      const result = interactWithSsAnneCaptain(story);
      return {
        story: result.story,
        presentation: dialoguePresentationFromText(
          "ss-anne-captain",
          result.message,
        ),
      };
    },
  },
  "pokemon-center-nurse": {
    id: "pokemon-center-nurse",
    interact: (story) => ({
      story: healStoryParty(story),
      presentation: dialoguePresentationFromText(
        "pokemon-center-nurse",
        "Pronto! Todos os seus Pokémon estão completamente saudáveis.",
        "Nurse",
      ),
    }),
  },
  cut: {
    id: "cut",
    interact: (story, context) => {
      const obstacleId = contextString(
        context,
        "obstacleId",
      );
      if (!obstacleId) {
        return invalidScriptContext(story, "cut");
      }

      const result = interactWithCutObstacle(
        story,
        obstacleId,
      );
      return {
        story: result.story,
        presentation: dialoguePresentationFromText(
          `cut:${obstacleId}`,
          result.message,
        ),
      };
    },
  },
  fossil: {
    id: "fossil",
    interact: (story, context) => {
      const fossilId = contextString(
        context,
        "fossilId",
      );
      const fossilName = contextString(
        context,
        "fossilName",
      );
      if (
        (fossilId !== "dome" &&
          fossilId !== "helix") ||
        !fossilName
      ) {
        return invalidScriptContext(story, "fossil");
      }

      const result = chooseMtMoonFossil(
        story,
        fossilId,
      );
      return {
        story: result.story,
        presentation: dialoguePresentationFromText(
          `fossil:${fossilId}`,
          result.accepted
            ? `Você escolheu o ${fossilName}. Miguel ficará com o outro fóssil.`
            : result.reason === "miguel-not-defeated"
              ? "Miguel ainda não concordou em dividir os fósseis."
              : "Você já escolheu um fóssil em Mt. Moon.",
        ),
      };
    },
  },
  pickup: {
    id: "pickup",
    interact: (story, context) => {
      const pickupId = contextString(
        context,
        "pickupId",
      );
      const itemId = contextString(
        context,
        "itemId",
      );
      const itemName = contextString(
        context,
        "itemName",
      );
      if (!pickupId || !itemId || !itemName) {
        return invalidScriptContext(story, "pickup");
      }

      const result = collectOverworldItem(
        story,
        pickupId,
        itemId as OverworldItemId,
      );
      return {
        story: result.story,
        presentation: dialoguePresentationFromText(
          `pickup:${pickupId}`,
          result.accepted
            ? `Você encontrou ${itemName}!`
            : result.reason === "inventory-full"
              ? "Sua bolsa não tem espaço para mais desse item."
              : "Esse item já foi coletado.",
        ),
      };
    },
  },
  "vermilion-gym-trash-can": {
    id: "vermilion-gym-trash-can",
    interact: (story, context) => {
      const canId = contextString(context, "canId");
      if (!canId) {
        return invalidScriptContext(
          story,
          "vermilion-gym-trash-can",
        );
      }

      const result =
        interactWithVermilionGymTrashCan(
          story,
          canId,
        );
      return {
        story: result.story,
        presentation: dialoguePresentationFromText(
          `vermilion-gym-trash-can:${canId}`,
          result.message,
        ),
      };
    },
  },
  "pallet-woman": one(
    "pallet-woman",
    "Eu também crio Pokémon. Quando ficam fortes, eles conseguem me proteger.",
    "Mulher",
  ),
  "pallet-fat-man": one(
    "pallet-fat-man",
    "A tecnologia é incrível! Hoje podemos guardar e recuperar itens e Pokémon como dados usando um PC.",
    "Homem",
  ),
  "route1-mart-clerk": one(
    "route1-mart-clerk",
    "Olá! Trabalho no Poké Mart. Visite nossa loja em Viridian City quando precisar de suprimentos e Poké Balls.",
    "Clerk",
  ),
  "route1-boy": one(
    "route1-boy",
    "Viu aqueles barrancos na estrada? Dá um pouco de medo, mas você pode pular por eles para voltar a Pallet Town mais rápido.",
    "Garoto",
  ),
  "oak-lab-aide-1": one(
    "oak-lab-aide-1",
    "Eu estudo Pokémon como assistente do Prof. Oak.",
    "Aide",
  ),
  "oak-lab-aide-2": one(
    "oak-lab-aide-2",
    "O Prof. Oak pode não parecer, mas é uma autoridade em Pokémon. Muitos Treinadores o respeitam muito.",
    "Aide",
  ),
  "oak-lab-aide-3": one(
    "oak-lab-aide-3",
    "O Prof. Oak vai ter seu próprio programa em breve: o Seminário Pokémon do Prof. Oak.",
    "Aide",
  ),
  "viridian-dream-eater-tutor": one(
    "viridian-dream-eater-tutor",
    "Há golpes que funcionam de maneiras muito diferentes de ataques comuns. Continue conhecendo Pokémon e você encontrará técnicas incomuns.",
    "Tutor",
  ),
  "route4-woman": one(
    "route4-woman",
    "Ai! Tropecei em um Pokémon rochoso, Geodude!",
    "Mulher",
  ),
  "route4-boy": {
    id: "route4-boy",
    variants: [
      {
        pages: [
          page(
            "badge",
            "Uau, essa é a Boulder Badge! Brock não é só forte; as pessoas gostam e respeitam ele.",
            "Garoto",
          ),
          page(
            "dream",
            "Quero me tornar um Líder de Ginásio como ele.",
            "Garoto",
          ),
        ],
      },
    ],
  },
  "cerulean-house2-hiker": one(
    "cerulean-house2-hiker",
    "A Team Rocket arrombou a parede e roubou meu material sobre técnicas de escavação. O ladrão fugiu para os fundos!",
    "Morador",
  ),
  "cerulean-house2-lass": one(
    "cerulean-house2-lass",
    "A Team Rocket cavou um buraco na parede. Eles realmente não prestam!",
    "Garota",
  ),
  "pewter-gym-guy": one(
    "pewter-gym-guy",
    "Brock usa Pokémon Rock. Water e Grass têm uma grande vantagem aqui.",
    "Gym Guide",
  ),
  "cerulean-gym-guy": one(
    "cerulean-gym-guy",
    "Misty usa Pokémon Water. Grass pode drenar a vantagem dela, e Electric pode dar um choque decisivo.",
    "Gym Guide",
  ),
  "vermilion-gym-guy": one(
    "vermilion-gym-guy",
    "Lt. Surge domina Pokémon Electric. Ground ignora ataques Electric, e os interruptores da porta estão escondidos nas lixeiras.",
    "Gym Guide",
  ),
  "viridian-forest-youngster": one(
    "viridian-forest-youngster",
    "Vim com alguns amigos capturar Pokémon Bug. Eles estão loucos para batalhar!",
    "Youngster",
  ),
  "viridian-forest-boy": one(
    "viridian-forest-boy",
    "Eu estava jogando Poké Balls para capturar Pokémon e elas acabaram. Nunca é demais carregar algumas.",
    "Garoto",
  ),
  "forest-south-gate-woman": one(
    "forest-south-gate-woman",
    "Vai entrar na Viridian Forest? Lá dentro é um labirinto natural. Cuidado para não se perder.",
    "Mulher",
  ),
  "forest-south-gate-woman-rattata": one(
    "forest-south-gate-woman-rattata",
    "Rattata pode ser pequeno, mas não subestime a mordida dele. Você já capturou um?",
    "Mulher",
  ),
  "forest-north-gate-youngster": one(
    "forest-north-gate-youngster",
    "Muitos Pokémon vivem apenas em florestas e cavernas. Procure por toda parte para encontrar espécies diferentes.",
    "Youngster",
  ),
  "forest-north-gate-old-man": one(
    "forest-north-gate-old-man",
    "Viu aquelas árvores finas à beira da estrada? Dizem que um golpe especial de Pokémon consegue cortá-las.",
    "Homem",
  ),
  "forest-north-gate-cooltrainer": one(
    "forest-north-gate-cooltrainer",
    "Você conhece a técnica de cancelar evolução? É uma forma de treinar um Pokémon mantendo a forma atual.",
    "Treinadora",
  ),
  "mart-youngster": one(
    "mart-youngster",
    "Tenho que comprar algumas Potions.",
    "Youngster",
  ),
  "mart-woman": one(
    "mart-woman",
    "Antidotes vendem muito bem por aqui.",
    "Mulher",
  ),
  "center-gentleman": one(
    "center-gentleman",
    "Pode usar o PC no canto à vontade. A recepcionista deixa qualquer treinador usar.",
    "Gentleman",
  ),
  "center-boy": one(
    "center-boy",
    "Há Pokémon Centers em todas as cidades adiante. A cura é gratuita.",
    "Garoto",
  ),
  "center-youngster": one(
    "center-youngster",
    "Pokémon Centers curam Pokémon cansados, feridos ou desmaiados por completo.",
    "Youngster",
  ),
  "viridian-npc-16-22": one(
    "viridian-npc-16-22",
    "É ótimo poder carregar Pokémon e usá-los a qualquer hora, em qualquer lugar.",
    "Garoto",
  ),
  "viridian-npc-34-11": one(
    "viridian-npc-34-11",
    "O Ginásio Pokémon de Viridian está sempre fechado. Quem será o Líder?",
    "Homem",
  ),
  "viridian-npc-20-12": {
    id: "viridian-npc-20-12",
    variants: [
      {
        when: (story) => story.firstBattleComplete,
        pages: [
          page(
            "after",
            "Às vezes vou fazer compras em Pewter City. Preciso atravessar a trilha sinuosa da Viridian Forest.",
            "Mulher",
          ),
        ],
      },
      {
        pages: [
          page(
            "before",
            "Meu avô ainda não tomou o café dele. Desculpe por ele estar tão mal-humorado.",
            "Mulher",
          ),
        ],
      },
    ],
  },
  "viridian-npc-33-26": {
    id: "viridian-npc-33-26",
    variants: [
      {
        pages: [
          {
            id: "question",
            speaker: "Youngster",
            text:
              "Quer saber a diferença entre os dois Pokémon lagarta daqui?",
            choices: [
              {
                id: "yes",
                label: "Sim",
                request: {
                  kind: "text",
                  id: "viridian-caterpillar-yes",
                  speaker: "Youngster",
                  text:
                    "Caterpie não é venenoso, mas Weedle é. Cuidado para seu Pokémon não levar Poison Sting.",
                },
              },
              {
                id: "no",
                label: "Não",
                request: {
                  kind: "text",
                  id: "viridian-caterpillar-no",
                  speaker: "Youngster",
                  text: "Ah, tudo bem então!",
                },
              },
            ],
          },
        ],
      },
    ],
  },
  "silph-lapras-gift": {
    id: "silph-lapras-gift",
    interact: (story) => {
      const gift = grantGiftPokemon(story, "lapras", "lapras", 25);
      return {
        story: gift.story,
        presentation: dialoguePresentationFromText(
          "silph-lapras-gift",
          gift.granted
            ? `Funcionário: Oh! Oi! Você não é um Rocket! Veio nos salvar? Obrigado! Quero que fique com este Pokémon por nos salvar. ${giftMessage("lapras", gift.destination)}`
            : gift.reason === "storage-full"
              ? "Funcionário: Seu PC está cheio! Libere espaço e volte."
              : "Funcionário: Obrigado por nos salvar! Cuide bem do Lapras.",
          "Funcionário",
        ),
      };
    },
  },
  "cinnabar-fossil-revive": {
    id: "cinnabar-fossil-revive",
    interact: (story) => {
      const fossil = fossilToRevive(story);
      if (!fossil) {
        return {
          story,
          presentation: dialoguePresentationFromText(
            "cinnabar-fossil-revive",
            "Doutor: Eu sou um doutor muito importante. Estudo fósseis de Pokémon raros o tempo todo. Você tem um fóssil para mim?",
            "Doutor",
          ),
        };
      }
      const gift = grantGiftPokemon(story, fossil.giftId, fossil.species, 5);
      return {
        story: gift.story,
        presentation: dialoguePresentationFromText(
          "cinnabar-fossil-revive",
          gift.granted
            ? `Doutor: Ótimo! Vou regenerar o fóssil agora… Pronto, deu certo! ${giftMessage(fossil.species, gift.destination)}`
            : "Doutor: Seu PC está cheio! Libere espaço e volte.",
          "Doutor",
        ),
      };
    },
  },
  "magikarp-salesman": {
    id: "magikarp-salesman",
    interact: (story) => {
      if (hasReceivedGift(story, "magikarp")) {
        return {
          story,
          presentation: dialoguePresentationFromText(
            "magikarp-salesman",
            "Vendedor: Bem, não faço reembolso. Você sabia o que estava comprando!",
            "Vendedor",
          ),
        };
      }
      if (getStoryPlayerChoice(story, "magikarp-offer") !== "offered") {
        return {
          story: setStoryPlayerChoice(story, "magikarp-offer", "offered"),
          presentation: dialoguePresentationFromText(
            "magikarp-salesman",
            `Vendedor: Olá, rapaz! Tenho uma oferta imperdível! Um Pokémon secreto, o Magikarp, por apenas ₽${MAGIKARP_PRICE}! Fale comigo de novo para fechar negócio.`,
            "Vendedor",
          ),
        };
      }
      if (story.money < MAGIKARP_PRICE) {
        return {
          story,
          presentation: dialoguePresentationFromText(
            "magikarp-salesman",
            "Vendedor: Você não tem dinheiro suficiente! Volte quando tiver ₽500.",
            "Vendedor",
          ),
        };
      }
      const gift = grantGiftPokemon(story, "magikarp", "magikarp", 5);
      return {
        story: gift.granted
          ? { ...gift.story, money: gift.story.money - MAGIKARP_PRICE }
          : gift.story,
        presentation: dialoguePresentationFromText(
          "magikarp-salesman",
          gift.granted
            ? `Vendedor: Negócio fechado! ${giftMessage("magikarp", gift.destination)}`
            : "Vendedor: Seu PC está cheio! Libere espaço e volte.",
          "Vendedor",
        ),
      };
    },
  },
  "safari-secret-house-surf": {
    id: "safari-secret-house-surf",
    interact: (story) => {
      const gift = grantStoryFieldTechniqueOnce(story, "surf");
      return {
        story: gift.story,
        presentation: dialoguePresentationFromText(
          "safari-secret-house-surf",
          gift.granted
            ? "Atendente: Ah! Finalmente! Você é a primeira pessoa a chegar à Casa Secreta! Para comemorar, aceite este presente. Você recebeu a HM03 Surf! Com ela você atravessa a água, desde que tenha a Soul Badge."
            : "Atendente: Surf permite atravessar a água. Fale com a água de frente para usá-lo!",
          "Atendente",
        ),
      };
    },
  },
  "pallet-mom": {
    id: "pallet-mom",
    interact: (story) => {
      if (!story.starter) {
        return {
          story,
          presentation: dialoguePresentationFromText(
            "pallet-mom",
            "Mãe: Vá ver o Prof. Oak no laboratório! Ele está esperando por você.",
            "Mãe",
          ),
        };
      }

      return {
        story: healStoryParty(story),
        presentation: dialoguePresentationFromText(
          "pallet-mom",
          "Mãe: Você está de volta! Descanse um pouco. Pronto! Seus Pokémon estão totalmente recuperados.",
          "Mãe",
        ),
      };
    },
  },
  "pallet-daisy": {
    id: "pallet-daisy",
    interact: (story) => {
      if (!story.starter) {
        return {
          story,
          presentation: dialoguePresentationFromText(
            "pallet-daisy",
            "Daisy: Oi! Meu irmão Blue está no laboratório do vovô.",
            "Daisy",
          ),
        };
      }

      const gift = grantStoryKeyItemOnce(story, "town-map");
      return {
        story: gift.story,
        presentation: dialoguePresentationFromText(
          "pallet-daisy",
          gift.granted
            ? "Daisy: Oi! Que bom ver você. Tome este Town Map: ele mostra onde você está em Kanto. Você recebeu o Town Map!"
            : "Daisy: Boa sorte na sua viagem! Cuide bem dos seus Pokémon.",
          "Daisy",
        ),
      };
    },
  },
  "museum-old-amber": {
    id: "museum-old-amber",
    interact: (story) => {
      const gift = grantStoryKeyItemOnce(story, "old-amber");
      return {
        story: gift.story,
        presentation: dialoguePresentationFromText(
          "museum-old-amber",
          gift.granted
            ? "Cientista: Psiu! Preciso contar um segredo. Acho que este pedaço de âmbar contém DNA de Pokémon! Mas meus colegas me ignoram. Leve isto a um laboratório Pokémon, por favor! Você recebeu o Old Amber!"
            : "Cientista: Por favor, leve o Old Amber a um laboratório Pokémon para examiná-lo!",
          "Cientista",
        ),
      };
    },
  },
  "fan-club-chairman": {
    id: "fan-club-chairman",
    interact: (story) => {
      const gift = grantStoryKeyItemOnce(story, "bike-voucher");
      const hadBike = (story.keyItemIds ?? []).includes("bicycle");
      return {
        story: hadBike ? story : gift.story,
        presentation: dialoguePresentationFromText(
          "fan-club-chairman",
          hadBike
            ? "Presidente: Que Bicicleta ótima! Meus Pokémon são ainda mais especiais, é claro!"
            : gift.granted
              ? "Presidente: Eu presido o Pokémon Fan Club! Crio mais de cem Pokémon e sou muito exigente! Obrigado por me ouvir. Tome este Bike Voucher! Você recebeu o Bike Voucher!"
              : "Presidente: Use o Bike Voucher na Bike Shop de Cerulean City!",
          "Presidente",
        ),
      };
    },
  },
  "bike-shop-clerk": {
    id: "bike-shop-clerk",
    interact: (story) => {
      if ((story.keyItemIds ?? []).includes("bicycle")) {
        return {
          story,
          presentation: dialoguePresentationFromText(
            "bike-shop-clerk",
            "Atendente: Como está a Bicicleta? Você pode usá-la na Cycling Road e até em cavernas!",
            "Atendente",
          ),
        };
      }

      if ((story.keyItemIds ?? []).includes("bike-voucher")) {
        const spent = removeStoryKeyItem(story, "bike-voucher");
        return {
          story: grantStoryKeyItemOnce(spent, "bicycle").story,
          presentation: dialoguePresentationFromText(
            "bike-shop-clerk",
            "Atendente: Ah, um Bike Voucher! Aqui está a sua Bicicleta! Você recebeu a Bicycle!",
            "Atendente",
          ),
        };
      }

      return {
        story,
        presentation: dialoguePresentationFromText(
          "bike-shop-clerk",
          "Atendente: Uma bicicleta nova custa ₽1.000.000! Receio que não temos descontos.",
          "Atendente",
        ),
      };
    },
  },
  "viridian-npc-21-6": {
    id: "viridian-npc-21-6",
    variants: [
      {
        when: (story) => story.firstBattleComplete,
        pages: [
          page(
            "after",
            "Primeiro enfraqueça o Pokémon antes de tentar capturá-lo.",
            "Velho",
          ),
        ],
      },
      {
        pages: [
          page(
            "before",
            "Esta passagem é propriedade privada por enquanto!",
            "Velho",
          ),
        ],
      },
    ],
  },
};

const WORLD_OBJECT_DIALOGUE_IDS: Record<
  string,
  string
> = {
  ...QUEST_WORLD_OBJECT_DIALOGUE_IDS,
  "pallet-town:3,10": "pallet-woman",
  "pallet-players-house-1f:8,4": "pallet-mom",
  "safari-zone-secret-house:6,5": "safari-secret-house-surf",
  "silph-co-7f:0,7": "silph-lapras-gift",
  "cinnabar-island-pokemon-lab-experiment-room:12,3": "cinnabar-fossil-revive",
  "route-4-pokemon-center:1,3": "magikarp-salesman",
  "pallet-rivals-house:10,6": "pallet-daisy",
  "pewter-museum-1f:21,3": "museum-old-amber",
  "vermilion-pokemon-fan-club:5,4": "fan-club-chairman",
  "cerulean-bike-shop:9,3": "bike-shop-clerk",
  "pallet-town:13,17": "pallet-fat-man",
  "route-1:6,28": "route1-mart-clerk",
  "route-1:19,16": "route1-boy",
  "oak-lab:3,11": "oak-lab-aide-1",
  "oak-lab:11,10": "oak-lab-aide-2",
  "oak-lab:2,10": "oak-lab-aide-3",
  "viridian-city:8,26": "viridian-dream-eater-tutor",
  "viridian-city:16,22": "viridian-npc-16-22",
  "viridian-city:34,11": "viridian-npc-34-11",
  "viridian-city:20,12": "viridian-npc-20-12",
  "viridian-city:33,26": "viridian-npc-33-26",
  "viridian-city:21,6": "viridian-npc-21-6",
};

export function resolveWorldObjectDialogueId(
  mapId: string,
  x: number,
  y: number,
): string | null {
  return (
    WORLD_OBJECT_DIALOGUE_IDS[
      `${mapId}:${x},${y}`
    ] ?? null
  );
}

function fallbackWorldNpcDialogue(
  mapId: string,
  speaker: string,
): string {
  if (mapId === "pallet-town") {
    return "Pallet Town é pequena, mas todo grande Treinador precisa começar em algum lugar.";
  }

  if (mapId === "route-1") {
    return "Na estrada, observe a grama alta, os barrancos e o estado do seu time antes de seguir viagem.";
  }

  if (mapId === "viridian-city") {
    return "Viridian tem um Pokémon Center e um Poké Mart. Prepare seu time antes de seguir para rotas mais perigosas.";
  }

  if (mapId === "oak-lab") {
    return "O laboratório do Prof. Oak está sempre cheio de pesquisas sobre Pokémon e batalhas.";
  }

  if (/clerk|mart/i.test(speaker)) {
    return "Posso ajudar quando você precisar preparar seus suprimentos para a próxima rota.";
  }

  if (/scientist|aide|pesquis/i.test(speaker)) {
    return "Ainda há muito para descobrir sobre Pokémon, seus golpes e a forma como eles batalham.";
  }

  if (/trainer|trein/i.test(speaker)) {
    return "Um bom Treinador observa o campo, o próprio time e o adversário antes de decidir a próxima ação.";
  }

  return "Cada pessoa que você encontra pelo caminho pode saber algo útil sobre esta região. Continue explorando.";
}

export function resolveWorldObjectDialogueRequest(
  mapId: string,
  x: number,
  y: number,
  speaker: string,
): DialogueInteractionRequest {
  const id = resolveWorldObjectDialogueId(
    mapId,
    x,
    y,
  );

  if (id) {
    return {
      kind: "script",
      id,
    };
  }

  const pages = resolveWorldNpcPages(mapId, x, y);
  if (pages) {
    return {
      kind: "pages",
      id: `world-npc:${mapId}:${x},${y}`,
      pages,
      speaker,
    };
  }

  return {
    kind: "text",
    id: `world-npc:${mapId}:${x},${y}`,
    speaker,
    text: fallbackWorldNpcDialogue(
      mapId,
      speaker,
    ),
  };
}

export function resolveDialogueScript(
  story: StoryState,
  id: string,
): DialoguePresentation | null {
  const definition = DIALOGUE_DEFINITIONS[id];
  if (!definition?.variants) return null;

  const variant = definition.variants.find(
    (candidate) =>
      !candidate.when || candidate.when(story),
  );
  if (!variant) return null;

  const pages =
    typeof variant.pages === "function"
      ? variant.pages(story)
      : variant.pages;

  return {
    id,
    pages: pages.map((entry) => ({ ...entry })),
  };
}

export function dialoguePresentationFromText(
  id: string,
  message: string,
  speaker?: string,
): DialoguePresentation {
  return {
    id,
    pages: [page("main", message, speaker)],
  };
}

/** Translates every visible string of a dialogue into the active language. */
function localizePresentation(
  presentation: DialoguePresentation,
): DialoguePresentation {
  return {
    ...presentation,
    pages: presentation.pages.map((entry) => ({
      ...entry,
      text: t(entry.text),
      speaker: entry.speaker ? t(entry.speaker) : entry.speaker,
      choices: entry.choices?.map((choice) => ({
        ...choice,
        label: t(choice.label),
      })),
    })),
  };
}

export function runDialogueInteraction(
  story: StoryState,
  request: DialogueInteractionRequest,
): DialogueInteractionResult {
  const result = runDialogueInteractionRaw(story, request);
  return {
    ...result,
    presentation: localizePresentation(result.presentation),
  };
}

function runDialogueInteractionRaw(
  story: StoryState,
  request: DialogueInteractionRequest,
): DialogueInteractionResult {
  if (request.kind === "script") {
    const definition = DIALOGUE_DEFINITIONS[request.id];
    if (definition?.interact) {
      return definition.interact(
        story,
        request.context ?? {},
      );
    }

    return {
      story,
      presentation:
        resolveDialogueScript(story, request.id) ??
        dialoguePresentationFromText(
          request.id,
          "Olá! Continue explorando e conversando com as pessoas pelo caminho. Sempre há algo novo para descobrir.",
        ),
    };
  }

  if (request.kind === "pages") {
    return {
      story,
      presentation: {
        id: request.id,
        pages: request.pages.map((text, index) =>
          page(`${index}`, text, request.speaker),
        ),
      },
    };
  }

  if (request.kind === "text") {
    return {
      story,
      presentation: dialoguePresentationFromText(
        request.id,
        request.text,
        request.speaker,
      ),
    };
  }

  if (request.kind === "lab-oak") {
    return {
      story,
      presentation: dialoguePresentationFromText(
        "lab-oak",
        storyStarterSummary(story) ??
          "Cuide bem do seu primeiro Pokémon.",
        "Prof. Oak",
      ),
    };
  }

  if (request.kind === "lab-rival") {
    return {
      story,
      presentation: dialoguePresentationFromText(
        "lab-rival",
        story.starter
          ? "Quando você tentar sair, vamos ver quem treinou melhor."
          : "Ei! Escolha logo o seu Pokémon.",
        "Blue",
      ),
    };
  }

  if (request.kind === "bill") {
    const result = interactWithBill(story);
    return {
      story: result.story,
      presentation: dialoguePresentationFromText(
        "bill",
        result.message,
      ),
    };
  }

  if (request.kind === "bill-computer") {
    const result = runBillCellSeparator(story);
    return {
      story: result.story,
      presentation: dialoguePresentationFromText(
        "bill-computer",
        result.message,
      ),
    };
  }

  if (request.kind === "ss-anne-captain") {
    const result = interactWithSsAnneCaptain(story);
    return {
      story: result.story,
      presentation: dialoguePresentationFromText(
        "ss-anne-captain",
        result.message,
      ),
    };
  }

  if (request.kind === "nurse") {
    return {
      story: healStoryParty(story),
      presentation: dialoguePresentationFromText(
        "pokemon-center-nurse",
        "Pronto! Todos os seus Pokémon estão completamente saudáveis.",
        "Nurse",
      ),
    };
  }

  if (request.kind === "complete-event") {
    return {
      story: completeStoryPlayerEvent(
        story,
        request.namespace,
        request.eventId,
      ),
      presentation: dialoguePresentationFromText(
        "event:" +
          request.namespace +
          ":" +
          request.eventId,
        request.text,
        request.speaker,
      ),
    };
  }

  if (request.kind === "set-choice") {
    return {
      story: setStoryPlayerChoice(
        story,
        request.choiceId,
        request.value,
      ),
      presentation: dialoguePresentationFromText(
        "choice:" + request.choiceId,
        request.text,
        request.speaker,
      ),
    };
  }

  if (request.kind === "warp") {
    return {
      story,
      presentation: dialoguePresentationFromText(
        `warp:${request.mapId}:${request.x},${request.y}`,
        request.text,
        request.speaker,
      ),
    };
  }

  if (request.kind === "cut") {
    const result = interactWithCutObstacle(
      story,
      request.obstacleId,
    );
    return {
      story: result.story,
      presentation: dialoguePresentationFromText(
        `cut:${request.obstacleId}`,
        result.message,
      ),
    };
  }

  if (request.kind === "fossil") {
    const result = chooseMtMoonFossil(
      story,
      request.fossilId,
    );

    return {
      story: result.story,
      presentation: dialoguePresentationFromText(
        `fossil:${request.fossilId}`,
        result.accepted
          ? `Você escolheu o ${request.fossilName}. Miguel ficará com o outro fóssil.`
          : result.reason === "miguel-not-defeated"
            ? "Miguel ainda não concordou em dividir os fósseis."
            : "Você já escolheu um fóssil em Mt. Moon.",
      ),
    };
  }

  const result = collectOverworldItem(
    story,
    request.pickupId,
    request.itemId,
  );

  return {
    story: result.story,
    presentation: dialoguePresentationFromText(
      `pickup:${request.pickupId}`,
      result.accepted
        ? `Você encontrou ${request.itemName}!`
        : result.reason === "inventory-full"
          ? "Sua bolsa não tem espaço para mais desse item."
          : "Esse item já foi coletado.",
    ),
  };
}

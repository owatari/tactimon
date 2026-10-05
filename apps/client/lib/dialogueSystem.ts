import type {
  OverworldItemId,
} from "./items";
import {
  resolveWorldNpcPages,
} from "./worldTexts";
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
  "pallet-town:3,10": "pallet-woman",
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

export function runDialogueInteraction(
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

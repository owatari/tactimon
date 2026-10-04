import type {
  DialogueInteractionRequest,
} from "./dialogueSystem";
import {
  isPlayerWorldConditionMet,
  type PlayerWorldCondition,
} from "./playerWorldProjection";
import type {
  StoryState,
} from "./story";

type PlayerWorldGateBase = {
  id: string;
  allowWhen: PlayerWorldCondition;
  blockedRequest: DialogueInteractionRequest;
};

export type PlayerWorldEdgeGate = PlayerWorldGateBase & {
  kind: "edge";
  fromMapId: string;
  toMapId: string;
};

export type PlayerWorldTileGate = PlayerWorldGateBase & {
  kind: "tile";
  mapId: string;
  x?: number;
  y?: number;
  xRange?: readonly [number, number];
  yRange?: readonly [number, number];
};

const EDGE_GATES: readonly PlayerWorldEdgeGate[] = [
  {
    id: "pallet-route1-starter",
    kind: "edge",
    fromMapId: "pallet-town",
    toMapId: "route-1",
    allowWhen: {
      kind: "event",
      namespace: "story",
      id: "starter-chosen",
    },
    blockedRequest: {
      kind: "text",
      id: "gate:pallet-route1-starter",
      speaker: "Prof. Oak",
      text:
        "Espere! Passe no meu laboratório antes de sair de Pallet.",
    },
  },
  {
    id: "pewter-route3-boulder",
    kind: "edge",
    fromMapId: "pewter-city",
    toMapId: "route-3",
    allowWhen: {
      kind: "event",
      namespace: "badge",
      id: "boulder",
    },
    blockedRequest: {
      kind: "text",
      id: "gate:pewter-route3-boulder",
      text:
        "A passagem para a Route 3 abre depois de vencer Brock e conquistar a Boulder Badge.",
    },
  },
  {
    id: "cerulean-route24-rival",
    kind: "edge",
    fromMapId: "cerulean-city",
    toMapId: "route-24",
    allowWhen: {
      kind: "event",
      namespace: "trainer",
      id: "cerulean-rival",
    },
    blockedRequest: {
      kind: "text",
      id: "gate:cerulean-route24-rival",
      text:
        "Blue está esperando na saída norte de Cerulean. Enfrente-o antes de seguir para a Route 24.",
    },
  },
  {
    id: "cerulean-route5-rocket",
    kind: "edge",
    fromMapId: "cerulean-city",
    toMapId: "route-5",
    allowWhen: {
      kind: "event",
      namespace: "trainer",
      id: "cerulean-rocket",
    },
    blockedRequest: {
      kind: "text",
      id: "gate:cerulean-route5-rocket",
      text:
        "A rota sul só fica segura depois de expulsar o Rocket que está atrás da casa arrombada.",
    },
  },
];

const KANTO_BADGES = [
  "boulder",
  "cascade",
  "thunder",
  "rainbow",
  "soul",
  "marsh",
  "volcano",
  "earth",
] as const;

const TILE_GATES: readonly PlayerWorldTileGate[] = [
  {
    id: "route22-league-gate",
    kind: "tile",
    mapId: "route-22",
    xRange: [8, 9],
    y: 5,
    allowWhen: {
      kind: "all",
      conditions: KANTO_BADGES.map((id) => ({
        kind: "event" as const,
        namespace: "badge" as const,
        id,
      })),
    },
    blockedRequest: {
      kind: "text",
      id: "gate:route22-league",
      speaker: "Pokémon League",
      text:
        "Acesso restrito. Volte quando tiver todas as oito insígnias de Kanto.",
    },
  },
  {
    id: "vermilion-ss-anne-ticket",
    kind: "tile",
    mapId: "vermilion-city",
    xRange: [22, 24],
    y: 34,
    allowWhen: {
      kind: "event",
      namespace: "key-item",
      id: "ss-ticket",
    },
    blockedRequest: {
      kind: "text",
      id: "gate:ss-anne-ticket",
      speaker: "Marinheiro",
      text:
        "Bem-vindo ao S.S. Anne! Você precisa do S.S. Ticket para embarcar.",
    },
  },
  {
    id: "ss-anne-captain-rival",
    kind: "tile",
    mapId: "ss-anne-2f-corridor",
    x: 30,
    y: 2,
    allowWhen: {
      kind: "event",
      namespace: "trainer",
      id: "ss-anne-rival",
    },
    blockedRequest: {
      kind: "text",
      id: "gate:ss-anne-captain-rival",
      text:
        "Blue está bloqueando o caminho para o Capitão. Vença-o primeiro.",
    },
  },
  {
    id: "cerulean-house2-front",
    kind: "tile",
    mapId: "cerulean-city",
    x: 30,
    y: 11,
    allowWhen: {
      kind: "event",
      namespace: "key-item",
      id: "ss-ticket",
    },
    blockedRequest: {
      kind: "text",
      id: "gate:cerulean-house2",
      speaker: "Policial",
      text:
        "A casa foi arrombada. A passagem fica isolada até terminarmos de verificar a ocorrência.",
    },
  },
  {
    id: "cerulean-house2-rear-a",
    kind: "tile",
    mapId: "cerulean-city",
    x: 31,
    y: 8,
    allowWhen: {
      kind: "event",
      namespace: "key-item",
      id: "ss-ticket",
    },
    blockedRequest: {
      kind: "text",
      id: "gate:cerulean-house2",
      speaker: "Policial",
      text:
        "A casa foi arrombada. A passagem fica isolada até terminarmos de verificar a ocorrência.",
    },
  },
  {
    id: "cerulean-house2-rear-b",
    kind: "tile",
    mapId: "cerulean-city",
    x: 31,
    y: 9,
    allowWhen: {
      kind: "event",
      namespace: "key-item",
      id: "ss-ticket",
    },
    blockedRequest: {
      kind: "text",
      id: "gate:cerulean-house2",
      speaker: "Policial",
      text:
        "A casa foi arrombada. A passagem fica isolada até terminarmos de verificar a ocorrência.",
    },
  },
];

function coordinateMatches(
  value: number,
  exact: number | undefined,
  range: readonly [number, number] | undefined,
): boolean {
  if (exact !== undefined) return value === exact;
  if (range) return value >= range[0] && value <= range[1];
  return true;
}

export function resolveBlockedPlayerEdgeGate(
  story: StoryState,
  fromMapId: string,
  toMapId: string,
): PlayerWorldEdgeGate | null {
  return (
    EDGE_GATES.find(
      (gate) =>
        gate.fromMapId === fromMapId &&
        gate.toMapId === toMapId &&
        !isPlayerWorldConditionMet(story, gate.allowWhen),
    ) ?? null
  );
}

export function resolveBlockedPlayerTileGate(
  story: StoryState,
  mapId: string,
  x: number,
  y: number,
): PlayerWorldTileGate | null {
  return (
    TILE_GATES.find(
      (gate) =>
        gate.mapId === mapId &&
        coordinateMatches(x, gate.x, gate.xRange) &&
        coordinateMatches(y, gate.y, gate.yRange) &&
        !isPlayerWorldConditionMet(story, gate.allowWhen),
    ) ?? null
  );
}

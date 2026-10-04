export type OverworldDialogueDefinition = {
  id: string;
  mapId: string;
  label: string;
  x: number;
  y: number;
  spriteUrl: string;
  dialogue: string;
};

export const OVERWORLD_DIALOGUES:
  readonly OverworldDialogueDefinition[] = [
    {
      id: "route4-woman",
      mapId: "route-4",
      label: "Mulher",
      x: 9,
      y: 8,
      spriteUrl: "/game-assets/overworld/023_woman_1.png",
      dialogue:
        "Mulher: Ai! Tropecei em um Pokémon rochoso, Geodude!",
    },
    {
      id: "route4-boy",
      mapId: "route-4",
      label: "Garoto",
      x: 15,
      y: 14,
      spriteUrl: "/game-assets/overworld/019_boy.png",
      dialogue:
        "Garoto: Uau, essa é a Boulder Badge! Brock não é só forte; as pessoas gostam e respeitam ele. Quero me tornar um Líder de Ginásio como ele.",
    },
    {
      id: "pewter-gym-guy",
      mapId: "pewter-gym",
      label: "Gym Guide",
      x: 7,
      y: 12,
      spriteUrl: "/game-assets/overworld/091_gym_guy.png",
      dialogue:
        "Gym Guide: Brock usa Pokémon Rock. Water e Grass têm uma grande vantagem aqui.",
    },
    {
      id: "viridian-forest-youngster",
      mapId: "viridian-forest",
      label: "Youngster",
      x: 29,
      y: 58,
      spriteUrl: "/game-assets/overworld/018_youngster.png",
      dialogue:
        "Youngster: Vim com alguns amigos capturar Pokémon Bug. Eles estão loucos para batalhar!",
    },
    {
      id: "viridian-forest-boy",
      mapId: "viridian-forest",
      label: "Garoto",
      x: 45,
      y: 58,
      spriteUrl: "/game-assets/overworld/019_boy.png",
      dialogue:
        "Garoto: Eu estava jogando Poké Balls para capturar Pokémon e elas acabaram. Nunca é demais carregar algumas.",
    },
    {
      id: "forest-south-gate-woman",
      mapId: "route-2-forest-south-entrance",
      label: "Mulher",
      x: 10,
      y: 6,
      spriteUrl: "/game-assets/overworld/028_woman_2.png",
      dialogue:
        "Mulher: Vai entrar na Viridian Forest? Lá dentro é um labirinto natural. Cuidado para não se perder.",
    },
    {
      id: "forest-south-gate-woman-rattata",
      mapId: "route-2-forest-south-entrance",
      label: "Mulher",
      x: 4,
      y: 7,
      spriteUrl: "/game-assets/overworld/023_woman_1.png",
      dialogue:
        "Mulher: Rattata pode ser pequeno, mas não subestime a mordida dele. Você já capturou um?",
    },
    {
      id: "forest-north-gate-youngster",
      mapId: "route-2-forest-north-entrance",
      label: "Youngster",
      x: 5,
      y: 4,
      spriteUrl: "/game-assets/overworld/018_youngster.png",
      dialogue:
        "Youngster: Muitos Pokémon vivem apenas em florestas e cavernas. Procure por toda parte para encontrar espécies diferentes.",
    },
    {
      id: "forest-north-gate-old-man",
      mapId: "route-2-forest-north-entrance",
      label: "Homem",
      x: 4,
      y: 7,
      spriteUrl: "/game-assets/overworld/032_old_man_1.png",
      dialogue:
        "Homem: Viu aquelas árvores finas à beira da estrada? Dizem que um golpe especial de Pokémon consegue cortá-las.",
    },
    {
      id: "forest-north-gate-cooltrainer",
      mapId: "route-2-forest-north-entrance",
      label: "Treinadora",
      x: 10,
      y: 5,
      spriteUrl: "/game-assets/overworld/042_cooltrainer_f.png",
      dialogue:
        "Treinadora: Você conhece a técnica de cancelar evolução? É uma forma de treinar um Pokémon mantendo a forma atual.",
    },
  ];

export function resolveOverworldDialogues(
  mapId: string,
): OverworldDialogueDefinition[] {
  return OVERWORLD_DIALOGUES.filter(
    (dialogue) => dialogue.mapId === mapId,
  );
}

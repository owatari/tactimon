export type OverworldDialogueDefinition = {
  id: string;
  mapId: string;
  label: string;
  x: number;
  y: number;
  spriteUrl: string;
  dialogueId: string;
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
      dialogueId: "route4-woman",
    },
    {
      id: "route4-boy",
      mapId: "route-4",
      label: "Garoto",
      x: 15,
      y: 14,
      spriteUrl: "/game-assets/overworld/019_boy.png",
      dialogueId: "route4-boy",
    },
    {
      id: "cerulean-house2-hiker",
      mapId: "cerulean-house2",
      label: "Morador",
      x: 1,
      y: 2,
      spriteUrl: "/game-assets/overworld/056_hiker.png",
      dialogueId: "cerulean-house2-hiker",
    },
    {
      id: "cerulean-house2-lass",
      mapId: "cerulean-house2",
      label: "Garota",
      x: 7,
      y: 6,
      spriteUrl: "/game-assets/overworld/022_lass.png",
      dialogueId: "cerulean-house2-lass",
    },
    {
      id: "pewter-gym-guy",
      mapId: "pewter-gym",
      label: "Gym Guide",
      x: 7,
      y: 12,
      spriteUrl: "/game-assets/overworld/091_gym_guy.png",
      dialogueId: "pewter-gym-guy",
    },
    {
      id: "cerulean-gym-guy",
      mapId: "cerulean-gym",
      label: "Gym Guide",
      x: 7,
      y: 16,
      spriteUrl: "/game-assets/overworld/091_gym_guy.png",
      dialogueId: "cerulean-gym-guy",
    },
    {
      id: "vermilion-gym-guy",
      mapId: "vermilion-gym",
      label: "Gym Guide",
      x: 4,
      y: 17,
      spriteUrl: "/game-assets/overworld/091_gym_guy.png",
      dialogueId: "vermilion-gym-guy",
    },
    {
      id: "viridian-forest-youngster",
      mapId: "viridian-forest",
      label: "Youngster",
      x: 29,
      y: 58,
      spriteUrl: "/game-assets/overworld/018_youngster.png",
      dialogueId: "viridian-forest-youngster",
    },
    {
      id: "viridian-forest-boy",
      mapId: "viridian-forest",
      label: "Garoto",
      x: 45,
      y: 58,
      spriteUrl: "/game-assets/overworld/019_boy.png",
      dialogueId: "viridian-forest-boy",
    },
    {
      id: "forest-south-gate-woman",
      mapId: "route-2-forest-south-entrance",
      label: "Mulher",
      x: 10,
      y: 6,
      spriteUrl: "/game-assets/overworld/028_woman_2.png",
      dialogueId: "forest-south-gate-woman",
    },
    {
      id: "forest-south-gate-woman-rattata",
      mapId: "route-2-forest-south-entrance",
      label: "Mulher",
      x: 4,
      y: 7,
      spriteUrl: "/game-assets/overworld/023_woman_1.png",
      dialogueId: "forest-south-gate-woman-rattata",
    },
    {
      id: "forest-north-gate-youngster",
      mapId: "route-2-forest-north-entrance",
      label: "Youngster",
      x: 5,
      y: 4,
      spriteUrl: "/game-assets/overworld/018_youngster.png",
      dialogueId: "forest-north-gate-youngster",
    },
    {
      id: "forest-north-gate-old-man",
      mapId: "route-2-forest-north-entrance",
      label: "Homem",
      x: 4,
      y: 7,
      spriteUrl: "/game-assets/overworld/032_old_man_1.png",
      dialogueId: "forest-north-gate-old-man",
    },
    {
      id: "forest-north-gate-cooltrainer",
      mapId: "route-2-forest-north-entrance",
      label: "Treinadora",
      x: 10,
      y: 5,
      spriteUrl: "/game-assets/overworld/042_cooltrainer_f.png",
      dialogueId: "forest-north-gate-cooltrainer",
    },
  ];

export function resolveOverworldDialogues(
  mapId: string,
): OverworldDialogueDefinition[] {
  return OVERWORLD_DIALOGUES.filter(
    (dialogue) => dialogue.mapId === mapId,
  );
}

import {
  hasStoryBadge,
  hasStoryFieldTechnique,
  type StoryBadgeId,
  type StoryFieldTechniqueId,
  type StoryState,
} from "./story";

/** FireRed gates every field HM behind a gym badge. */
export const FIELD_TECHNIQUE_BADGE: Record<
  StoryFieldTechniqueId,
  StoryBadgeId
> = {
  cut: "cascade",
  fly: "thunder",
  surf: "soul",
  strength: "rainbow",
  flash: "boulder",
};

export const FIELD_TECHNIQUE_LABEL: Record<
  StoryFieldTechniqueId,
  string
> = {
  cut: "Cut",
  fly: "Fly",
  surf: "Surf",
  strength: "Strength",
  flash: "Flash",
};

export const FIELD_TECHNIQUE_BADGE_LABEL: Record<
  StoryBadgeId,
  string
> = {
  boulder: "Boulder Badge",
  cascade: "Cascade Badge",
  thunder: "Thunder Badge",
  rainbow: "Rainbow Badge",
  soul: "Soul Badge",
  marsh: "Marsh Badge",
  volcano: "Volcano Badge",
  earth: "Earth Badge",
};

export function canStoryUseTechnique(
  story: StoryState,
  technique: StoryFieldTechniqueId,
): boolean {
  return (
    hasStoryFieldTechnique(story, technique) &&
    hasStoryBadge(story, FIELD_TECHNIQUE_BADGE[technique])
  );
}

export const canStoryUseStrength = (story: StoryState) =>
  canStoryUseTechnique(story, "strength");
export const canStoryUseFlash = (story: StoryState) =>
  canStoryUseTechnique(story, "flash");
export const canStoryUseFly = (story: StoryState) =>
  canStoryUseTechnique(story, "fly");

/** Message when the player owns the HM but lacks the badge (or the HM). */
export function techniqueBlockedMessage(
  story: StoryState,
  technique: StoryFieldTechniqueId,
): string | null {
  const name = FIELD_TECHNIQUE_LABEL[technique];
  if (!hasStoryFieldTechnique(story, technique)) {
    return null;
  }
  if (!hasStoryBadge(story, FIELD_TECHNIQUE_BADGE[technique])) {
    return `Você precisa da ${FIELD_TECHNIQUE_BADGE_LABEL[FIELD_TECHNIQUE_BADGE[technique]]} para usar ${name}.`;
  }
  return null;
}

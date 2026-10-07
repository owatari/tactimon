import { tx } from "./i18n";
import type { StoryState } from "./story";
import { hasPokedex, hasStoryBadge, hasStoryKeyItem, isStoryTrainerDefeated } from "./story";

/**
 * Event NPCs (task 042): ROM objects that carry a "hide flag" (`flag_id`). FireRed shows such an NPC
 * while its flag is clear, so each flag here maps to the story condition under which the NPC is on
 * the map. Their lines come from the ROM scripts (English; the dialogue runner translates them
 * with `lib/i18n/catalog/event-npcs.ts`), keyed by the ROM tile `mapId:x,y`.
 *
 * Not rendered on purpose (the feature does not exist in this game): link-cable attendants
 * (`RED_NORMAL`, flags 157-160/174), the Sevii Islands ferry and Bill's departure (flags 98, 107, 162),
 * and the Indigo Plateau exterior scene (163/164). Everything else with a flag is either here, an
 * authored trainer / quest object, or a scripted scene in `OverworldGame`.
 */

const SILPH_BOSS = "silph-co-11f-giovanni";
const HIDEOUT_BOSS = "rocket-hideout-b-4f-giovanni";

export const silphCleared = (story: StoryState) => isStoryTrainerDefeated(story, SILPH_BOSS);
export const hideoutCleared = (story: StoryState) => isStoryTrainerDefeated(story, HIDEOUT_BOSS);
export const isChampion = (story: StoryState) =>
  story.defeatedTrainerIds.some((id) => id.startsWith("league-champion-blue"));
/** The Fan Club chairman has spoken (he hands over the Bike Voucher): the members take their seats. */
export const fanClubSeated = (story: StoryState) =>
  hasStoryKeyItem(story, "bike-voucher") || hasStoryKeyItem(story, "bicycle");

/** ROM hide flag -> "the NPC is on the map" (flag clear in FireRed). */
export const EVENT_NPC_FLAG_VISIBLE: Readonly<Record<number, (story: StoryState) => boolean>> = {
  62: (story) => !silphCleared(story), // Team Rocket occupies Saffron
  63: silphCleared, // the citizens are back (and Silph's receptionist)
  95: (story) => !hideoutCleared(story), // Celadon's Rockets and the robbed scientist
  92: (story) => !isChampion(story), // the guard of Cerulean Cave
  161: hasPokedex, // Oak's aide in Vermilion
  80: (story) => !hasStoryBadge(story, "boulder"), // Pewter's museum man
  46: (story) => !hasStoryBadge(story, "boulder"), // Pewter's guide boy
  157: isChampion, // post-game gossip
  108: fanClubSeated,
  109: fanClubSeated,
  110: fanClubSeated,
  111: fanClubSeated,
};

/** Flags whose NPCs are handled elsewhere (authored objects, trainers, scenes) or not in the game. */
export const EVENT_NPC_FLAGS_ELSEWHERE: readonly number[] = [
  43, 44, 45, 57, 58, // Oak's Lab and Pallet (authored lab + Oak's intercept scene)
  49, 56, 59, 60, 61, 78, 79, 81, 83, 85, 94, 131, 132, 173, // trainers and rival scenes
  50, 51, 52, 53, // Bill and Mr. Fuji (authored quest objects)
  84, 128, 129, 130, 93, // Snorlax / legendary one-off battles
  90, // Oak at the Hall of Fame (scene)
  146, // Oak's aide with the Running Shoes (scene)
  98, 107, 162, 163, 164, // Sevii ferry / Bill departure / Indigo exterior: not in this game
  158, 159, 160, 174, // link-cable attendants
  91, // Celadon Game Corner's guard (the hideout poster is authored)
];

/** What an event NPC says, by the ROM tile of the object. */
export const EVENT_NPC_TEXT: Readonly<Record<string, readonly string[]>> = {
  // Saffron: Team Rocket's guards.
  "saffron-city:22,15": [tx("What do you want? Get lost!")],
  "saffron-city:26,16": [tx("BOSS said he'll take this town in the name of TEAM ROCKET!")],
  "saffron-city:46,13": [tx("Don't get defiant! Or I'll have to hurt you!")],
  "saffron-city:27,22": [tx("SAFFRON belongs to TEAM ROCKET!")],
  "saffron-city:25,33": [tx("My life as a criminal makes me feel so alive!")],
  "saffron-city:34,31": [tx("I'm a security guard. Suspicious kids I don't allow in!")],
  "saffron-city:30,39": [
    tx("With SILPH under control, we can exploit POKéMON around the world!"),
    tx("We'll get stinking rich, yeahah!"),
  ],
  "saffron-city:48,24": [tx("Ow! Watch where you're walking!")],
  // Saffron: the citizens once Silph Co. is free.
  "saffron-city:37,32": [tx("Yeah! TEAM ROCKET is gone! It's safe to go out again!")],
  "saffron-city:21,23": [tx("You beat TEAM ROCKET all alone? That's amazing!")],
  "saffron-city:39,16": [tx("I saw the ROCKET BOSS escaping SILPH's building.")],
  "saffron-city:44,22": [
    tx("I flew here on my PIDGEOT when I read about SILPH."),
    tx("It's already over? I missed the media action…"),
  ],
  "saffron-city:45,22": [tx("PIDGEOT: Bi bibii!")],
  "saffron-city:32,39": [
    tx("People fled from here in droves when those ROCKETS came."),
    tx("They should be flocking back to SAFFRON now."),
  ],
  "silph-co-1f:3,7": [tx("Welcome."), tx("The PRESIDENT is in the boardroom on 11F.")],
  // Celadon.
  "celadon-city:48,15": [tx("Keep out of TEAM ROCKET's way!")],
  "celadon-city:38,31": [tx("What are you staring at? Get lost, or I'll punch you.")],
  "celadon-city:47,24": [
    tx("Oh, what am I to do…"),
    tx("Someone stole our SILPH SCOPE."),
    tx("The thief came running this way, I'm sure of it."),
    tx("But I lost sight of him! Where'd he go?"),
  ],
  // Cerulean Cave's guard and Oak's aide in Vermilion.
  "cerulean-city:1,13": [
    tx("This is CERULEAN CAVE."),
    tx("Horribly strong POKéMON live inside there."),
    tx("It takes a very special TRAINER to be allowed inside there."),
    tx("You'd have to be strong enough to become the POKéMON LEAGUE CHAMPION for starters."),
  ],
  "vermilion-city:25,7": [
    tx("Oh, hello! How are you doing?"),
    tx("It's me, one of PROF. OAK's AIDES."),
    tx("Did you meet the other AIDE? He had a package from PROF. OAK for you."),
    tx("He said he'd look for you around ROUTE 2."),
  ],
  // Pewter City.
  "pewter-city:33,17": [tx("Did you check out the MUSEUM?")],
  "pewter-city:42,20": [
    tx("You're a TRAINER, right?"),
    tx("BROCK's looking for new challengers. Follow me!"),
  ],
  // Post-game gossip (visible once you are the Champion).
  "celadon-city-department-store-2f:11,6": [
    tx("We have a customer, LANCE, who occasionally comes."),
    tx("He always buys capes."),
    tx("I wonder… Does he have many identical capes at home?"),
  ],
  "fuchsia-city:40,6": [
    tx("My father is the GYM LEADER of this town."),
    tx("I'm training to use POISON POKéMON as well as my father."),
  ],
  "indigo-plateau-pokemon-center-1f:23,13": [
    tx("AGATHA's GHOST-type POKéMON are horrifically terrifying in toughness."),
    tx("I took my FIGHTING-type POKéMON and raised them to the max."),
    tx("I went at AGATHA feeling pretty confident, but she whupped us."),
  ],
  "indigo-plateau-pokemon-center-1f:16,15": [
    tx("Maybe becoming an ELITE FOUR member is in the blood."),
    tx("From what I've heard, LANCE has a cousin who's a GYM LEADER somewhere far away."),
  ],
  "lavender-town-pokemon-center-1f:14,6": [
    tx("I recently moved to this town."),
    tx("I hear that MR. FUJI's not from these parts originally, either."),
  ],
  "saffron-city:47,24": [
    tx("This FAN CLUB… No one here has a clue!"),
    tx("How could they not recognize the brilliance that is LANCE?"),
    tx("He stands for justice! He's cool, and yet passionate! He's the greatest, LANCE!"),
  ],
  // Saffron Fan Club members (they take their seats after the chairman's talk).
  "saffron-city-pokemon-trainer-fan-club:9,11": [
    tx("Oh, my goodness! Is it really you? I have to tell you, I adore the way you battle."),
    tx("I hope you'll keep at it. I'll be your number one fan!"),
  ],
  "saffron-city-pokemon-trainer-fan-club:7,12": [
    tx("Oh, man, oh, man! Cool! Too cool!"),
    tx("Huh? No, not you. Just the way you battle. That's cool."),
  ],
  "saffron-city-pokemon-trainer-fan-club:9,12": [
    tx("Amazing! You really are amazing!"),
    tx("Instead of just watching, maybe I should become a TRAINER, too."),
  ],
  "saffron-city-pokemon-trainer-fan-club:5,11": [
    tx("Hiyah! Your battling style is most educational."),
    tx("I hope that you will keep plugging away at success, hiyah!"),
  ],
};

/** Trainers FireRed hides with a group flag: Silph Co.'s Rockets vanish once the boss is beaten. */
export function trainerHiddenByStory(mapId: string, story: StoryState): boolean {
  return mapId.startsWith("silph-co-") && silphCleared(story);
}

export function eventNpcPages(mapId: string, x: number, y: number): readonly string[] | null {
  return EVENT_NPC_TEXT[`${mapId}:${x},${y}`] ?? null;
}

/** True when this flagged ROM object is an event NPC the game shows right now. */
export function isEventNpcVisible(flag: number, story: StoryState): boolean {
  const rule = EVENT_NPC_FLAG_VISIBLE[flag];
  return rule ? rule(story) : false;
}

/** Changes whenever the set of visible event NPCs of a map changes (to rebuild the map's NPCs). */
export function eventNpcSignature(flags: readonly number[], story: StoryState): string {
  return [...new Set(flags)]
    .filter((flag) => EVENT_NPC_FLAG_VISIBLE[flag])
    .sort((a, b) => a - b)
    .map((flag) => `${flag}:${EVENT_NPC_FLAG_VISIBLE[flag](story) ? 1 : 0}`)
    .join(",");
}

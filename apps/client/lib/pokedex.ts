import type { StoryState } from "./story";
import { POKEDEX_ENTRIES } from "./generated/pokedexEntries";

/** Kanto Pokédex (national numbers 1–151) as kebab-case species ids. */
export const POKEDEX_SPECIES: readonly string[] = (
  "bulbasaur ivysaur venusaur charmander charmeleon charizard squirtle wartortle blastoise caterpie metapod butterfree weedle kakuna beedrill pidgey pidgeotto pidgeot rattata raticate spearow fearow ekans arbok pikachu raichu sandshrew sandslash nidoran-f nidorina nidoqueen nidoran-m nidorino nidoking clefairy clefable vulpix ninetales jigglypuff wigglytuff zubat golbat oddish gloom vileplume paras parasect venonat venomoth diglett dugtrio meowth persian psyduck golduck mankey primeape growlithe arcanine poliwag poliwhirl poliwrath abra kadabra alakazam machop machoke machamp bellsprout weepinbell victreebel tentacool tentacruel geodude graveler golem ponyta rapidash slowpoke slowbro magnemite magneton farfetchd doduo dodrio seel dewgong grimer muk shellder cloyster gastly haunter gengar onix drowzee hypno krabby kingler voltorb electrode exeggcute exeggutor cubone marowak hitmonlee hitmonchan lickitung koffing weezing rhyhorn rhydon chansey tangela kangaskhan horsea seadra goldeen seaking staryu starmie mr-mime scyther jynx electabuzz magmar pinsir tauros magikarp gyarados lapras ditto eevee vaporeon jolteon flareon porygon omanyte omastar kabuto kabutops aerodactyl snorlax articuno zapdos moltres dratini dragonair dragonite mewtwo mew"
).split(" ");

export type PokedexData = {
  seen: string[];
  caught: string[];
};

export type PokedexStatus = "unseen" | "seen" | "caught";

export type PokedexEntry = {
  number: number;
  id: string;
  status: PokedexStatus;
};

const KNOWN = new Set(POKEDEX_SPECIES);

function normalizeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (id): id is string =>
          typeof id === "string" && KNOWN.has(id),
      ),
    ),
  );
}

export function normalizePokedex(value: unknown): PokedexData {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<PokedexData>)
      : {};

  return {
    seen: normalizeIdList(candidate.seen),
    caught: normalizeIdList(candidate.caught),
  };
}

export function markPokedexSeen(
  story: StoryState,
  species: readonly string[],
): StoryState {
  const dex = story.pokedex ?? { seen: [], caught: [] };
  const fresh = species.filter(
    (id) => KNOWN.has(id) && !dex.seen.includes(id),
  );
  const unique = Array.from(new Set(fresh));

  return unique.length === 0
    ? story
    : {
        ...story,
        pokedex: { ...dex, seen: [...dex.seen, ...unique] },
      };
}

function ownedSpecies(story: StoryState): string[] {
  const owned: string[] = [];
  if (story.playerPokemon) {
    owned.push(story.playerPokemon.species);
  }
  for (const pokemon of [
    ...story.capturedPokemon,
    ...story.boxedPokemon,
  ]) {
    owned.push(pokemon.species);
  }
  return owned;
}

export function getPokedex(story: StoryState): {
  entries: PokedexEntry[];
  seenCount: number;
  caughtCount: number;
} {
  const stored = story.pokedex ?? { seen: [], caught: [] };
  const caught = new Set([
    ...stored.caught,
    ...ownedSpecies(story),
  ]);
  const seen = new Set([...stored.seen, ...caught]);

  const entries = POKEDEX_SPECIES.map((id, index) => ({
    number: index + 1,
    id,
    status: caught.has(id)
      ? ("caught" as const)
      : seen.has(id)
        ? ("seen" as const)
        : ("unseen" as const),
  }));

  return {
    entries,
    seenCount: entries.filter((e) => e.status !== "unseen").length,
    caughtCount: entries.filter((e) => e.status === "caught")
      .length,
  };
}

export function pokedexDisplayName(id: string): string {
  return id
    .split("-")
    .map((part) =>
      part === "f"
        ? "♀"
        : part === "m"
          ? "♂"
          : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(id.startsWith("nidoran") ? "" : " ")
    .toUpperCase();
}

/** FireRed Pokedex height: decimetres -> F'II". */
export function pokedexHeight(decimetres: number): string {
  const inches = Math.round(decimetres * 3.937);
  return `${Math.floor(inches / 12)}'${String(inches % 12).padStart(2, "0")}"`;
}

/** FireRed Pokedex weight: hectograms -> NNN.N lbs. */
export function pokedexWeight(hectograms: number): string {
  return `${(hectograms * 0.22046).toFixed(1)} lbs.`;
}

/** FireRed front sprite URL for a Kanto species, or null when there is none. */
export function pokedexFrontSpriteUrl(id: string): string | null {
  const file = POKEDEX_ENTRIES[id]?.sprite;
  return file ? `/game-assets/firered/pokemon/front/normal/${file}` : null;
}

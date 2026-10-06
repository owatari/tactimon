/**
 * FireRed Kanto Pokédex navigation (src/pokedex_screen.c): table of contents, ordered lists,
 * habitat category pages, Pokémon page and area page, as a pure state machine driven by
 * D-pad / A / B / Start / L / R.
 */
import { POKEDEX_CATEGORIES, POKEDEX_ORDERS } from "../generated/pokedexOrders";
import { moveList, selectedIndex, type ListState } from "./listMenu";

export type DexFlags = { seen: boolean; caught: boolean };
export type DexContext = {
  /** Index = national dex number - 1 (1..151). */
  flags: readonly DexFlags[];
};

export type DexKey = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "l" | "r";
export type DexOrderId = "numerical" | "atoz" | "type" | "lightest" | "smallest";

export const KANTO_COUNT = 151;
export const TOP_MAX_SHOWED = 9;
export const ORDER_MAX_SHOWED = 9;

export type DexMenuEntry =
  | { kind: "header"; label: string }
  | { kind: "order"; label: string; order: DexOrderId; icon: string }
  | { kind: "category"; label: string; category: number; icon: string }
  | { kind: "close"; label: string; icon: string };

/** sListMenuItems_KantoDexModeSelect */
export const DEX_MENU: readonly DexMenuEntry[] = [
  { kind: "header", label: "POKéMON LIST" },
  { kind: "order", label: "NUMERICAL MODE", order: "numerical", icon: "pokedex/cat_icon_numerical" },
  { kind: "header", label: "POKéMON HABITATS" },
  { kind: "category", label: "Grassland POKéMON", category: 0, icon: "pokedex/cat_icon_grassland" },
  { kind: "category", label: "Forest POKéMON", category: 1, icon: "pokedex/cat_icon_forest" },
  { kind: "category", label: "Water's-edge POKéMON", category: 2, icon: "pokedex/cat_icon_waters_edge" },
  { kind: "category", label: "Sea POKéMON", category: 3, icon: "pokedex/cat_icon_sea" },
  { kind: "category", label: "Cave POKéMON", category: 4, icon: "pokedex/cat_icon_cave" },
  { kind: "category", label: "Mountain POKéMON", category: 5, icon: "pokedex/cat_icon_mountain" },
  { kind: "category", label: "Rough-terrain POKéMON", category: 6, icon: "pokedex/cat_icon_rough_terrain" },
  { kind: "category", label: "Urban POKéMON", category: 7, icon: "pokedex/cat_icon_urban" },
  { kind: "category", label: "Rare POKéMON", category: 8, icon: "pokedex/cat_icon_rare" },
  { kind: "header", label: "SEARCH" },
  { kind: "order", label: "A TO Z MODE", order: "atoz", icon: "pokedex/cat_icon_abc" },
  { kind: "order", label: "TYPE MODE", order: "type", icon: "pokedex/cat_icon_type" },
  { kind: "order", label: "LIGHTEST MODE", order: "lightest", icon: "pokedex/cat_icon_lightest" },
  { kind: "order", label: "SMALLEST MODE", order: "smallest", icon: "pokedex/cat_icon_smallest" },
  { kind: "header", label: "OTHER" },
  { kind: "close", label: "CLOSE POKéDEX", icon: "pokedex/cat_icon_cancel" },
];

export const CATEGORY_NAMES = DEX_MENU.filter((e) => e.kind === "category").map((e) => e.label);

export const DEX_MENU_CONFIG = {
  maxShowed: TOP_MAX_SHOWED,
  totalItems: DEX_MENU.length,
  isHeader: (i: number) => DEX_MENU[i]?.kind === "header",
};

export type TopState = { screen: "top"; list: ListState };
export type OrderState = { screen: "order"; order: DexOrderId; list: ListState };
export type CategoryState = {
  screen: "category";
  category: number;
  /** Index into the category's pages (including locked ones). */
  pageNum: number;
  /** Cursor slot inside the page's seen species. */
  cursor: number;
  /** Menu the player came from: B returns there. */
  parent: TopState | OrderState;
};
export type PageState = {
  screen: "page";
  from: OrderState | CategoryState;
  species: number;
};
export type AreaState = { screen: "area"; page: PageState };
export type DexState = TopState | OrderState | CategoryState | PageState | AreaState;

export function initialDexState(): TopState {
  // modeSelectItemsAbove = 1: the cursor starts on "NUMERICAL MODE".
  return { screen: "top", list: { cursorPos: 0, itemsAbove: 1 } };
}

const flag = (ctx: DexContext, dex: number): DexFlags => ctx.flags[dex - 1] ?? { seen: false, caught: false };
const isSeen = (ctx: DexContext, dex: number): boolean => flag(ctx, dex).seen || flag(ctx, dex).caught;

export function countSeen(ctx: DexContext): number {
  return ctx.flags.filter((f) => f.seen || f.caught).length;
}
export function countOwned(ctx: DexContext): number {
  return ctx.flags.filter((f) => f.caught).length;
}

/** DexScreen_CountMonsInOrderedList: dex numbers shown by each order. */
export function orderedList(order: DexOrderId, ctx: DexContext): number[] {
  switch (order) {
    case "numerical":
      return Array.from({ length: KANTO_COUNT }, (_, i) => i + 1);
    case "atoz":
      return POKEDEX_ORDERS.alphabetical.filter((n) => isSeen(ctx, n));
    case "type":
      return POKEDEX_ORDERS.type.filter((n) => flag(ctx, n).caught);
    case "lightest":
      return POKEDEX_ORDERS.weight.filter((n) => flag(ctx, n).caught);
    case "smallest":
      return POKEDEX_ORDERS.height.filter((n) => flag(ctx, n).caught);
  }
}

export function orderConfig(list: readonly number[]) {
  return { maxShowed: ORDER_MAX_SHOWED, totalItems: list.length };
}

// ------------------------------------------------------------ habitat pages

/** DexScreen_IsPageUnlocked / IsCategoryUnlocked (Kanto species only). */
export function isPageUnlocked(category: number, pageNum: number, ctx: DexContext): boolean {
  const page = POKEDEX_CATEGORIES[category]?.pages[pageNum] ?? [];
  return page.some((n) => isSeen(ctx, n));
}
export function isCategoryUnlocked(category: number, ctx: DexContext): boolean {
  return (POKEDEX_CATEGORIES[category]?.pages ?? []).some((_, i) => isPageUnlocked(category, i, ctx));
}
/** Seen species on a page, in order (DexScreen_CreateCategoryPageSpeciesList). */
export function categoryPageSpecies(category: number, pageNum: number, ctx: DexContext): number[] {
  return (POKEDEX_CATEGORIES[category]?.pages[pageNum] ?? []).filter((n) => isSeen(ctx, n));
}
export function unlockedPages(category: number, ctx: DexContext): number[] {
  return (POKEDEX_CATEGORIES[category]?.pages ?? []).map((_, i) => i).filter((i) => isPageUnlocked(category, i, ctx));
}
/** DexScreen_PageNumberToRenderablePages: 1-based number among unlocked pages. */
export function renderablePageNumber(category: number, pageNum: number, ctx: DexContext): number {
  return unlockedPages(category, ctx).filter((i) => i < pageNum).length + 1;
}
export function renderablePageCount(category: number, ctx: DexContext): number {
  return unlockedPages(category, ctx).length;
}

/** DexScreen_LookUpCategoryBySpecies: first habitat page holding the species. */
export function lookUpCategoryBySpecies(
  dex: number,
  ctx: DexContext,
): { category: number; pageNum: number; cursor: number } | null {
  for (let c = 0; c < POKEDEX_CATEGORIES.length; c += 1) {
    const pages = POKEDEX_CATEGORIES[c].pages;
    for (let p = 0; p < pages.length; p += 1) {
      let pos = 0;
      for (const n of pages[p]) {
        if (n === dex) return { category: c, pageNum: p, cursor: pos };
        if (isSeen(ctx, n)) pos += 1;
      }
    }
  }
  return null;
}

export type DexStep = { state: DexState; cry?: number; close?: boolean };

/** DexScreen_TryScrollMonsVertical: next/previous seen species in the current order, re-centring the list. */
function scrollMon(from: OrderState, up: boolean, ctx: DexContext): { list: ListState; species: number } | null {
  const items = orderedList(from.order, ctx);
  let idx = selectedIndex(from.list);
  if (up) {
    if (idx === 0) return null;
    idx -= 1;
    while (idx >= 0 && !isSeen(ctx, items[idx])) idx -= 1;
    if (idx < 0) return null;
  } else {
    if (idx === items.length - 1) return null;
    idx += 1;
    while (idx < items.length && !isSeen(ctx, items[idx])) idx += 1;
    if (idx >= items.length) return null;
  }
  const total = items.length;
  let list: ListState;
  if (total > 9) {
    if (idx < 4) list = { cursorPos: 0, itemsAbove: idx };
    else if (idx >= total - 4) list = { cursorPos: total - 9, itemsAbove: idx + 9 - total };
    else list = { cursorPos: idx - 4, itemsAbove: 4 };
  } else list = { cursorPos: 0, itemsAbove: idx };
  return { list, species: items[idx] };
}

/** Mode-select cursor position that DestroyListMenuTask keeps while a submenu is open. */
function topListAt(idx: number): ListState {
  const max = DEX_MENU.length - TOP_MAX_SHOWED;
  const first = Math.max(0, Math.min(max, idx - 4));
  return { cursorPos: first, itemsAbove: idx - first };
}

function stepCategory(state: CategoryState, key: DexKey, ctx: DexContext): DexStep {
  const pages = unlockedPages(state.category, ctx);
  if (!pages.length) return { state: state.parent };
  const species = categoryPageSpecies(state.category, state.pageNum, ctx);

  if (key === "b") return { state: state.parent };
  if (key === "a") {
    const dex = species[state.cursor];
    if (dex !== undefined) return { state: { screen: "page", from: state, species: dex }, cry: dex };
    return { state };
  }

  let flip = 0;
  if (key === "left") {
    if (state.cursor > 0) return { state: { ...state, cursor: state.cursor - 1 } };
    flip = -1;
  } else if (key === "right") {
    if (state.cursor < species.length - 1) return { state: { ...state, cursor: state.cursor + 1 } };
    flip = 1;
  } else if (key === "l") flip = -1;
  else if (key === "r") flip = 1;
  if (!flip) return { state };

  // Turning the page lands on the last (left) / first (right) mon of the neighbouring unlocked page;
  // with no neighbouring page the game leaves the habitat menu instead.
  const candidates = pages.filter((p) => (flip < 0 ? p < state.pageNum : p > state.pageNum));
  if (!candidates.length) return { state: state.parent };
  const next = flip < 0 ? candidates[candidates.length - 1] : candidates[0];
  const count = categoryPageSpecies(state.category, next, ctx).length;
  return { state: { ...state, pageNum: next, cursor: flip < 0 ? Math.max(0, count - 1) : 0 } };
}

export function stepDex(state: DexState, key: DexKey, ctx: DexContext): DexStep {
  switch (state.screen) {
    case "top": {
      if (key === "up" || key === "down") {
        return { state: { screen: "top", list: moveList(state.list, DEX_MENU_CONFIG, 1, key === "down") } };
      }
      if (key === "b") return { state, close: true };
      if (key !== "a") return { state };
      const entry = DEX_MENU[selectedIndex(state.list)];
      if (entry.kind === "close") return { state, close: true };
      if (entry.kind === "order") {
        return { state: { screen: "order", order: entry.order, list: { cursorPos: 0, itemsAbove: 0 } } };
      }
      if (entry.kind === "category" && isCategoryUnlocked(entry.category, ctx)) {
        return {
          state: {
            screen: "category",
            category: entry.category,
            pageNum: unlockedPages(entry.category, ctx)[0],
            cursor: 0,
            parent: state,
          },
        };
      }
      return { state };
    }
    case "order": {
      const items = orderedList(state.order, ctx);
      const cfg = orderConfig(items);
      const parent = (): TopState => {
        const idx = DEX_MENU.findIndex((e) => e.kind === "order" && e.order === state.order);
        return { screen: "top", list: topListAt(idx) };
      };
      if (key === "up" || key === "down") {
        return { state: { ...state, list: moveList(state.list, cfg, 1, key === "down") } };
      }
      if (state.order === "numerical" && (key === "left" || key === "right")) {
        return { state: { ...state, list: moveList(state.list, cfg, ORDER_MAX_SHOWED, key === "right") } };
      }
      if (key === "b") return { state: parent() };
      if (key === "a") {
        const dex = items[selectedIndex(state.list)];
        if (dex === undefined || !isSeen(ctx, dex)) return { state };
        if (state.order === "numerical") {
          return { state: { screen: "page", from: state, species: dex }, cry: dex };
        }
        const found = lookUpCategoryBySpecies(dex, ctx);
        if (!found) return { state };
        return { state: { screen: "category", ...found, parent: state } };
      }
      return { state };
    }
    case "category":
      return stepCategory(state, key, ctx);
    case "page": {
      if (key === "start") return { state, cry: state.species };
      if (key === "a") return { state: { screen: "area", page: state } };
      if (key === "b") return { state: state.from };
      if ((key === "up" || key === "down") && state.from.screen === "order") {
        const moved = scrollMon(state.from, key === "up", ctx);
        if (moved) {
          const from: OrderState = { ...state.from, list: moved.list };
          return { state: { screen: "page", from, species: moved.species }, cry: moved.species };
        }
      }
      return { state };
    }
    case "area": {
      if (key === "start") return { state, cry: state.page.species };
      if (key === "a") return { state: state.page.from };
      if (key === "b") return { state: state.page };
      return { state };
    }
  }
}

/**
 * Builds FireRed Pokédex screens (table of contents, ordered lists, Pokémon page) from ROM assets.
 * Layout constants come from src/pokedex_screen.c (window templates, list templates, print calls).
 */
import { DEX_AREA_MARKERS } from "../generated/pokedexAreas";
import { POKEDEX_ENTRIES } from "../generated/pokedexEntries";
import { cachedLoader, loadFont, type GbaByteLoader } from "./assets";
import {
  CATEGORY_NAMES,
  DEX_MENU,
  DEX_MENU_CONFIG,
  categoryPageSpecies,
  countOwned,
  countSeen,
  isCategoryUnlocked,
  orderedList,
  renderablePageCount,
  renderablePageNumber,
  type AreaState,
  type CategoryState,
  type DexContext,
  type DexOrderId,
  type DexState,
  type OrderState,
  type PageState,
  type TopState,
} from "./dex";
import { GbaScreen, bgr555ToRgba, decode4bpp, type GbaFont, type GbaWindow, type TextColors } from "./engine";
import { selectedIndex } from "./listMenu";
import { romLabel } from "./romText";
import { POKEDEX_SPECIES } from "../pokedex";

export type RgbaImage = { w: number; h: number; data: Uint8ClampedArray };

export type DexEnv = {
  load: GbaByteLoader;
  /** Front sprite etc. as RGBA (browser: image decode). Optional so tests can skip sprites. */
  loadImage?: (url: string) => Promise<RgbaImage | null>;
  speciesName: (dex: number) => string;
  /** FireRed type ids (NORMAL 0 ... DARK 17, MYSTERY 9). */
  speciesTypes: (dex: number) => readonly number[];
  frontSpriteUrl: (dex: number) => string | null;
  /** Player trainer front picture (Red) used by the size comparison. */
  trainerSpriteUrl?: () => string | null;
  /** Dex areas (DEX_AREA_*) where the species lives; drives the area markers. */
  speciesAreas?: (dex: number) => readonly string[];
};

type DexAssets = {
  palette: Uint8Array;
  bgTiles: Uint8Array;
  normal: GbaFont;
  small: GbaFont;
  keypad: Uint8Array;
  menuInfo: Uint8Array;
  menuInfoPal: Uint8Array;
  pageIconTilemap: Uint8Array;
  miniPage: Uint8Array;
  caughtMarker: Uint8Array;
  outline: Uint8Array;
  outlinePal: Uint8Array;
};

const assetCache = new WeakMap<GbaByteLoader, Promise<DexAssets>>();

async function loadAssets(rawLoad: GbaByteLoader): Promise<DexAssets> {
  let hit = assetCache.get(rawLoad);
  if (!hit) {
    const load = cachedLoader(rawLoad);
    hit = (async () => {
      const [
        palette,
        bgTiles,
        normal,
        small,
        keypad,
        menuInfo,
        menuInfoPal,
        pageIconTilemap,
        miniPage,
        caughtMarker,
        outline,
        outlinePal,
      ] = await Promise.all([
        load("pokedex/kanto_dex_bgpals.gbapal"),
        load("pokedex/kanto_dex_bgtiles.4bpp"),
        loadFont(load, "normal"),
        loadFont(load, "small"),
        load("fonts/keypad_icons.4bpp"),
        load("interface/menu_info.4bpp"),
        load("interface/menu_info.gbapal"),
        load("pokedex/page_icon_tilemap.bin"),
        load("pokedex/mini_page.4bpp"),
        load("pokedex/caught_marker.4bpp"),
        load("interface/selector_outline.4bpp"),
        load("interface/red_arrow.gbapal"),
      ]);
      return {
        palette,
        bgTiles,
        normal,
        small,
        keypad: decode4bpp(keypad),
        menuInfo: decode4bpp(menuInfo),
        menuInfoPal,
        pageIconTilemap,
        miniPage: decode4bpp(miniPage),
        caughtMarker: decode4bpp(caughtMarker),
        outline: decode4bpp(outline),
        outlinePal,
      };
    })();
    assetCache.set(rawLoad, hit);
  }
  return hit;
}

/** DexScreen_AddTextPrinterParameterized colour sets: {bg, fg, shadow}. */
const COLORS: Record<number, TextColors> = {
  0: { bg: 0, fg: 1, shadow: 3 },
  1: { bg: 0, fg: 5, shadow: 1 },
  2: { bg: 0, fg: 15, shadow: 14 },
  3: { bg: 0, fg: 11, shadow: 1 },
  4: { bg: 0, fg: 1, shadow: 2 },
};

/** sMenuInfoIcons: [tile offset, width, height] in the 128px-wide menu_info sheet. */
const CAUGHT_ICON = { offset: 0x00, w: 12, h: 12 };
const TYPE_ICON_OFFSET: Record<number, number> = {
  0: 0x20, 1: 0x64, 2: 0x60, 3: 0x80, 4: 0x48, 5: 0x44, 6: 0x6c, 7: 0x68, 8: 0x88, 9: 0xa4,
  10: 0x24, 11: 0x28, 12: 0x2c, 13: 0x40, 14: 0x84, 15: 0x4c, 16: 0xa0, 17: 0x8c,
};

function blitMenuIcon(win: GbaWindow, sheet: Uint8Array, icon: { offset: number; w: number; h: number }, x: number, y: number): void {
  win.blitBitmap(sheet, 16, icon.offset, icon.w, icon.h, x, y);
}
function blitTypeIcon(win: GbaWindow, sheet: Uint8Array, type: number, x: number, y: number): void {
  blitMenuIcon(win, sheet, { offset: TYPE_ICON_OFFSET[type] ?? 0xa4, w: 32, h: 12 }, x, y);
}

function newBase(a: DexAssets): GbaScreen {
  const screen = new GbaScreen();
  screen.fonts = { normal: a.normal, small: a.small };
  screen.keypad = a.keypad;
  screen.palette.load(a.palette, 0);
  screen.bgs[3].loadTiles(a.bgTiles);
  return screen;
}

function addBars(screen: GbaScreen) {
  const header = screen.addWindow({ bg: 0, left: 0, top: 0, width: 30, height: 2, paletteNum: 15 });
  const footer = screen.addWindow({ bg: 0, left: 0, top: 18, width: 30, height: 2, paletteNum: 15 });
  header.fill(15);
  footer.fill(15);
  return { header, footer };
}

/** DexScreen_PrintStringWithAlignment (TEXT_CENTER) on the header window. */
function printHeader(screen: GbaScreen, win: GbaWindow, text: string, mode: "center" | "left" | "right" = "center"): void {
  const w = screen.stringWidth("normal", text, 0);
  const x = mode === "left" ? 8 : mode === "right" ? 232 - w : Math.floor((240 - w) / 2);
  screen.print(win, "normal", text, x, 2, COLORS[4], 1);
}

/** DexScreen_PrintControlInfo: right-aligned small text on the footer window. */
function printControls(screen: GbaScreen, win: GbaWindow, text: string): void {
  screen.print(win, "small", text, 236 - screen.stringWidth("small", text, 0), 2, COLORS[4], 0);
}

function printNum3(screen: GbaScreen, win: GbaWindow, n: number, x: number, y: number, font: "normal" | "small", color: number): void {
  const s = String(n).padStart(3, " ");
  screen.print(win, font, s, x, y, COLORS[color], font === "small" ? 0 : 1);
}

function printDexNo(screen: GbaScreen, win: GbaWindow, dex: number, x: number, y: number, font: "normal" | "small"): void {
  const ls = font === "small" ? 0 : 1;
  screen.print(win, font, "{NO}", x, y, COLORS[0], ls);
  screen.print(win, font, String(dex).padStart(3, "0"), x + 9, y, COLORS[0], ls);
}

// ---------------------------------------------------------------- top menu

const ROW = 14;

async function drawTop(a: DexAssets, state: TopState, ctx: DexContext, env: DexEnv): Promise<GbaScreen> {
  const screen = newBase(a);
  screen.bgs[3].fill(0x00e, 0, 0, 30, 20, 0);
  const { header, footer } = addBars(screen);
  const list = screen.addWindow({ bg: 1, left: 1, top: 2, width: 20, height: 16, paletteNum: 0 });
  const iconWin = screen.addWindow({ bg: 1, left: 21, top: 11, width: 8, height: 6, paletteNum: 1 });
  const counts = screen.addWindow({ bg: 1, left: 21, top: 2, width: 9, height: 9, paletteNum: 0 });

  printHeader(screen, header, romLabel("POKéDEX   TABLE OF CONTENTS"));
  printControls(screen, footer, romLabel("{DPAD_UPDOWN}PICK {A_BUTTON}OK"));

  const first = state.list.cursorPos;
  for (let i = 0; i < DEX_MENU_CONFIG.maxShowed; i += 1) {
    const item = DEX_MENU[first + i];
    if (!item) break;
    const y = i * ROW + 2;
    if (item.kind === "header") {
      screen.print(list, "normal", romLabel(item.label), 0, y, { bg: 0, fg: 15, shadow: 14 }, 1);
    } else {
      const locked = item.kind === "category" && !isCategoryUnlocked(item.category, ctx);
      // ItemPrintFunc_DexModeSelect: locked habitats use the dim dynamic colours 10/11.
      const colors = locked ? { bg: 0, fg: 10, shadow: 11 } : { bg: 0, fg: 1, shadow: 3 };
      screen.print(list, "normal", romLabel(item.label), 12, y, colors, 1);
    }
  }
  screen.print(list, "normal", "▶", 4, state.list.itemsAbove * ROW + 2, { bg: 0, fg: 1, shadow: 3 }, 1);

  screen.print(counts, "normal", romLabel("Seen:"), 0, 9, COLORS[0], 1);
  printNum3(screen, counts, countSeen(ctx), 32, 21, "normal", 2);
  screen.print(counts, "normal", romLabel("Owned:"), 0, 37, COLORS[0], 1);
  printNum3(screen, counts, countOwned(ctx), 32, 49, "normal", 2);

  const entry = DEX_MENU[selectedIndex(state.list)];
  if (entry && entry.kind !== "header") {
    const [tiles, pal] = await Promise.all([env.load(`${entry.icon}.4bpp`), env.load(`${entry.icon}.gbapal`)]);
    screen.palette.load(pal, 16);
    iconWin.blitBitmap(decode4bpp(tiles), 8, 0, 64, 48, 0, 0);
  }
  return screen;
}

// ------------------------------------------------------------- order lists

const ORDER_HEADER: Record<DexOrderId, string> = {
  numerical: "POKéMON LIST",
  atoz: "SEARCH",
  type: "SEARCH",
  lightest: "SEARCH",
  smallest: "SEARCH",
};

function drawOrder(a: DexAssets, state: OrderState, ctx: DexContext, env: DexEnv): GbaScreen {
  const screen = newBase(a);
  screen.bgs[3].fill(0x00e, 0, 0, 30, 20, 0);
  // ListMenuLoadStdPalAt(1, 0) / (2, 1): the two 16-colour banks of menu_info.
  screen.palette.load(a.menuInfoPal.subarray(0, 32), 16);
  screen.palette.load(a.menuInfoPal.subarray(32, 64), 32);
  const { header, footer } = addBars(screen);
  const win = screen.addWindow({ bg: 1, left: 2, top: 2, width: 23, height: 16, paletteNum: 0 });
  // sListMenuRects_OrderedList
  win.setPalRect(5, 0, 2, 16, 1);
  win.setPalRect(15, 0, 8, 16, 2);

  printHeader(screen, header, romLabel(ORDER_HEADER[state.order]));
  printControls(screen, footer, romLabel("{DPAD_UPDOWN}PICK {A_BUTTON}OK {B_BUTTON}CANCEL"));

  const items = orderedList(state.order, ctx);
  for (let i = 0; i < 9; i += 1) {
    const dex = items[state.list.cursorPos + i];
    if (dex === undefined) break;
    const y = i * ROW + 2;
    const f = ctx.flags[dex - 1];
    const seen = Boolean(f?.seen || f?.caught);
    const caught = Boolean(f?.caught);
    printDexNo(screen, win, dex, 12, y, "small");
    if (caught) {
      blitMenuIcon(win, a.menuInfo, CAUGHT_ICON, 0x28, y);
      const types = env.speciesTypes(dex);
      blitTypeIcon(win, a.menuInfo, types[0], 0x78, y);
      if (types[1] !== undefined && types[1] !== types[0]) blitTypeIcon(win, a.menuInfo, types[1], 0x98, y);
    }
    screen.print(win, "normal", seen ? env.speciesName(dex) : "-----", 56, y, { bg: 0, fg: 1, shadow: 3 }, 1);
  }
  screen.print(win, "normal", "▶", 4, state.list.itemsAbove * ROW + 2, { bg: 0, fg: 1, shadow: 3 }, 1);
  return screen;
}

// -------------------------------------------------------------- mon page

/** DexScreen_PrintMonHeight: feet/inches from decimetres with FireRed rounding (leading blanks included). */
export function dexHeightText(decimetres: number): string {
  let inches = Math.floor((10000 * decimetres) / 254); // tenths of inches
  if (inches % 10 >= 5) inches += 10;
  const feet = Math.floor(inches / 120);
  inches = Math.floor((inches - feet * 120) / 10);
  const feetText = feet < 10 ? ` ${feet}` : String(feet);
  return ` ${feetText}’${Math.floor(inches / 10)}${inches % 10}”`;
}

/** DexScreen_PrintMonWeight: hectograms -> pounds, 4 integer digits (blank padded) + one decimal. */
export function dexWeightText(hectograms: number): string {
  let lbs = Math.floor((hectograms * 100000) / 4536); // hundredths of a pound
  if (lbs % 10 >= 5) lbs += 10;
  const digits = [
    Math.floor(lbs / 100000),
    Math.floor((lbs % 100000) / 10000),
    Math.floor((lbs % 10000) / 1000),
    Math.floor((lbs % 1000) / 100),
  ];
  let out = "";
  let started = false;
  digits.forEach((d, i) => {
    if (d !== 0 || started || i === 3) {
      out += String(d);
      started = true;
    } else out += " ";
  });
  return `${out}.${Math.floor((lbs % 100) / 10)}`;
}

function monCategoryText(id: string, caught: boolean): string {
  if (!caught) return "???????????";
  const raw = POKEDEX_ENTRIES[id]?.category ?? "";
  return raw.split(" ")[0].slice(0, 11);
}

async function drawPage(a: DexAssets, page: PageState, ctx: DexContext, env: DexEnv, withArea = false): Promise<GbaScreen> {
  void withArea;
  const screen = newBase(a);
  screen.bgs[3].fill(0x00e, 0, 0, 30, 20, 0);
  const { header, footer } = addBars(screen);
  const pic = screen.addWindow({ bg: 1, left: 19, top: 3, width: 8, height: 8, paletteNum: 9 });
  const stats = screen.addWindow({ bg: 1, left: 2, top: 3, width: 13, height: 8, paletteNum: 0 });
  const flavor = screen.addWindow({ bg: 1, left: 0, top: 11, width: 30, height: 7, paletteNum: 0 });
  const dex = page.species;
  const caught = Boolean(ctx.flags[dex - 1]?.caught);
  const id = POKEDEX_SPECIES[dex - 1];
  const entry = POKEDEX_ENTRIES[id];

  printHeader(screen, header, romLabel("POKéMON LIST"));
  screen.print(footer, "small", romLabel("{START_BUTTON}CRY"), 8, 2, COLORS[4], 0);
  printControls(screen, footer, romLabel("{A_BUTTON}NEXT DATA {B_BUTTON}CANCEL"));

  // Mon pic: ROM front sprite drawn over the (transparent) window.
  const url = env.frontSpriteUrl(dex);
  if (url && env.loadImage) {
    const img = await env.loadImage(url);
    if (img) pic.images.push({ x: 0, y: 0, w: img.w, h: img.h, data: img.data });
  }

  printDexNo(screen, stats, dex, 0, 8, "small");
  screen.print(stats, "normal", env.speciesName(dex), 28, 8, COLORS[0], 1);
  const catText = monCategoryText(id, caught);
  screen.print(stats, "small", catText, 0, 24, COLORS[0], 0);
  screen.print(stats, "small", romLabel(" POKéMON"), screen.stringWidth("small", catText, 0), 24, COLORS[0], 0);
  screen.print(stats, "small", romLabel("HT"), 0, 36, COLORS[0], 0);
  screen.print(stats, "small", caught && entry ? dexHeightText(entry.height) : " ??’??”", 30, 36, COLORS[0], 0, 0, 5);
  screen.print(stats, "small", romLabel("WT"), 0, 48, COLORS[0], 0);
  const wx = screen.print(stats, "small", (caught && entry ? dexWeightText(entry.weight) : "????.?") + " ", 30, 48, COLORS[0], 0, 0, 5);
  screen.print(stats, "small", romLabel("lbs."), wx, 48, COLORS[0], 0);
  if (caught) drawFootprint(stats, await env.load(`pokedex/footprints/${String(dex).padStart(3, "0")}.bin`), 88, 40);

  if (caught && entry) {
    const lines = entry.pages.flat();
    const width = Math.max(...lines.map((l) => screen.stringWidth("normal", l, 0)));
    const x = Math.max(0, Math.floor((240 - width) / 2));
    // The widest line is centred using its raw width, so the text is printed without extra letter spacing.
    screen.print(flavor, "normal", lines.join("\n"), x, 8, { bg: 0, fg: 1, shadow: 2 }, 0);
  }
  return screen;
}

/** DexScreen_DrawMonFootprint: expand the 1bpp 16x16 footprint (4 tiles, LSB first) into a window. */
function drawFootprint(win: GbaWindow, bytes: Uint8Array, x: number, y: number): void {
  for (let t = 0; t < 4; t += 1)
    for (let row = 0; row < 8; row += 1) {
      const b = bytes[t * 8 + row];
      for (let px = 0; px < 8; px += 1)
        if (b & (1 << px)) win.setPixel(x + (t & 1) * 8 + px, y + (t >> 1) * 8 + row, 1);
    }
}

// ------------------------------------------------------- habitat category page

/** sPageIconCoords_*: [icon x, icon y, info x, info y] in tiles, by number of mons on the page. */
const PAGE_ICON_COORDS: readonly (readonly (readonly [number, number, number, number])[])[] = [
  [[11, 3, 11, 11]],
  [
    [3, 3, 11, 3],
    [18, 9, 10, 11],
  ],
  [
    [1, 2, 9, 2],
    [11, 9, 3, 11],
    [21, 3, 21, 11],
  ],
  [
    [0, 2, 6, 3],
    [7, 10, 0, 12],
    [15, 10, 22, 11],
    [22, 2, 15, 4],
  ],
];

/** sDexScreen_CategoryCursorPals: RGB(r,g,b) 5-bit triples packed as BGR555. */
const CURSOR_PALS: readonly number[] = [
  [24, 22, 17],
  [26, 24, 20],
  [26, 20, 15],
  [27, 23, 19],
  [28, 18, 15],
  [28, 22, 19],
  [30, 16, 13],
  [29, 21, 18],
  [28, 18, 15],
  [28, 22, 19],
  [26, 20, 15],
  [27, 23, 19],
].map(([r, g, b]) => r | (g << 5) | (b << 10));

/** Red selector outline (8 tiles: TL TR top left right bottom BL BR) drawn over a w*h rectangle. */
function addOutline(screen: GbaScreen, a: DexAssets, x: number, y: number, w: number, h: number, colour1: number): void {
  const pal = new Uint16Array(16);
  for (let i = 0; i < 16; i += 1) pal[i] = a.outlinePal[i * 2] | (a.outlinePal[i * 2 + 1] << 8);
  pal[1] = colour1;
  const tile = (n: number, dx: number, dy: number, buf: Uint32Array) => {
    for (let ty = 0; ty < 8; ty += 1)
      for (let tx = 0; tx < 8; tx += 1) {
        const v = a.outline[n * 64 + ty * 8 + tx];
        const sx = dx + tx;
        const sy = dy + ty;
        if (v && sx >= 0 && sy >= 0 && sx < 240 && sy < 160) buf[sy * 240 + sx] = bgr555ToRgba(pal[v]);
      }
  };
  screen.overlays.push((buf) => {
    tile(0, x, y, buf);
    tile(1, x + w - 8, y, buf);
    tile(6, x, y + h - 8, buf);
    tile(7, x + w - 8, y + h - 8, buf);
    for (let i = 8; i < w - 8; i += 8) {
      tile(2, x + i, y, buf);
      tile(5, x + i, y + h - 8, buf);
    }
    for (let j = 8; j < h - 8; j += 8) {
      tile(3, x, y + j, buf);
      tile(4, x + w - 8, y + j, buf);
    }
  });
}

async function drawCategory(
  a: DexAssets,
  state: CategoryState,
  ctx: DexContext,
  env: DexEnv,
  tick: number,
): Promise<GbaScreen> {
  const screen = newBase(a);
  screen.bgs[3].fill(2, 0, 0, 30, 20, 0);
  const { header, footer } = addBars(screen);

  printHeader(screen, header, romLabel(CATEGORY_NAMES[state.category]), "left");
  const pageNo = String(renderablePageNumber(state.category, state.pageNum, ctx)).padStart(2, " ");
  const pageCount = String(renderablePageCount(state.category, ctx)).padStart(2, " ");
  printHeader(screen, header, `${romLabel("PAGE")}${pageNo}/${pageCount}`, "right");
  printControls(screen, footer, romLabel("{DPAD_LEFTRIGHT}PICK{PLUS}FLIP PAGE {A_BUTTON}CHECK {B_BUTTON}CANCEL"));

  const species = categoryPageSpecies(state.category, state.pageNum, ctx);
  const coords = PAGE_ICON_COORDS[Math.max(0, species.length - 1)];
  const palIdx = (tick >> 2) & 3;
  for (let slot = 0; slot < species.length; slot += 1) {
    const dex = species[slot];
    const [ix, iy, nx, ny] = coords[slot];
    // Page frame (bg3) in palette bank slot+5 with the cursor colours in entries 2 and 8.
    screen.bgs[3].blitMap(a.pageIconTilemap, 8, 8, ix, iy, slot + 5);
    const selected = slot === state.cursor;
    screen.palette.set((slot + 5) * 16 + 2, CURSOR_PALS[selected ? 2 * palIdx + 2 : 0]);
    screen.palette.set((slot + 5) * 16 + 8, CURSOR_PALS[selected ? 2 * palIdx + 3 : 1]);

    const iconWin = screen.addWindow({ bg: 2, left: ix, top: iy, width: 8, height: 8, paletteNum: slot + 1 });
    const url = env.frontSpriteUrl(dex);
    if (url && env.loadImage) {
      const img = await env.loadImage(url);
      if (img) iconWin.images.push({ x: 0, y: 0, w: img.w, h: img.h, data: img.data });
    }

    const info = screen.addWindow({ bg: 1, left: nx, top: ny, width: 8, height: 5, paletteNum: 0 });
    info.blitBitmap(a.miniPage, 8, 0, 64, 40, 0, 0);
    printDexNo(screen, info, dex, 12, 0, "small");
    screen.print(info, "normal", env.speciesName(dex), 2, 13, COLORS[0], 1);
    if (ctx.flags[dex - 1]?.caught) info.blitBitmap(a.caughtMarker, 1, 0, 8, 8, 2, 3);

    if (selected) addOutline(screen, a, nx * 8, ny * 8, 64, 40, CURSOR_PALS[2 * palIdx + 2]);
  }
  return screen;
}

// ------------------------------------------------------------- area page

const BG_H_FLIP = 1 << 10;
const BG_V_FLIP = 1 << 11;

/** Marker sprite shapes: [tile offset, width px, height px] (sSubsprite_* in pokedex_area_markers.c). */
const MARKER_SHAPES: readonly (readonly [number, number, number])[] = [
  [0, 8, 8],
  [1, 16, 8],
  [3, 8, 16],
  [5, 32, 16],
  [13, 16, 32],
  [21, 32, 16],
  [29, 16, 32],
];

/** Draws the page frame (tile `corner` / `edge` / `side`) around a w*h rectangle. */
function drawFrame(
  layer: GbaScreen["bgs"][number],
  left: number,
  top: number,
  w: number,
  h: number,
  corner: number,
  edge: number,
  side: number,
  interior?: number,
): void {
  layer.fill(corner, left, top, 1, 1, 0);
  layer.fill(corner | BG_H_FLIP, left + 1 + w, top, 1, 1, 0);
  layer.fill(corner | BG_V_FLIP, left, top + 1 + h, 1, 1, 0);
  layer.fill(corner | BG_H_FLIP | BG_V_FLIP, left + 1 + w, top + 1 + h, 1, 1, 0);
  layer.fill(edge, left + 1, top, w, 1, 0);
  layer.fill(edge | BG_V_FLIP, left + 1, top + 1 + h, w, 1, 0);
  layer.fill(side, left, top + 1, 1, h, 0);
  layer.fill(side | BG_H_FLIP, left + 1 + w, top + 1, 1, h, 0);
  if (interior !== undefined) layer.fill(interior, left + 1, top + 1, w, h, 0);
}

/** Affine silhouette (OAM matrix with scale `s`/256 about the sprite centre), colour-keyed on alpha. */
function addSilhouette(screen: GbaScreen, img: RgbaImage, cx: number, cy: number, scale: number, color: number): void {
  const rgba = bgr555ToRgba(color);
  screen.overlays.push((buf) => {
    for (let dy = -32; dy < 32; dy += 1)
      for (let dx = -32; dx < 32; dx += 1) {
        const sx = Math.floor(img.w / 2 + ((dx + 0.5) * scale) / 256);
        const sy = Math.floor(img.h / 2 + ((dy + 0.5) * scale) / 256);
        if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
        if (img.data[(sy * img.w + sx) * 4 + 3] < 128) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && y >= 0 && x < 240 && y < 160) buf[y * 240 + x] = rgba;
      }
  });
}

/** Red area markers: OBJ-window shapes through which BG1 (tile 0xF) shows, alpha-blended 12/8 over the map. */
function addMarkers(screen: GbaScreen, a: DexAssets, markers: readonly { kind: number; x: number; y: number }[], tiles: Uint8Array, originY: number): void {
  const bg1Tile = new Uint8Array(64);
  const sheet = decode4bpp(a.bgTiles);
  bg1Tile.set(sheet.subarray(0x00f * 64, 0x00f * 64 + 64));
  screen.overlays.push((buf) => {
    const pal = screen.palette.colors;
    for (const m of markers) {
      const [tileOffset, w, h] = MARKER_SHAPES[m.kind] ?? MARKER_SHAPES[0];
      for (let y = 0; y < h; y += 1)
        for (let x = 0; x < w; x += 1) {
          const tile = tileOffset + (y >> 3) * (w >> 3) + (x >> 3);
          if (!tiles[tile * 64 + (y & 7) * 8 + (x & 7)]) continue;
          const sx = 104 + m.x + x;
          const sy = originY + m.y + y;
          if (sx < 0 || sy < 0 || sx >= 240 || sy >= 160) continue;
          const top = pal[bg1Tile[(sy & 7) * 8 + (sx & 7)]];
          const under = buf[sy * 240 + sx];
          const ur = (under & 255) >> 3;
          const ug = ((under >> 8) & 255) >> 3;
          const ub = ((under >> 16) & 255) >> 3;
          const r = Math.min(31, ((top & 31) * 12 + ur * 8) >> 4);
          const g = Math.min(31, (((top >> 5) & 31) * 12 + ug * 8) >> 4);
          const b = Math.min(31, (((top >> 10) & 31) * 12 + ub * 8) >> 4);
          buf[sy * 240 + sx] = bgr555ToRgba(r | (g << 5) | (b << 10));
        }
    }
  });
}

async function drawArea(a: DexAssets, area: AreaState, ctx: DexContext, env: DexEnv): Promise<GbaScreen> {
  const dex = area.page.species;
  const id = POKEDEX_SPECIES[dex - 1];
  const entry = POKEDEX_ENTRIES[id];
  const caught = Boolean(ctx.flags[dex - 1]?.caught);
  const load = cachedLoader(env.load);

  const screen = newBase(a);
  const { header, footer } = addBars(screen);
  printHeader(screen, header, romLabel("POKéMON LIST"));
  screen.print(footer, "small", romLabel("{START_BUTTON}CRY"), 8, 2, COLORS[4], 0);
  printControls(screen, footer, romLabel("{A_BUTTON}CANCEL {B_BUTTON}PREVIOUS DATA"));

  // BG3: dex page frame around the map; BG0: frame of the size box.
  drawFrame(screen.bgs[3], 0, 2, 28, 14, 4, 5, 6, 1);
  drawFrame(screen.bgs[0], 1, 9, 10, 6, 29, 30, 31);

  const voff = 4; // Kanto map sits 4 tiles lower while no Sevii island is unlocked
  const [mapTiles, iconTiles, iconPalIndex, silhouettePal, markerTiles, ellipse] = await Promise.all([
    load("pokedex/map_kanto.4bpp"),
    load(`pokedex/icons/${String(dex).padStart(3, "0")}.4bpp`),
    load("index.json").then((b) => {
      const idx = JSON.parse(new TextDecoder().decode(b)) as Record<string, { pal?: number }>;
      return idx[`pokedex/icons/${String(dex).padStart(3, "0")}`]?.pal ?? 0;
    }),
    load("pokedex/silhouette_sprite_pal.gbapal"),
    load("pokedex/area_markers/marker.4bpp"),
    load("pokedex/blit_wide_ellipse.4bpp"),
  ]);
  const iconPal = await load(`pokedex/icons/pal${iconPalIndex}.gbapal`);

  const mapWin = screen.addWindow({ bg: 2, left: 17, top: 4 + voff, width: 12, height: 9, paletteNum: 0 });
  mapWin.blitBitmap(decode4bpp(mapTiles), 12, 0, 96, 72, 0, 0);

  const nameWin = screen.addWindow({ bg: 2, left: 5, top: 2, width: 8, height: 3, paletteNum: 0 });
  const sizeWin = screen.addWindow({ bg: 2, left: 2, top: 7, width: 10, height: 2, paletteNum: 0 });
  const areaWin = screen.addWindow({ bg: 2, left: 18, top: 2 + voff, width: 10, height: 2, paletteNum: 0 });
  const iconWin = screen.addWindow({ bg: 2, left: 1, top: 2, width: 4, height: 4, paletteNum: 10 });
  const typesWin = screen.addWindow({ bg: 2, left: 5, top: 5, width: 8, height: 2, paletteNum: 11 });

  // Mon icon (bank 10 = the species' shared icon palette).
  screen.palette.load(iconPal, 160);
  iconWin.blitBitmap(decode4bpp(iconTiles), 4, 0, 32, 32, 0, 0);

  const sizeText = romLabel("SIZE");
  screen.print(sizeWin, "small", sizeText, Math.floor((80 - screen.stringWidth("small", sizeText, 0)) / 2), 4, COLORS[0], 0);
  const areaText = romLabel("AREA");
  screen.print(areaWin, "small", areaText, Math.floor((80 - screen.stringWidth("small", areaText, 0)) / 2), 4, COLORS[0], 0);
  printDexNo(screen, nameWin, dex, 0, 0, "small");
  screen.print(nameWin, "normal", env.speciesName(dex), 3, 12, COLORS[0], 1);

  // Type icons use menu_info bank 2 loaded into palette bank 11.
  screen.palette.load(a.menuInfoPal.subarray(32, 64), 176);
  if (caught) {
    const types = env.speciesTypes(dex);
    blitTypeIcon(typesWin, a.menuInfo, types[0], 0, 1);
    if (types[1] !== undefined && types[1] !== types[0]) blitTypeIcon(typesWin, a.menuInfo, types[1], 32, 1);
  }

  // Size comparison: mon and trainer silhouettes scaled by the ROM entry's affine parameters.
  if (caught && entry && env.loadImage) {
    const silColor = silhouettePal[2] | (silhouettePal[3] << 8);
    const monUrl = env.frontSpriteUrl(dex);
    const trainerUrl = env.trainerSpriteUrl?.() ?? null;
    const [mon, trainer] = await Promise.all([
      monUrl ? env.loadImage(monUrl) : Promise.resolve(null),
      trainerUrl ? env.loadImage(trainerUrl) : Promise.resolve(null),
    ]);
    if (mon) addSilhouette(screen, mon, 40, 104 + entry.monOffset, entry.monScale, silColor);
    if (trainer) addSilhouette(screen, trainer, 80, 104 + entry.trainerOffset, entry.trainerScale, silColor);
  }

  // Area markers (or "AREA UNKNOWN").
  const markers = (env.speciesAreas?.(dex) ?? [])
    .map((areaName) => DEX_AREA_MARKERS[areaName])
    .filter(Boolean)
    .map(([kind, x, y]) => ({ kind, x, y }));
  if (markers.length) addMarkers(screen, a, markers, decode4bpp(markerTiles), voff * 8 + 32);
  else {
    mapWin.blitBitmap(decode4bpp(ellipse), 11, 0, 88, 16, 4, 28);
    const text = romLabel("AREA UNKNOWN");
    screen.print(mapWin, "small", text, Math.floor((96 - screen.stringWidth("small", text, 0)) / 2), 29, COLORS[0], 0);
  }
  void ctx;
  return screen;
}

export async function buildDexScreen(
  state: DexState,
  ctx: DexContext,
  env: DexEnv,
  tick = 0,
): Promise<GbaScreen> {
  const assets = await loadAssets(env.load);
  switch (state.screen) {
    case "top":
      return drawTop(assets, state, ctx, env);
    case "order":
      return drawOrder(assets, state, ctx, env);
    case "category":
      return drawCategory(assets, state, ctx, env, tick);
    case "page":
      return drawPage(assets, state, ctx, env);
    case "area":
      return drawArea(assets, state as AreaState, ctx, env);
    default:
      return drawTop(assets, { screen: "top", list: { cursorPos: 0, itemsAbove: 1 } }, ctx, env);
  }
}

/**
 * Port of FireRed's ListMenu cursor/scroll logic (src/list_menu.c).
 * `cursorPos` is the index of the first visible item, `itemsAbove` the row of the cursor
 * inside the window; the selected item is `cursorPos + itemsAbove`.
 */
export type ListState = { cursorPos: number; itemsAbove: number };

export type ListConfig = {
  maxShowed: number;
  totalItems: number;
  isHeader?: (index: number) => boolean;
};

export function selectedIndex(s: ListState): number {
  return s.cursorPos + s.itemsAbove;
}

/** One step of ListMenuUpdateSelectedRowIndexAndScrollOffset: 0 = nothing, 1 = row moved, 2 = scrolled. */
function step(s: ListState, cfg: ListConfig, movingDown: boolean): { s: ListState; ret: 0 | 1 | 2 } {
  const isHeader = cfg.isHeader ?? (() => false);
  let { cursorPos, itemsAbove } = s;
  const max = cfg.maxShowed;
  let newRow: number;
  let newScroll: number;

  if (!movingDown) {
    newRow = max === 1 ? 0 : max - (Math.floor(max / 2) + (max % 2)) - 1;
    if (cursorPos === 0) {
      while (itemsAbove !== 0) {
        itemsAbove -= 1;
        if (!isHeader(cursorPos + itemsAbove)) return { s: { cursorPos, itemsAbove }, ret: 1 };
      }
      return { s, ret: 0 };
    }
    while (itemsAbove > newRow) {
      itemsAbove -= 1;
      if (!isHeader(cursorPos + itemsAbove)) return { s: { cursorPos, itemsAbove }, ret: 1 };
    }
    newScroll = cursorPos - 1;
  } else {
    newRow = max === 1 ? 0 : Math.floor(max / 2) + (max % 2);
    if (cursorPos === cfg.totalItems - max || cfg.totalItems <= max) {
      const limit = Math.min(max, cfg.totalItems) - 1;
      while (itemsAbove < limit) {
        itemsAbove += 1;
        if (!isHeader(cursorPos + itemsAbove)) return { s: { cursorPos, itemsAbove }, ret: 1 };
      }
      return { s, ret: 0 };
    }
    while (itemsAbove < newRow) {
      itemsAbove += 1;
      if (!isHeader(cursorPos + itemsAbove)) return { s: { cursorPos, itemsAbove }, ret: 1 };
    }
    newScroll = cursorPos + 1;
  }
  return { s: { cursorPos: newScroll, itemsAbove: newRow }, ret: 2 };
}

/** ListMenuChangeSelection(list, count, movingDown): moves the cursor `count` times, skipping headers. */
export function moveList(s: ListState, cfg: ListConfig, count: number, movingDown: boolean): ListState {
  const isHeader = cfg.isHeader ?? (() => false);
  let cur = s;
  for (let i = 0; i < count; i += 1) {
    for (let guard = 0; guard < cfg.totalItems + 2; guard += 1) {
      const { s: next, ret } = step(cur, cfg, movingDown);
      cur = next;
      if (ret !== 2) break;
      if (!isHeader(selectedIndex(cur))) break;
    }
  }
  return cur;
}

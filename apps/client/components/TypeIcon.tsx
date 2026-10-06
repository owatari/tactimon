import type { DuelType } from "@tactimon/battle-engine";
import { t } from "@/lib/i18n";
import {
  TYPE_COLOR,
  TYPE_ICON_HEIGHT,
  TYPE_ICON_ROW,
  TYPE_ICON_SRC,
  TYPE_ICON_WIDTH,
} from "@/lib/typeIcon";

/** The FireRed type badge cut from the ROM (32×12, scaled by whole numbers only). */
export function TypeIcon({ type, scale = 2 }: { type: DuelType; scale?: 1 | 2 | 3 }) {
  const row = TYPE_ICON_ROW[type];
  const label = t(type.toUpperCase());
  if (row === undefined) {
    return (
      <span className="type-icon type-icon-fallback" style={{ background: TYPE_COLOR[type] ?? "#a8a878" }}>
        {label}
      </span>
    );
  }
  return (
    <span
      className="type-icon"
      role="img"
      aria-label={label}
      title={label}
      style={{
        width: TYPE_ICON_WIDTH * scale,
        height: TYPE_ICON_HEIGHT * scale,
        backgroundImage: `url(${TYPE_ICON_SRC})`,
        backgroundSize: `${TYPE_ICON_WIDTH * scale}px auto`,
        backgroundPosition: `0 -${row * TYPE_ICON_HEIGHT * scale}px`,
      }}
    />
  );
}

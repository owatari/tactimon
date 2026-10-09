"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

/** A place something can be dropped: `data-drop-kind="party-slot" data-drop-id="2"` on the element. */
export type DropTarget = { kind: string; id: string; element: HTMLElement };

const MOVE_THRESHOLD = 5;

type Active<P> = { payload: P; label: ReactNode; x: number; y: number; started: boolean };

function targetAt(x: number, y: number): DropTarget | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-kind]");
  if (!el) return null;
  return { kind: el.dataset.dropKind ?? "", id: el.dataset.dropId ?? "", element: el };
}

/**
 * Pointer-based drag and drop (mouse, touch and pen go through the same path, and it works with
 * synthetic CDP mouse events, which native HTML5 drag does not). Put `dragProps(payload)` on the
 * source and `data-drop-kind` / `data-drop-id` on every target. A press that moves less than a few
 * pixels stays a normal click. Always give keyboard / gamepad users a no-drag way to do the same.
 */
export function useDragDrop<P>(onDrop: (payload: P, target: DropTarget) => void) {
  const [active, setActive] = useState<Active<P> | null>(null);
  const [over, setOver] = useState<{ kind: string; id: string } | null>(null);
  const drop = useRef(onDrop);
  drop.current = onDrop;
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  const dragProps = useCallback(
    (payload: P, label: ReactNode = null) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest("[data-no-drag]")) return;
        const startX = event.clientX;
        const startY = event.clientY;
        let started = false;

        const move = (e: PointerEvent) => {
          if (!started && Math.hypot(e.clientX - startX, e.clientY - startY) < MOVE_THRESHOLD) return;
          started = true;
          setActive({ payload, label, x: e.clientX, y: e.clientY, started });
          const target = targetAt(e.clientX, e.clientY);
          setOver(target ? { kind: target.kind, id: target.id } : null);
        };
        const finish = (e: PointerEvent) => {
          cleanup.current?.();
          if (!started) return;
          const target = targetAt(e.clientX, e.clientY);
          if (target) drop.current(payload, target);
          // The click that follows a drag must not also select / confirm something.
          const swallow = (ev: Event) => ev.stopPropagation();
          window.addEventListener("click", swallow, { capture: true, once: true });
          window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
        };
        const stop = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", finish);
          window.removeEventListener("pointercancel", finish);
          setActive(null);
          setOver(null);
          cleanup.current = null;
        };
        cleanup.current?.();
        cleanup.current = stop;
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", finish);
        window.addEventListener("pointercancel", finish);
      },
    }),
    [],
  );

  const ghost =
    active?.started ? (
      <div className="drag-ghost" style={{ left: active.x, top: active.y }} aria-hidden="true">
        {active.label}
      </div>
    ) : null;

  return { dragProps, dragging: active?.started ? active.payload : null, over, ghost };
}

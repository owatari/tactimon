"use client";

import { useEffect, useRef, useState } from "react";
import { SCREEN_H, SCREEN_W, type GbaScreen } from "@/lib/gba/engine";

type Props = {
  screen: GbaScreen | null;
  className?: string;
};

/**
 * Draws a 240x160 GBA frame and scales it by the largest whole number that fits its container
 * (pixel-perfect, `image-rendering: pixelated`).
 */
export function GbaCanvas({ screen, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(3);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fit = () => {
      const s = Math.max(
        1,
        Math.floor(Math.min(wrap.clientWidth / SCREEN_W, wrap.clientHeight / SCREEN_H)),
      );
      setScale(s);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !screen) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = screen.render();
    ctx.putImageData(new ImageData(data, SCREEN_W, SCREEN_H), 0, 0);
  }, [screen]);

  return (
    <div ref={wrapRef} className={`gba-canvas-wrap${className ? ` ${className}` : ""}`}>
      <canvas
        ref={canvasRef}
        className="gba-canvas"
        width={SCREEN_W}
        height={SCREEN_H}
        style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }}
      />
    </div>
  );
}

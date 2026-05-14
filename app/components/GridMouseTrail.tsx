"use client";

import { useEffect, useRef } from "react";

const LERP = 0.04;
const RANGE = 24;
const MAX_TRAIL = 10;
const FADE_MS = 750;

type TrailCell = { cx: number; cy: number; time: number };

export default function GridMouseTrail({ cellSize = 192 }: { cellSize?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 768) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);

    let mouseX = W / 2;
    let mouseY = H / 2;
    let targetOffX = 0, targetOffY = 0;
    let currentOffX = 0, currentOffY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      targetOffX = (e.clientX / W - 0.5) * 2 * RANGE;
      targetOffY = (e.clientY / H - 0.5) * 2 * RANGE;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    const trail: TrailCell[] = [];
    let lastKey = "";
    let frame = 0;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      currentOffX += (targetOffX - currentOffX) * LERP;
      currentOffY += (targetOffY - currentOffY) * LERP;

      const cellX = Math.floor((mouseX - currentOffX) / cellSize);
      const cellY = Math.floor((mouseY - currentOffY) / cellSize);
      const key = `${cellX}:${cellY}`;

      if (key !== lastKey) {
        lastKey = key;
        const existing = trail.findIndex((t) => t.cx === cellX && t.cy === cellY);
        if (existing !== -1) trail.splice(existing, 1);
        trail.push({ cx: cellX, cy: cellY, time: now });
        if (trail.length > MAX_TRAIL) trail.shift();
      }

      ctx.clearRect(0, 0, W, H);

      for (let i = trail.length - 1; i >= 0; i--) {
        const cell = trail[i];
        const age = now - cell.time;
        if (age > FADE_MS) {
          trail.splice(i, 1);
          continue;
        }
        const t = age / FADE_MS;
        const alpha = (1 - t) * (1 - t) * 0.13;
        const sx = cell.cx * cellSize + currentOffX;
        const sy = cell.cy * cellSize + currentOffY;
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(4)})`;
        ctx.fillRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, [cellSize]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

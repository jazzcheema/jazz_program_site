"use client";

import { useEffect, useRef } from "react";

const LERP = 0.04;
const RANGE = 24;
const MAX_TRAIL = 10;
const FADE_MS = 750;

type TrailCell = { cx: number; cy: number; time: number };

export default function GridMouseTrail({ cellSize = 192, eerie = false }: { cellSize?: number; eerie?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eerieRef = useRef(eerie);

  useEffect(() => { eerieRef.current = eerie }, [eerie]);

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

      if (eerieRef.current) {
        // Persistent dim grid — all visible cells faintly lit
        const colStart = Math.floor(-currentOffX / cellSize) - 1;
        const colEnd = Math.ceil((W - currentOffX) / cellSize) + 1;
        const rowStart = Math.floor(-currentOffY / cellSize) - 1;
        const rowEnd = Math.ceil((H - currentOffY) / cellSize) + 1;

        for (let col = colStart; col <= colEnd; col++) {
          for (let row = rowStart; row <= rowEnd; row++) {
            const sx = col * cellSize + currentOffX;
            const sy = row * cellSize + currentOffY;
            ctx.fillStyle = "rgba(0,180,70,0.028)";
            ctx.fillRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);
            ctx.strokeStyle = "rgba(0,180,70,0.07)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);
          }
        }
      }

      for (let i = trail.length - 1; i >= 0; i--) {
        const cell = trail[i];
        const age = now - cell.time;
        if (age > FADE_MS) {
          trail.splice(i, 1);
          continue;
        }
        const t = age / FADE_MS;
        const alpha = (1 - t) * (1 - t) * (eerieRef.current ? 0.18 : 0.13);
        const sx = cell.cx * cellSize + currentOffX;
        const sy = cell.cy * cellSize + currentOffY;
        ctx.fillStyle = eerieRef.current
          ? `rgba(0,220,80,${alpha.toFixed(4)})`
          : `rgba(255,255,255,${alpha.toFixed(4)})`;
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

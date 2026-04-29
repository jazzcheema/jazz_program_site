"use client";

import { useEffect, useRef } from "react";

type SparklesProps = {
  className?: string;
  density?: number;
  mode?: "rise" | "starfield";
};

export default function Sparkles({
  className,
  density = 150,
  mode = "starfield",
}: SparklesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    type P = {
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      opacity: number;
      fade: number;
      warmth: number;
    };

    const spawnStarfield = (): P => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      size: Math.random() * 1.25 + 0.16,
      vx: (Math.random() - 0.5) * 0.09,
      vy: -(Math.random() * 0.13 + 0.03),
      opacity: Math.random() * 0.72 + 0.1,
      fade: Math.random() * 0.0045 + 0.0018,
      warmth: Math.random(),
    });

    const spawnRise = (): P => ({
      x: Math.random() * canvas.offsetWidth,
      y: canvas.offsetHeight + 4,
      size: Math.random() * 1.1 + 0.2,
      vx: 0,
      vy: -(Math.random() * 0.28 + 0.07),
      opacity: 0,
      fade: Math.random() * 0.006 + 0.003,
      warmth: Math.random(),
    });

    const spawn = mode === "rise" ? spawnRise : spawnStarfield;

    const particles: P[] = Array.from({ length: density }, () => spawn());

    let animId: number;

    const draw = () => {
      animId = requestAnimationFrame(draw);

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.fade;

        if (p.opacity >= 1) {
          p.opacity = 1;
          p.fade *= -1;
        }

        if (p.opacity <= 0.08) {
          p.opacity = 0.08;
          p.fade *= -1;
        }

        if (mode === "rise") {
          if (p.opacity <= 0 || p.y < -4) Object.assign(p, spawnRise());
        } else {
          if (p.x < -4) p.x = width + 4;
          if (p.x > width + 4) p.x = -4;
          if (p.y < -4) {
            p.y = height + 4;
            p.x = Math.random() * width;
          }

          if (p.y > height + 4) {
            p.y = -4;
            p.x = Math.random() * width;
          }
        }

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle =
          p.warmth > 0.82 ? "#f2ddb0" : p.warmth > 0.62 ? "#d7dbe8" : "#c0c0c0";

        if (p.size > 1.05 && p.opacity > 0.45) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.warmth > 0.7 ? "#f2ddb0" : "#d7dbe8";
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1;
    };

    draw();

    const ro = new ResizeObserver(() => {
      resize();

      for (const p of particles) {
        p.x = Math.min(p.x, canvas.offsetWidth);
        p.y = Math.min(p.y, canvas.offsetHeight);
      }
    });

    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [density, mode]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

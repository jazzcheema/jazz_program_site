"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  containDistanceForFrame,
  worldFrameAtDistance,
} from "../lib/responsiveScene";
import Sparkles from "./Sparkles";

const CAM = {
  startDist: 14,
  endDist: 5.5,
  startAngle: Math.PI * 1.5,
  startY: 3.2,
  endY: 0.4,
  duration: 340,
};

const DESIGN_FRAME = worldFrameAtDistance(45, CAM.endDist);
const LIGHT_TARGETS = { ambient: 0.45, key: 1.6, rim: 2.2 };
const LIGHT_DURATION = 260;

type ProjectData = {
  id: string;
  model: string;
  label: string;
  className: string;
  href: string;
  stack: string;
  type: string;
  description: string;
  status: string;
  finePrint: string;
};

const PROJECTS: ProjectData[] = [
  {
    id: "teva",
    model: "/models/genie3.glb",
    label: "TEVACHEEMA.COM",
    className: "FILM / INTERACTIVE / WEB",
    href: "https://tevacheema.com",
    stack: "NEXT.JS + THREE.JS + REACT",
    type: "FILM PORTFOLIO / INTERACTIVE",
    description:
      "Immersive web experience for filmmaker Teva Cheema, built around interactive 3D storytelling.",
    status: "LIVE / PUBLIC",
    finePrint:
      "© JAZZ.CHEEMA_SYSTEMS / TEVACHEEMA.COM / REG: TC-WEB-002 / STACK: NEXT.JS+THREE.JS / INTERACTIVE_FILM_PORTFOLIO",
  },
  {
    id: "krate",
    model: "/models/lamp1.glb",
    label: "KRATE",
    className: "SOCIAL / MUSIC / MOBILE",
    href: "https://apps.apple.com/us/app/krate-rate-music/id1540002251",
    stack: "REACT NATIVE + EXPO ROUTER + FIREBASE",
    type: "IOS / ANDROID SOCIAL MUSIC APP",
    description:
      "Rebuilt a 15k+ user social music app from deprecated React Native and Expo versions to Expo Router, Firebase methodologies, and React Native New Architecture. Improved feature velocity, load times, accessibility, and reduced technical debt.",
    status: "APP STORE / PUBLIC",
    finePrint:
      "© JAZZ.CHEEMA_SYSTEMS / KRATE_MOBILE / REG: KR-IOS-ANDROID-001 / EXPO_ROUTER / FIREBASE / NEW_ARCHITECTURE",
  },
  {
    id: "episode",
    model: "/models/mobile_tv.glb",
    label: "EPISODE-ETA.VERCEL.APP",
    className: "PROPERTY / DEVELOPMENT / INTERACTIVE",
    href: "https://episode-eta.vercel.app/",
    stack: "NEXT.JS + THREE.JS + REACT",
    type: "PROPERTY DEVELOPMENT WEBSITE",
    description:
      "Interactive property development website for Episode Companies, featuring a 3D television interface and knob-turning navigation.",
    status: "LIVE / PUBLIC",
    finePrint:
      "© JAZZ.CHEEMA_SYSTEMS / EPISODE_COMPANIES / REG: EP-WEB-001 / THREEJS_INTERFACE / KNOB_CONTROL_NAVIGATION",
  },
];

type MatrixDot = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  rgb: [number, number, number];
};

type ParticleDot = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  size: number;
};

function ParticleButton({
  label,
  rgb,
  isMobile,
  scatterDir,
  onClick,
  href,
  stopEvent,
}: {
  label: string;
  rgb: [number, number, number];
  isMobile: boolean;
  scatterDir: "left" | "right" | "up";
  onClick?: () => void;
  href?: string;
  stopEvent: (e: React.SyntheticEvent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dots: ParticleDot[] = [];
    let raf = 0;

    const buildDots = () => {
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement("canvas");
      off.width = cssW;
      off.height = cssH;
      const offCtx = off.getContext("2d");
      if (!offCtx) return;
      offCtx.fillStyle = "#fff";
      offCtx.textBaseline = "middle";
      offCtx.textAlign = "center";
      // Fill ~70% of canvas height so text is bold and readable as particles
      let fontSize = Math.floor(cssH * 0.72);
      offCtx.font = `900 ${fontSize}px monospace`;
      while (offCtx.measureText(label).width > cssW * 0.86 && fontSize > 10) {
        fontSize -= 2;
        offCtx.font = `900 ${fontSize}px monospace`;
      }
      offCtx.fillText(label, cssW / 2, cssH / 2);

      const img = offCtx.getImageData(0, 0, cssW, cssH);
      const step = isMobile ? 3 : 4;
      const dotSize = isMobile ? 4.6 : 5.4;
      const next: ParticleDot[] = [];

      for (let y = 0; y < cssH; y += step) {
        for (let x = 0; x < cssW; x += step) {
          if (img.data[(y * cssW + x) * 4 + 3] < 80) continue;

          // Start randomly scattered inside the canvas — assembly is visible on load
          const ix = Math.random() * cssW;
          const iy = Math.random() * cssH;

          // Scatter targets: small local spread around each dot's rest position
          const spread = cssH * 0.55;
          let sx: number, sy: number;
          if (scatterDir === "left") {
            sx = x + (Math.random() - 0.65) * spread;
            sy = y + (Math.random() - 0.5) * spread * 0.7;
          } else if (scatterDir === "right") {
            sx = x + (Math.random() - 0.35) * spread;
            sy = y + (Math.random() - 0.5) * spread * 0.7;
          } else {
            sx = x + (Math.random() - 0.5) * spread * 0.8;
            sy = y + (Math.random() - 0.7) * spread;
          }

          next.push({ x: ix, y: iy, tx: x, ty: y, sx, sy, vx: 0, vy: 0, size: dotSize });
        }
      }
      dots = next;
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      ctx.clearRect(0, 0, cssW, cssH);

      const hovering = hoverRef.current;
      dots.forEach((dot) => {
        const tx = hovering ? dot.sx : dot.tx;
        const ty = hovering ? dot.sy : dot.ty;
        dot.vx += (tx - dot.x) * 0.1;
        dot.vy += (ty - dot.y) * 0.1;
        dot.vx *= 0.76;
        dot.vy *= 0.76;
        dot.x += dot.vx;
        dot.y += dot.vy;
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${hovering ? 0.58 : 0.88})`;
        ctx.fillRect(dot.x - dot.size * 0.5, dot.y - dot.size * 0.5, dot.size, dot.size);
      });
    };

    buildDots();
    const ro = new ResizeObserver(buildDots);
    ro.observe(canvas);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [label, rgb, isMobile, scatterDir]);

  const canvasEl = (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}
      aria-hidden="true"
    />
  );

  if (href) {
    return (
      <a
        className="clouds-particle-btn"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => { hoverRef.current = true; }}
        onMouseLeave={() => { hoverRef.current = false; }}
        onPointerDown={stopEvent}
        onPointerUp={stopEvent}
        onClick={stopEvent}
      >
        {canvasEl}
        <span className="sr-only">{label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      className="clouds-particle-btn"
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerDown={stopEvent}
      onPointerUp={stopEvent}
    >
      {canvasEl}
      <span className="sr-only">{label}</span>
    </button>
  );
}

type MatrixGhost = { pts: Float32Array; alpha: number };

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
};

function DotMatrixProjectSignal({
  activeSignal,
  displayLabel,
  isMobile,
}: {
  activeSignal: string;
  displayLabel: string;
  isMobile: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dots: MatrixDot[] = [];
    let ghosts: MatrixGhost[] = [];
    let raf = 0;
    let tick = 0;
    const signalRgb = isMobile && activeSignal === "#808080" ? hexToRgb("#c8c8c8") : hexToRgb(activeSignal);

    const buildDots = () => {
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement("canvas");
      off.width = cssW;
      off.height = cssH;
      const offCtx = off.getContext("2d");
      if (!offCtx) return;

      offCtx.clearRect(0, 0, cssW, cssH);
      offCtx.fillStyle = "#fff";
      offCtx.textBaseline = "top";

      const title = `→ ${displayLabel}`;
      let titleSize = isMobile ? 40 : 68;
      offCtx.font = `700 ${titleSize}px monospace`;
      while (offCtx.measureText(title).width > cssW - 18 && titleSize > (isMobile ? 26 : 38)) {
        titleSize -= 2;
        offCtx.font = `700 ${titleSize}px monospace`;
      }

      const startY = isMobile ? 12 : 36;
      offCtx.font = `700 ${titleSize}px monospace`;
      offCtx.fillText(title, 0, startY);

      const image = offCtx.getImageData(0, 0, cssW, cssH);
      const step = isMobile ? 4 : 7;
      const next: MatrixDot[] = [];
      let minX = cssW;
      let minY = cssH;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < cssH; y += step) {
        for (let x = 0; x < cssW; x += step) {
          const alpha = image.data[(y * cssW + x) * 4 + 3];
          if (alpha < 80) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          next.push({
            x: x + (Math.random() - 0.5) * cssW * 0.12,
            y: y + (Math.random() - 0.5) * cssH * 0.18,
            tx: x,
            ty: y,
            vx: 0,
            vy: 0,
            size: isMobile ? 5.2 : 6,
            phase: Math.random() * Math.PI * 2,
            rgb: signalRgb,
          });
        }
      }

      const textW = Math.max(1, maxX - minX);
      const textH = Math.max(1, maxY - minY);
      const offsetX = (cssW - textW) * 0.5 - minX;
      const offsetY = (cssH - textH) * 0.5 - minY;
      next.forEach((dot) => {
        dot.tx += offsetX;
        dot.ty += offsetY;
        dot.x += offsetX;
        dot.y += offsetY;
      });

      dots = next;
      ghosts = [];
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1))),
        y: Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(rect.height, 1))),
        active: true,
      };
    };

    const onPointerLeave = () => {
      pointerRef.current = { x: 0.5, y: 0.5, active: false };
    };

    const drawDot = (x: number, y: number, size: number, rgb: [number, number, number], alpha: number) => {
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      tick += 1;
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      ctx.clearRect(0, 0, cssW, cssH);

      ghosts.forEach((ghost) => {
        for (let i = 0; i < dots.length && i * 2 + 1 < ghost.pts.length; i++) {
          drawDot(ghost.pts[i * 2], ghost.pts[i * 2 + 1], dots[i].size, dots[i].rgb, ghost.alpha);
        }
        ghost.alpha *= 0.86;
      });
      ghosts = ghosts.filter((ghost) => ghost.alpha > 0.025);

      const pointer = pointerRef.current;
      const driftX = (pointer.x - 0.5) * (isMobile ? 10 : 28);
      const driftY = (pointer.y - 0.5) * (isMobile ? 7 : 18);
      const mouseX = pointer.x * cssW;
      const mouseY = pointer.y * cssH;

      dots.forEach((dot) => {
        const wave = Math.sin(tick * 0.018 + dot.phase) * (isMobile ? 0.45 : 0.7);
        let targetX = dot.tx + driftX + wave;
        let targetY = dot.ty + driftY;

        if (pointer.active) {
          const dx = targetX - mouseX;
          const dy = targetY - mouseY;
          const dist = Math.hypot(dx, dy);
          const radius = isMobile ? 62 : 86;
          if (dist > 0.01 && dist < radius) {
            const force = ((1 - dist / radius) ** 2) * (isMobile ? 16 : 28);
            targetX += (dx / dist) * force;
            targetY += (dy / dist) * force;
          }
        }

        dot.vx += (targetX - dot.x) * 0.08;
        dot.vy += (targetY - dot.y) * 0.08;
        dot.vx *= 0.78;
        dot.vy *= 0.78;
        dot.x += dot.vx;
        dot.y += dot.vy;
        drawDot(dot.x, dot.y, dot.size, dot.rgb, isMobile ? 0.96 : 0.88);
      });

      if (tick % 5 === 0 && dots.length > 0) {
        const pts = new Float32Array(dots.length * 2);
        dots.forEach((dot, i) => {
          pts[i * 2] = dot.x;
          pts[i * 2 + 1] = dot.y;
        });
        if (ghosts.length > 8) ghosts.shift();
        ghosts.push({ pts, alpha: 0.16 });
      }
    };

    buildDots();
    window.addEventListener("resize", buildDots);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", buildDots);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [activeSignal, displayLabel, isMobile]);

  return <canvas ref={canvasRef} className="clouds-matrix-canvas" aria-label={`${displayLabel} project signal`} />;
}

type MatrixFieldDot = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
};

function DotMatrixPanelField({ isMobile }: { isMobile: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dots: MatrixFieldDot[] = [];
    let raf = 0;
    let tick = 0;

    const buildDots = () => {
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const step = isMobile ? 3 : 4;
      const inset = isMobile ? 5 : 7;
      const cols = Math.max(1, Math.floor((cssW - inset * 2) / step) + 1);
      const rows = Math.max(1, Math.floor((cssH - inset * 2) / step) + 1);
      const startX = (cssW - (cols - 1) * step) * 0.5;
      const startY = (cssH - (rows - 1) * step) * 0.5;
      const next: MatrixFieldDot[] = [];

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = startX + col * step;
          const y = startY + row * step;
          next.push({
            x,
            y,
            tx: x,
            ty: y,
            vx: 0,
            vy: 0,
            phase: Math.random() * Math.PI * 2,
            size: isMobile ? 2.8 : 3.4,
          });
        }
      }

      dots = next;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      pointerRef.current = {
        x: Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1))),
        y: Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(rect.height, 1))),
        active: inside,
      };
    };

    const drawDot = (x: number, y: number, size: number, alpha: number, lightAlpha: number) => {
      ctx.fillStyle = `rgba(3,3,3,${alpha})`;
      ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
      ctx.fillStyle = `rgba(200,200,200,${lightAlpha})`;
      ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      tick += 1;

      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = "rgba(0,0,0,0.24)";
      ctx.fillRect(0, 0, cssW, cssH);

      const pointer = pointerRef.current;
      const mouseX = pointer.x * cssW;
      const mouseY = pointer.y * cssH;
      const driftX = pointer.active ? (pointer.x - 0.5) * (isMobile ? 8 : 16) : 0;
      const driftY = pointer.active ? (pointer.y - 0.5) * (isMobile ? 5 : 10) : 0;

      dots.forEach((dot) => {
        const wave = Math.sin(tick * 0.03 + dot.phase) * (pointer.active ? 1.4 : 0.18);
        let targetX = dot.tx + driftX + wave;
        let targetY = dot.ty + driftY - wave * 0.35;
        let proximity = 0;

        if (pointer.active) {
          const dx = targetX - mouseX;
          const dy = targetY - mouseY;
          const dist = Math.hypot(dx, dy);
          const radius = isMobile ? 78 : 112;
          if (dist > 0.01 && dist < radius) {
            proximity = 1 - dist / radius;
            const force = proximity ** 2 * (isMobile ? 28 : 46);
            targetX += (dx / dist) * force;
            targetY += (dy / dist) * force;
          }
        }

        dot.vx += (targetX - dot.x) * 0.09;
        dot.vy += (targetY - dot.y) * 0.09;
        dot.vx *= 0.76;
        dot.vy *= 0.76;
        dot.x += dot.vx;
        dot.y += dot.vy;

        drawDot(
          dot.x,
          dot.y,
          dot.size + proximity * 1.35,
          pointer.active ? 0.66 + proximity * 0.18 : 0.58,
          pointer.active ? 0.13 + proximity * 0.16 : 0.1,
        );
      });
    };

    buildDots();
    const observer = new ResizeObserver(buildDots);
    observer.observe(canvas);
    window.addEventListener("pointermove", onPointerMove);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [isMobile]);

  return <canvas ref={canvasRef} className="clouds-matrix-field" aria-hidden="true" />;
}

function ProjectCard({
  visible,
  project,
  carouselOpen,
  isMobile,
  onPrev,
  onNext,
}: {
  visible: boolean;
  project: ProjectData;
  carouselOpen: boolean;
  isMobile: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!visible) return null;

  const activeSignal =
    project.id === "episode"
      ? "#c87820"
      : project.id === "krate"
        ? "#2a5fc0"
        : "#249958";
  const displayLabel = project.label
    .replace(".VERCEL.APP", "")
    .replace(".COM", "");

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  const outerStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        bottom: 18,
        left: 14,
        right: 14,
        zIndex: 30,
        width: "auto",
        pointerEvents: "auto",
        fontFamily: "var(--font-geist-mono), monospace",
      }
    : {
        position: "fixed",
        top: carouselOpen ? "max(102px, 15dvh)" : "max(110px, 16dvh)",
        right: "clamp(28px, 7vw, 128px)",
        zIndex: 30,
        width: "min(620px, calc(100vw - 56px))",
        pointerEvents: "none",
        fontFamily: "var(--font-geist-mono), monospace",
      };

  return (
    <div
      key={project.id}
      className="clouds-matrix-shell"
      style={{
        ...outerStyle,
        animation: "project-card-enter 680ms cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      <div className="clouds-matrix-stage">
        <DotMatrixProjectSignal
          activeSignal={activeSignal}
          displayLabel={displayLabel}
          isMobile={isMobile}
        />
      </div>

      <div className="clouds-matrix-info">
        <DotMatrixPanelField isMobile={isMobile} />
        <p className="clouds-matrix-caption">{project.description}</p>
        <div className="clouds-matrix-meta" aria-label="Project details">
          <span className="clouds-matrix-meta-row">
            <span className="clouds-matrix-meta-key">STACK</span>
            <span className="clouds-matrix-meta-value">{project.stack}</span>
          </span>
          <span className="clouds-matrix-meta-row">
            <span className="clouds-matrix-meta-key">TYPE</span>
            <span className="clouds-matrix-meta-value">{project.type}</span>
          </span>
        </div>
        <div className="clouds-particle-controls">
          {carouselOpen && (
            <ParticleButton
              label="<"
              rgb={[42, 95, 192]}
              isMobile={isMobile}
              scatterDir="left"
              onClick={onPrev}
              stopEvent={stop}
            />
          )}
          <ParticleButton
            label="VISIT"
            rgb={[200, 120, 32]}
            isMobile={isMobile}
            scatterDir="up"
            href={project.href}
            stopEvent={stop}
          />
          {carouselOpen && (
            <ParticleButton
              label=">"
              rgb={[36, 153, 88]}
              isMobile={isMobile}
              scatterDir="right"
              onClick={onNext}
              stopEvent={stop}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CloudsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(0);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const carouselOpenRef = useRef(false);
  const activeProjectRef = useRef(0);

  const selectProject = useCallback((nextIndex: number) => {
    const normalized = (nextIndex + PROJECTS.length) % PROJECTS.length;
    activeProjectRef.current = normalized;
    setActiveProject(normalized);
    setShowProject(true);
  }, []);

  const openCarousel = useCallback(() => {
    carouselOpenRef.current = true;
    setCarouselOpen(true);
    selectProject(0);
  }, [selectProject]);

  const selectPrev = useCallback(
    () => selectProject(activeProjectRef.current - 1),
    [selectProject],
  );
  const selectNext = useCallback(
    () => selectProject(activeProjectRef.current + 1),
    [selectProject],
  );

  useEffect(() => {
    const check = () => setIsMobileLayout(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = "ontouchstart" in window;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2),
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    const responsiveCameraSettings = () => {
      const fitScale =
        containDistanceForFrame(camera, DESIGN_FRAME) / CAM.endDist;
      return {
        startDist: CAM.startDist * fitScale,
        endDist: CAM.endDist * fitScale,
        startY: CAM.startY * Math.min(fitScale, 1.45),
        endY: CAM.endY * Math.min(fitScale, 1.25),
      };
    };

    const applyCameraPose = (progress: number) => {
      const settings = responsiveCameraSettings();
      const e = progress * progress * (3 - 2 * progress);
      const angle = CAM.startAngle * (1 - e);
      const dist =
        settings.startDist + (settings.endDist - settings.startDist) * e;
      const y = settings.startY + (settings.endY - settings.startY) * e;
      camera.position.set(Math.sin(angle) * dist, y, Math.cos(angle) * dist);
      camera.lookAt(0, 0, 0);
    };

    applyCameraPose(0);

    const ambient = new THREE.AmbientLight("#ffffff", 0);
    scene.add(ambient);
    const key = new THREE.DirectionalLight("#ffffff", 0);
    key.position.set(2, 4, 3);
    scene.add(key);
    const rim = new THREE.PointLight("#3a3a3a", 0, 15);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    const halo = new THREE.PointLight("#ffe8ad", 0, 18);
    halo.position.set(0, 3.8, -3.5);
    scene.add(halo);

    const heaven = new THREE.DirectionalLight("#fff2c7", 0);
    heaven.position.set(0, 5.5, 2.5);
    scene.add(heaven);

    let lightT = 0;

    const haloTextureCanvas = document.createElement("canvas");
    haloTextureCanvas.width = 256;
    haloTextureCanvas.height = 256;

    const haloCtx = haloTextureCanvas.getContext("2d");

    if (haloCtx) {
      const gradient = haloCtx.createRadialGradient(128, 128, 0, 128, 128, 128);

      gradient.addColorStop(0, "rgba(255, 238, 190, 0.55)");
      gradient.addColorStop(0.28, "rgba(255, 220, 130, 0.18)");
      gradient.addColorStop(0.62, "rgba(140, 150, 220, 0.055)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      haloCtx.fillStyle = gradient;
      haloCtx.fillRect(0, 0, 256, 256);
    }

    const haloTexture = new THREE.CanvasTexture(haloTextureCanvas);
    haloTexture.colorSpace = THREE.SRGBColorSpace;

    const haloSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    );

    haloSprite.position.set(0, 0.45, -1.35);
    haloSprite.scale.set(5.8, 5.8, 1);
    scene.add(haloSprite);

    type EyeRigMesh = {
      mesh: THREE.Mesh;
      basePosition: THREE.Vector3;
      baseRotation: THREE.Euler;
    };

    type ProjectObject = {
      group: THREE.Group;
      maxDim: number;
      index: number;
      baseRotationY: number;
      eyeRig?: {
        meshes: EyeRigMesh[];
      };
    };

    const projectObjects: ProjectObject[] = [];
    const raycaster = new THREE.Raycaster();
    const pointerTarget = new THREE.Vector2();
    const pointerCurrent = new THREE.Vector2();

    const responsiveModelSize = () => {
      const mobile = window.innerWidth < 768;
      return mobile ? 3.85 : 2.5;
    };

    const applyMaterialOpacity = (object: THREE.Object3D, opacity: number) => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((material) => {
          material.transparent = opacity < 0.98;
          material.opacity = opacity;
          material.depthWrite = opacity > 0.7;
        });
      });
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/gltf/");

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    PROJECTS.forEach((project, index) => {
      loader.load(project.model, (gltf) => {
        const group = gltf.scene;
        const box = new THREE.Box3().setFromObject(group);
        group.position.sub(box.getCenter(new THREE.Vector3()));
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const baseRotationY = index === 1 ? Math.PI / 4 : 0;
        const eyeMeshes: EyeRigMesh[] = [];
        if (project.id === "teva") {
          group.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            const name = child.name.toLowerCase();
            if (name === "sphere") {
              eyeMeshes.push({
                mesh: child,
                basePosition: child.position.clone(),
                baseRotation: child.rotation.clone(),
              });
            }
          });
        }
        group.rotation.y = baseRotationY;
        group.visible = index === 0;
        group.scale.setScalar(responsiveModelSize() / maxDim);
        group.userData.projectIndex = index;
        scene.add(group);
        projectObjects[index] = {
          group,
          maxDim,
          index,
          baseRotationY,
          eyeRig: eyeMeshes.length > 0 ? { meshes: eyeMeshes } : undefined,
        };
      });
    });

    // Click detection
    let downX = 0,
      downY = 0,
      dragDX = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      dragDX = 0;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerUp = (e: PointerEvent) => {
      dragDX = e.clientX - downX;
      const moved = Math.hypot(dragDX, e.clientY - downY);

      if (carouselOpenRef.current && Math.abs(dragDX) > 44) {
        selectProject(activeProjectRef.current + (dragDX < 0 ? 1 : -1));
        return;
      }

      if (moved > 8) return;

      const loadedObjects = projectObjects.filter(Boolean);
      if (loadedObjects.length === 0) return;

      const ndc = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * -2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(
        loadedObjects.map(({ group }) => group),
        true,
      )[0];
      if (!hit) return;

      const clickedProject = hit.object.parent
        ? loadedObjects.find(({ group }) => {
            let current: THREE.Object3D | null = hit.object;
            while (current) {
              if (current === group) return true;
              current = current.parent;
            }
            return false;
          })
        : undefined;

      if (!clickedProject) return;

      if (!carouselOpenRef.current) {
        openCarousel();
        return;
      }

      selectProject(clickedProject.index);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    const onPointerMove = (e: PointerEvent) => {
      pointerTarget.set(
        THREE.MathUtils.clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1),
        THREE.MathUtils.clamp((e.clientY / window.innerHeight) * -2 + 1, -1, 1),
      );
    };

    const onPointerLeave = () => {
      pointerTarget.set(0, 0);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    let tick = 0,
      camT = 0,
      animId: number;

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      applyCameraPose(camT);
      projectObjects.forEach(({ group, maxDim }) => {
        group.scale.setScalar(responsiveModelSize() / maxDim);
      });
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      tick++;
      const t = tick * 0.01;

      if (lightT < 1) {
        lightT = Math.min(1, lightT + 1 / LIGHT_DURATION);
        const e = lightT * lightT * (3 - 2 * lightT);
        ambient.intensity = LIGHT_TARGETS.ambient * e;
        key.intensity = LIGHT_TARGETS.key * e;
        rim.intensity = LIGHT_TARGETS.rim * e;

        halo.intensity = (carouselOpenRef.current ? 1.35 : 0.85) * e;
        heaven.intensity = (carouselOpenRef.current ? 0.85 : 0.45) * e;
      }
      const haloMaterial = haloSprite.material as THREE.SpriteMaterial;

      haloMaterial.opacity = THREE.MathUtils.lerp(
        haloMaterial.opacity,
        carouselOpenRef.current ? 0.34 : 0.2,
        0.035,
      );

      haloSprite.position.y = 0.45 + Math.sin(t * 0.35) * 0.08;

      haloSprite.scale.setScalar(carouselOpenRef.current ? 6.3 : 5.4);
      pointerCurrent.lerp(pointerTarget, 0.045);

      if (camT < 1) {
        camT = Math.min(1, camT + 1 / CAM.duration);
        applyCameraPose(camT);
      }

      projectObjects.forEach((projectObject) => {
        const { group, maxDim, index, baseRotationY } = projectObject;
        const carouselOffset = index - activeProjectRef.current;
        const wrappedOffset =
          ((carouselOffset + PROJECTS.length + 1) % PROJECTS.length) - 1;
        const focus = carouselOpenRef.current
          ? 1 - Math.min(Math.abs(wrappedOffset), 1)
          : index === 0
            ? 1
            : 0;
        const visible = carouselOpenRef.current || index === 0;
        const targetX = carouselOpenRef.current ? wrappedOffset * 2.25 : 0;
        const targetZ = carouselOpenRef.current
          ? 0.55 - Math.abs(wrappedOffset) * 1.45
          : 0;
        const mobileCardLift =
          carouselOpenRef.current && window.innerWidth < 768 ? 0.78 : 0;

        const targetY = Math.sin(t * 0.7 + index * 0.8) * 0.1 + mobileCardLift;
        const targetScale =
          (responsiveModelSize() / maxDim) * (0.76 + focus * 0.28);

        group.visible = visible;
        if (!visible) return;

        group.position.x = THREE.MathUtils.lerp(
          group.position.x,
          targetX,
          0.09,
        );
        group.position.y = THREE.MathUtils.lerp(
          group.position.y,
          targetY,
          0.09,
        );
        group.position.z = THREE.MathUtils.lerp(
          group.position.z,
          targetZ,
          0.09,
        );
        group.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.09,
        );
        group.rotation.y = THREE.MathUtils.lerp(
          group.rotation.y,
          baseRotationY +
            Math.sin(t * 0.22 + index) * 0.12 +
            wrappedOffset * -0.18,
          0.08,
        );
        group.rotation.z = THREE.MathUtils.lerp(
          group.rotation.z,
          Math.sin(t * 0.31 + index) * 0.02,
          0.08,
        );
        if (projectObject.eyeRig) {
          const gazeX = pointerCurrent.x * (0.008 + focus * 0.01);
          const gazeY = pointerCurrent.y * (0.006 + focus * 0.008);
          projectObject.eyeRig.meshes.forEach(({ mesh, basePosition, baseRotation }) => {
            mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, basePosition.x + gazeX, 0.18);
            mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, basePosition.y + gazeY, 0.18);
            mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, baseRotation.y + pointerCurrent.x * 0.045, 0.14);
            mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, baseRotation.x - pointerCurrent.y * 0.035, 0.14);
          });
        }
        applyMaterialOpacity(group, 0.34 + focus * 0.66);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      haloTexture.dispose();
      haloSprite.material.dispose();
      dracoLoader.dispose();
      renderer.dispose();
    };
  }, [openCarousel, selectProject]);

  return (
    <div
      className="w-dvw h-dvh relative transition-opacity duration-700 overflow-hidden"
      style={{
        width: "100dvw",
        height: "100dvh",
        background: "#0c0c0c",
        opacity: show ? 1 : 0,
      }}
    >
      <div className="absolute inset-0">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
        radial-gradient(circle at 50% 42%,
          rgba(245, 232, 185, 0.13) 0%,
          rgba(180, 160, 95, 0.055) 18%,
          rgba(95, 110, 160, 0.035) 36%,
          rgba(12, 12, 12, 0) 62%
        )
      `,
            mixBlendMode: "screen",
            opacity: carouselOpen ? 1 : 0.78,
          }}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
        radial-gradient(ellipse at 50% 100%,
          rgba(255, 238, 180, 0.075) 0%,
          rgba(120, 130, 190, 0.035) 28%,
          rgba(12, 12, 12, 0) 68%
        )
      `,
            mixBlendMode: "screen",
          }}
        />

        <Sparkles
          className="w-full h-full"
          density={isMobileLayout ? 180 : 300}
          mode="starfield"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
        radial-gradient(circle at center,
          rgba(12, 12, 12, 0) 0%,
          rgba(12, 12, 12, 0) 46%,
          rgba(0, 0, 0, 0.36) 100%
        )
      `,
          }}
        />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          width: "100%",
          height: "100%",
          cursor: carouselOpen ? "grab" : "pointer",
        }}
      />

      {!(isMobileLayout && carouselOpen) && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center text-[0.6rem] sm:text-xs tracking-widest pointer-events-none"
          style={{
            bottom: carouselOpen ? "max(18px, 4dvh)" : "max(22px, 7dvh)",
            width: "min(38rem, calc(100vw - 32px))",
            color: "#303030",
            fontFamily: "var(--font-geist-mono)",
            zIndex: 9,
          }}
        >
          {carouselOpen
            ? "→ DRAG LEFT / RIGHT TO ROTATE PORTFOLIO AXIS → CLICK MODEL TO FOCUS"
            : "→ CLICK GENIE TO OPEN PORTFOLIO AXIS"}
        </div>
      )}

      <ProjectCard
        visible={showProject}
        project={PROJECTS[activeProject]}
        carouselOpen={carouselOpen}
        isMobile={isMobileLayout}
        onPrev={selectPrev}
        onNext={selectNext}
      />
    </div>
  );
}

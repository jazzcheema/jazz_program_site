"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  containDistanceForFrame,
  worldFrameAtDistance,
} from "../lib/responsiveScene";
import EasterGame from "../easter/EasterGame";

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
  href: string;
  stack: string;
  type: string;
  description: string;
  scaleFactor?: number;
};

const PROJECTS: ProjectData[] = [
  {
    id: "teva",
    model: "/models/genie3.glb",
    label: "TEVACHEEMA.COM",
    href: "https://tevacheema.com",
    stack: "NEXT.JS + THREE.JS + REACT",
    type: "FILM PORTFOLIO / INTERACTIVE",
    description:
      "Immersive web experience for filmmaker Teva Cheema, built around interactive 3D storytelling.",
  },
  {
    id: "krate",
    model: "/models/krate.glb",
    scaleFactor: 0.82,
    label: "KRATE",
    href: "https://apps.apple.com/us/app/krate-rate-music/id1540002251",
    stack: "REACT NATIVE + EXPO ROUTER + FIREBASE",
    type: "IOS / ANDROID SOCIAL MUSIC APP",
    description:
      "Rebuilt a 15k+ user social music app from deprecated React Native and Expo versions to Expo Router, Firebase methodologies, and React Native New Architecture.",
  },
  {
    id: "episode",
    model: "/models/mobile_tv.glb",
    label: "EPISODE",
    href: "https://episode-eta.vercel.app/",
    stack: "NEXT.JS + THREE.JS + REACT",
    type: "PROPERTY DEVELOPMENT WEBSITE",
    description:
      "Interactive property development website for Episode Companies, featuring a 3D television interface and knob-turning navigation.",
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
      const offsetY = cssH - textH - (isMobile ? 4 : 6) - minY;
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

function ProjectCard({
  visible,
  project,
  carouselOpen,
  isMobile,
  showEasterCue,
  onPrev,
  onNext,
}: {
  visible: boolean;
  project: ProjectData;
  carouselOpen: boolean;
  isMobile: boolean;
  showEasterCue: boolean;
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
        left: "50%",
        bottom: "max(30px, 5dvh)",
        zIndex: 30,
        width: "min(560px, calc(100vw - 56px))",
        transform: "translateX(-50%)",
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
        {showEasterCue && (
          <div
            style={{
              position: "relative",
              zIndex: 3,
              marginTop: "0.36rem",
              color: "#d3322f",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.58rem",
              lineHeight: 1.2,
              letterSpacing: "0.12em",
              opacity: 0.82,
              textAlign: "center",
              textShadow: "0 0 8px rgba(211, 50, 47, 0.4)",
              pointerEvents: "none",
            }}
          >
            CLICK KRATE AGAIN TO OPEN THE HIDDEN ROOM
          </div>
        )}
      </div>
    </div>
  );
}

export default function CloudsPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(false);
  const [showEaster, setShowEaster] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(0);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [krateEasterCue, setKrateEasterCue] = useState(false);
  const [hiddenRoomTransition, setHiddenRoomTransition] = useState(false);
  const carouselOpenRef = useRef(false);
  const activeProjectRef = useRef(0);
  const krateEasterCueRef = useRef(false);
  const hiddenRoomTransitionRef = useRef(false);
  const hiddenRoomTimer = useRef<number | null>(null);

  const selectProject = useCallback((nextIndex: number) => {
    const normalized = (nextIndex + PROJECTS.length) % PROJECTS.length;
    activeProjectRef.current = normalized;
    setActiveProject(normalized);
    setShowProject(true);
    krateEasterCueRef.current = false;
    setKrateEasterCue(false);
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

  const triggerHiddenRoomTransition = useCallback(() => {
    if (hiddenRoomTransitionRef.current) return;
    hiddenRoomTransitionRef.current = true;
    krateEasterCueRef.current = false;
    setKrateEasterCue(false);
    setHiddenRoomTransition(true);
    if (hiddenRoomTimer.current) window.clearTimeout(hiddenRoomTimer.current);
    hiddenRoomTimer.current = window.setTimeout(() => {
      setShowEaster(true);
      setHiddenRoomTransition(false);
      hiddenRoomTransitionRef.current = false;
      hiddenRoomTimer.current = null;
    }, 2300);
  }, []);

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
    return () => {
      if (hiddenRoomTimer.current) window.clearTimeout(hiddenRoomTimer.current);
    };
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

    type BrowRigNode = {
      node: THREE.Object3D;
      basePosition: THREE.Vector3;
    };

    type ProjectObject = {
      group: THREE.Group;
      maxDim: number;
      index: number;
      baseRotationY: number;
      eyeRig?: { meshes: EyeRigMesh[]; sensitivity: number };
      browRig?: BrowRigNode[];
    };

    const projectObjects: ProjectObject[] = [];
    const raycaster = new THREE.Raycaster();
    const pointerTarget = new THREE.Vector2();
    const pointerCurrent = new THREE.Vector2();

    const responsiveModelSize = () => {
      const mobile = window.innerWidth < 768;
      return mobile ? 3.55 : 1.95;
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
        const baseRotationY = index === 1 ? Math.PI / 24 : 0;
        const eyeMeshes: EyeRigMesh[] = [];
        const browNodes: BrowRigNode[] = [];
        if (project.id === "teva") {
          group.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            if (child.name.toLowerCase() === "sphere") {
              eyeMeshes.push({
                mesh: child,
                basePosition: child.position.clone(),
                baseRotation: child.rotation.clone(),
              });
            }
          });
        }
        if (project.id === "krate") {
          const eyeNodes = new Set(["l_iris", "r_iris", "l_hilite", "r_hilite"]);
          const browNodeNames = new Set(["l_brow", "r_brow"]);
          group.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            if (eyeNodes.has(child.name)) {
              eyeMeshes.push({
                mesh: child,
                basePosition: child.position.clone(),
                baseRotation: child.rotation.clone(),
              });
            }
            if (browNodeNames.has(child.name)) {
              browNodes.push({
                node: child,
                basePosition: child.position.clone(),
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
          eyeRig: eyeMeshes.length > 0 ? { meshes: eyeMeshes, sensitivity: project.id === "krate" ? 3.2 : 1 } : undefined,
          browRig: browNodes.length > 0 ? browNodes : undefined,
        };
      });
    });

    // Click detection
    let downX = 0,
      downY = 0,
      dragDX = 0;

    const hitProjectAt = (clientX: number, clientY: number) => {
      const loadedObjects = projectObjects.filter(Boolean);
      if (loadedObjects.length === 0) return undefined;

      const ndc = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        (clientY / window.innerHeight) * -2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(
        loadedObjects.map(({ group }) => group),
        true,
      )[0];
      if (hit) {
        return loadedObjects.find(({ group }) => {
          let current: THREE.Object3D | null = hit.object;
          while (current) {
            if (current === group) return true;
            current = current.parent;
          }
          return false;
        });
      }

      const krateObject = projectObjects[1];
      if (!krateObject || !carouselOpenRef.current || activeProjectRef.current !== 1) return undefined;

      const center = new THREE.Vector3();
      krateObject.group.getWorldPosition(center);
      const edge = center.clone().add(new THREE.Vector3(krateObject.maxDim * krateObject.group.scale.x * 0.46, 0, 0));
      const centerScreen = center.clone().project(camera);
      const edgeScreen = edge.project(camera);
      const centerX = ((centerScreen.x + 1) / 2) * window.innerWidth;
      const centerY = ((1 - centerScreen.y) / 2) * window.innerHeight;
      const edgeX = ((edgeScreen.x + 1) / 2) * window.innerWidth;
      const edgeY = ((1 - edgeScreen.y) / 2) * window.innerHeight;
      const krateRadius = Math.max(72, Math.hypot(edgeX - centerX, edgeY - centerY) * 1.28);

      return Math.hypot(clientX - centerX, clientY - centerY) <= krateRadius ? krateObject : undefined;
    };

    const setKrateCue = (next: boolean) => {
      if (krateEasterCueRef.current === next) return;
      krateEasterCueRef.current = next;
      setKrateEasterCue(next);
    };

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

      const clickedProject = hitProjectAt(e.clientX, e.clientY);

      if (!clickedProject) return;

      if (!carouselOpenRef.current) {
        openCarousel();
        return;
      }

      // Easter egg: click krate again while it's already the active project — desktop only
      if (clickedProject.index === 1 && activeProjectRef.current === 1 && e.pointerType !== "touch" && window.innerWidth >= 768) {
        triggerHiddenRoomTransition();
        return;
      }

      selectProject(clickedProject.index);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    const onPointerMove = (e: PointerEvent) => {
      rootRef.current?.style.setProperty("--krate-cursor-x", `${e.clientX}px`);
      rootRef.current?.style.setProperty("--krate-cursor-y", `${e.clientY}px`);
      pointerTarget.set(
        THREE.MathUtils.clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1),
        THREE.MathUtils.clamp((e.clientY / window.innerHeight) * -2 + 1, -1, 1),
      );
      const isDesktopPointer = e.pointerType !== "touch" && window.innerWidth >= 768;
      if (!isDesktopPointer) {
        setKrateCue(false);
        return;
      }

      const hitProject = hitProjectAt(e.clientX, e.clientY);
      setKrateCue(
        carouselOpenRef.current &&
          activeProjectRef.current === 1 &&
          hitProject?.index === 1,
      );
    };

    const onPointerLeave = () => {
      pointerTarget.set(0, 0);
      setKrateCue(false);
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
          (responsiveModelSize() / maxDim) * (PROJECTS[index].scaleFactor ?? 1) * (0.76 + focus * 0.28);

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
          const s = projectObject.eyeRig.sensitivity;
          const gazeX = pointerCurrent.x * (0.008 + focus * 0.01) * s;
          const gazeY = pointerCurrent.y * (0.006 + focus * 0.008) * s;
          projectObject.eyeRig.meshes.forEach(({ mesh, basePosition, baseRotation }) => {
            mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, basePosition.x + gazeX, 0.18);
            mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, basePosition.y + gazeY, 0.18);
            mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, baseRotation.y + pointerCurrent.x * 0.045 * s, 0.14);
            mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, baseRotation.x - pointerCurrent.y * 0.035 * s, 0.14);
          });
        }
        if (projectObject.browRig) {
          const browX = pointerCurrent.x * (0.018 + focus * 0.022);
          const browY = pointerCurrent.y * (0.028 + focus * 0.032);
          projectObject.browRig.forEach(({ node, basePosition }) => {
            node.position.x = THREE.MathUtils.lerp(node.position.x, basePosition.x + browX, 0.14);
            node.position.y = THREE.MathUtils.lerp(node.position.y, basePosition.y + browY, 0.14);
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
  }, [openCarousel, selectProject, triggerHiddenRoomTransition]);

  return (
    <div
      ref={rootRef}
      className="clouds-portfolio-room w-dvw h-dvh relative transition-opacity duration-700 overflow-hidden"
      style={{
        width: "100dvw",
        height: "100dvh",
        background: "#e9e5e0",
        opacity: show ? 1 : 0,
        cursor: hiddenRoomTransition ? "none" : undefined,
        ["--krate-cursor-x" as string]: "50vw",
        ["--krate-cursor-y" as string]: "50vh",
      }}
    >
      <style>{`
        @keyframes krateCursorCore {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(0deg) scale(0.94);
            filter: drop-shadow(0 0 5px rgba(211, 50, 47, 0.34));
          }
          50% {
            transform: translate(-50%, -50%) rotate(18deg) scale(1.08);
            filter: drop-shadow(0 0 13px rgba(211, 50, 47, 0.62));
          }
        }
        @keyframes krateCursorWind {
          0% {
            transform: translate(4px, -50%) scaleX(0.72);
            opacity: 0.16;
          }
          50% {
            transform: translate(-18px, -50%) scaleX(1.16);
            opacity: 0.62;
          }
          100% {
            transform: translate(-34px, -50%) scaleX(0.64);
            opacity: 0;
          }
        }
        @keyframes hiddenRoomWash {
          0% {
            opacity: 0;
            background: rgba(0, 0, 0, 0);
          }
          34% {
            opacity: 0.24;
            background: rgba(0, 0, 0, 0.22);
          }
          100% {
            opacity: 1;
            background: rgba(0, 0, 0, 0.78);
          }
        }
        @keyframes hiddenRoomPortal {
          0% {
            left: var(--krate-cursor-x);
            top: var(--krate-cursor-y);
            opacity: 0.95;
            transform: translate(-50%, -50%) rotate(0deg) scale(0.62);
          }
          26% {
            left: 50%;
            top: 50%;
            opacity: 1;
            transform: translate(-50%, -50%) rotate(0deg) scale(1.12);
          }
          82% {
            left: 50%;
            top: 50%;
            opacity: 1;
            transform: translate(-50%, -50%) rotate(1800deg) scale(1.42);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(1800deg) scale(1.78);
          }
        }
      `}</style>
      <div className="clouds-room-grid" aria-hidden="true" />

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          width: "100%",
          height: "100%",
          cursor: (krateEasterCue || hiddenRoomTransition) && !isMobileLayout
            ? "none"
            : carouselOpen ? "grab" : "pointer",
        }}
      />

      {hiddenRoomTransition && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 900,
            pointerEvents: "none",
            overflow: "hidden",
            animation: "hiddenRoomWash 2300ms cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          <div
            style={{
              position: "fixed",
              left: "var(--krate-cursor-x)",
              top: "var(--krate-cursor-y)",
              width: 96,
              height: 96,
              animation: "hiddenRoomPortal 2300ms cubic-bezier(0.12, 0.86, 0.18, 1) both",
              mixBlendMode: "screen",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 45,
                top: 0,
                width: 6,
                height: 96,
                background: "rgba(211, 50, 47, 0.96)",
                boxShadow: "0 0 18px rgba(211, 50, 47, 0.62)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 45,
                width: 96,
                height: 6,
                background: "rgba(211, 50, 47, 0.96)",
                boxShadow: "0 0 18px rgba(211, 50, 47, 0.62)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 21,
                top: 21,
                width: 54,
                height: 54,
                border: "5px solid rgba(233, 229, 224, 0.9)",
                boxShadow: "0 0 24px rgba(211, 50, 47, 0.62), inset 0 0 16px rgba(211, 50, 47, 0.42)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 40,
                top: 40,
                width: 16,
                height: 16,
                background: "#0c0c0c",
                boxShadow: "0 0 14px rgba(211, 50, 47, 0.8)",
              }}
            />
          </div>
        </div>
      )}

      {krateEasterCue && !hiddenRoomTransition && !isMobileLayout && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "var(--krate-cursor-x)",
            top: "var(--krate-cursor-y)",
            width: 62,
            height: 62,
            pointerEvents: "none",
            zIndex: 80,
            mixBlendMode: "screen",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 50,
              height: 50,
              transform: "translate(-50%, -50%)",
              animation: "krateCursorCore 980ms ease-in-out infinite",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 22,
                top: 2,
                width: 6,
                height: 46,
                background: "rgba(211, 50, 47, 0.92)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 2,
                top: 22,
                width: 46,
                height: 6,
                background: "rgba(211, 50, 47, 0.92)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 13,
                top: 13,
                width: 24,
                height: 24,
                border: "3px solid rgba(244, 240, 234, 0.86)",
                boxShadow: "0 0 12px rgba(211, 50, 47, 0.42)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 21,
                top: 21,
                width: 8,
                height: 8,
                background: "#0c0c0c",
              }}
            />
          </span>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{
                position: "absolute",
                left: 10 - index * 5,
                top: 26 + index * 6,
                width: 38 - index * 7,
                height: 3,
                background: index === 1 ? "rgba(244, 240, 234, 0.58)" : "rgba(211, 50, 47, 0.74)",
                animation: `krateCursorWind ${620 + index * 130}ms ease-out infinite`,
                animationDelay: `${index * 90}ms`,
                transformOrigin: "right center",
              }}
            />
          ))}
        </div>
      )}

      <ProjectCard
        visible={showProject}
        project={PROJECTS[activeProject]}
        carouselOpen={carouselOpen}
        isMobile={isMobileLayout}
        showEasterCue={!isMobileLayout && krateEasterCue && !hiddenRoomTransition}
        onPrev={selectPrev}
        onNext={selectNext}
      />

      {showEaster && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
          onKeyDown={e => { if (e.key === 'Escape') setShowEaster(false) }}
        >
          <EasterGame />
        </div>
      )}
    </div>
  );
}

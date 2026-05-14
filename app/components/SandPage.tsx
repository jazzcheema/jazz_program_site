"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import GridMouseTrail from "./GridMouseTrail";

export default function SandPage() {
  const [show, setShow] = useState(false);
  const [reveal, setReveal] = useState(0);
  const roomRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let lastPointerX = pointerX;
    let lastPointerY = pointerY;
    let lastRevealPaint = 0;

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (window.innerWidth >= 768) {
        targetX = (event.clientX / window.innerWidth - 0.5) * 2;
        targetY = (event.clientY / window.innerHeight - 0.5) * 2;
      }
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;
      roomRef.current?.style.setProperty("--grid-x", (currentX * 24).toFixed(2));
      roomRef.current?.style.setProperty("--grid-y", (currentY * 24).toFixed(2));

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const radius = Math.min(236, Math.min(window.innerWidth, window.innerHeight) * 0.34);
      const distanceFromCenter = Math.hypot(pointerX - centerX, pointerY - centerY);
      const centerStrength = Math.max(0, 1 - distanceFromCenter / radius);
      const pointerTravel = Math.hypot(pointerX - lastPointerX, pointerY - lastPointerY);

      if (centerStrength > 0 && pointerTravel > 0.35 && revealRef.current < 1) {
        const sift = Math.min(1, pointerTravel / 18) * centerStrength ** 1.45;
        revealRef.current = Math.min(1, revealRef.current + sift * 0.035);

        if (now - lastRevealPaint > 34 || revealRef.current === 1) {
          lastRevealPaint = now;
          setReveal(revealRef.current);
        }
      }

      lastPointerX = pointerX;
      lastPointerY = pointerY;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const cacheOpacity = Math.max(0, Math.min(1, (reveal - 0.12) / 0.88));
  const cacheStyle = {
    "--sand-reveal": reveal.toFixed(3),
    "--sand-cover": (1 - cacheOpacity).toFixed(3),
    "--sand-cover-strong": ((1 - cacheOpacity) * 0.94).toFixed(3),
    "--sand-cover-warm": ((1 - cacheOpacity) * 0.1).toFixed(3),
    "--sand-cover-neutral": ((1 - cacheOpacity) * 0.08).toFixed(3),
    opacity: cacheOpacity,
    filter: `blur(${(1 - cacheOpacity) * 7}px)`,
    pointerEvents: reveal > 0.68 ? "auto" : "none",
  } as CSSProperties;

  return (
    <main
      ref={roomRef}
      className="sand-kingdom-room"
      style={{ opacity: show ? 1 : 0 }}
    >
      <div className="sand-kingdom-grid" aria-hidden="true" />
      <GridMouseTrail />
      <div className="sand-email-cache" style={cacheStyle}>
        <a
          className="sand-email-flip"
          href="mailto:thecyberfoolz@gmail.com"
          aria-label="Email thecyberfoolz@gmail.com"
          tabIndex={reveal > 0.68 ? 0 : -1}
        >
          <span className="sand-email-default">CONTACT</span>
          <span className="sand-email-reveal">EMAIL</span>
        </a>
      </div>
    </main>
  );
}

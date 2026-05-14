"use client";

import { useEffect, useRef, useState } from "react";
import GridMouseTrail from "./GridMouseTrail";

export default function SandPage() {
  const [show, setShow] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 768) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const onMouseMove = (event: MouseEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;
      roomRef.current?.style.setProperty("--grid-x", (currentX * 24).toFixed(2));
      roomRef.current?.style.setProperty("--grid-y", (currentY * 24).toFixed(2));
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main
      ref={roomRef}
      className="sand-kingdom-room"
      style={{ opacity: show ? 1 : 0 }}
    >
      <div className="sand-kingdom-grid" aria-hidden="true" />
      <GridMouseTrail />
    </main>
  );
}

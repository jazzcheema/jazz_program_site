"use client";

import { useEffect, useRef, useState } from "react";
import CarpetScene from "./CarpetScene";
import CloudsPage from "./CloudsPage";
import SandPage from "./SandPage";
import CVPage from "./CVPage";

export default function SceneWrapper() {
  const [reached, setReached] = useState(false);
  const [reachedSand, setReachedSand] = useState(false);
  const [reachedBooks, setReachedBooks] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [showMobileGate, setShowMobileGate] = useState(false);
  const [gateVisible, setGateVisible] = useState(false);
  const homeRoomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isMobile = window.innerWidth < 768 && "ontouchstart" in window;
    const seen = localStorage.getItem("mobile-gate-seen");
    if (isMobile && !seen) {
      let visibleTimer: ReturnType<typeof setTimeout> | null = null;
      const showTimer = setTimeout(() => {
        setShowMobileGate(true);
        visibleTimer = setTimeout(() => setGateVisible(true), 60);
      }, 0);
      return () => {
        clearTimeout(showTimer);
        if (visibleTimer) clearTimeout(visibleTimer);
      };
    }
  }, []);

  useEffect(() => {
    if (reached || reachedSand || reachedBooks) return;
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768) return;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let frame = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;
      const el = homeRoomRef.current;
      if (el) {
        el.style.setProperty("--grid-x", String((currentX * 24).toFixed(2)));
        el.style.setProperty("--grid-y", String((currentY * 24).toFixed(2)));
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(frame);
    };
  }, [reached, reachedSand, reachedBooks]);

  const handleReachClouds = () => {
    setFlashing(true);
    setTimeout(() => {
      setReached(true);
      setFlashing(false);
    }, 450);
  };

  const handleReachSandcastle = () => {
    setFlashing(true);
    setTimeout(() => {
      setReachedSand(true);
      setFlashing(false);
    }, 450);
  };

  const handleReachBooks = () => {
    setFlashing(true);
    setTimeout(() => {
      setReachedBooks(true);
      setFlashing(false);
    }, 450);
  };

  if (showMobileGate)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#e2deda",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: gateVisible ? 1 : 0,
          transition: "opacity 500ms ease",
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: "min(300px, calc(100vw - 3rem))",
            background: "#c87820",
            clipPath:
              "polygon(18px 0%, calc(100% - 18px) 0%, 100% 18px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 0% calc(100% - 18px), 0% 18px)",
            padding: "36px 32px 28px",
            fontFamily: "var(--font-geist-mono)",
            color: "#0c0c0c",
          }}
        >
          {/* Icon row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: "2px solid #0c0c0c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 900,
                flexShrink: 0,
                clipPath:
                  "polygon(6px 0%, calc(100% - 6px) 0%, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0% calc(100% - 6px), 0% 6px)",
              }}
            >
              !
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.65 }}>
              SYS-ADV // ENV_CHECK
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              lineHeight: 1.25,
              marginBottom: 4,
            }}
          >
            DESKTOP
            <br />
            RECOMMENDED
          </div>

          {/* Rule */}
          <div style={{ height: 1, background: "rgba(12,12,12,0.25)", margin: "12px 0" }} />

          {/* Body */}
          <div style={{ fontSize: 10, lineHeight: 1.7, letterSpacing: "0.03em", opacity: 0.85, marginBottom: 20 }}>
            This experience was built for a wide viewport: 3D scenes, cinematic camera moves, and interactive controls are optimised for desktop.
            <br /><br />
            → OPTIMAL: Desktop or laptop<br />
            → Ensure your browser is fully up to date<br />
            → Mobile renders a reduced version<br />
            → Some 3D scenes and additional rooms are desktop-only
          </div>

          {/* Rule */}
          <div style={{ height: 1, background: "rgba(12,12,12,0.25)", marginBottom: 16 }} />

          {/* Button */}
          <button
            type="button"
            className="mobile-gate-btn"
            onClick={() => {
              localStorage.setItem("mobile-gate-seen", "1");
              setShowMobileGate(false);
            }}
          >
            <span className="mobile-gate-btn-default">→ ENTER_SITE</span>
            <span className="mobile-gate-btn-reveal">→ CONFIRM_ENTRY</span>
          </button>
        </div>
      </div>
    );

  if (reached) return <CloudsPage />;
  if (reachedSand) return <SandPage />;
  if (reachedBooks) return <CVPage />;

  return (
    <div
      ref={homeRoomRef}
      className="home-room w-dvw h-dvh overflow-hidden relative"
      style={{ width: "100dvw", height: "100dvh", background: "#e2deda" }}
    >
      <div className="absolute inset-0">
        <CarpetScene
          onReachClouds={handleReachClouds}
          onReachSandcastle={handleReachSandcastle}
          onReachBooks={handleReachBooks}
        />
      </div>

      {/* White flash on reach */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-300"
        style={{ background: "#ffffff", opacity: flashing ? 1 : 0, zIndex: 50 }}
      />
    </div>
  );
}

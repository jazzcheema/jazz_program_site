"use client";

import { useEffect, useState } from "react";
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
          background: "#09090e",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "max(1.5rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-left))",
          fontFamily: "var(--font-geist-mono)",
          opacity: gateVisible ? 1 : 0,
          transition: "opacity 500ms ease",
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: "min(26rem, calc(100vw - 3rem))",
          }}
        >
          <div
            style={{
              color: "#c87820",
              fontSize: "0.52rem",
              letterSpacing: "0.18em",
              marginBottom: "1.1rem",
            }}
          >
            → SYS_ADVISORY // ENV_CHECK
          </div>

          <h1
            style={{
              color: "#ededed",
              fontSize: "clamp(1.5rem, 7vw, 2rem)",
              fontWeight: 400,
              letterSpacing: "0.02em",
              lineHeight: 1.06,
              margin: "0 0 1.1rem",
            }}
          >
            DESKTOP_
            <br />
            RECOMMENDED
          </h1>

          <p
            style={{
              color: "#6c6c6c",
              fontSize: "0.68rem",
              lineHeight: 1.65,
              margin: "0 0 1.6rem",
            }}
          >
            This experience was built for a wide viewport: 3D scenes, cinematic
            camera moves, and interactive controls are optimised for desktop.
          </p>

          <div
            style={{
              color: "#383838",
              fontSize: "0.52rem",
              letterSpacing: "0.12em",
              lineHeight: 1.8,
              marginBottom: "2rem",
              borderLeft: "1px solid #1e1e1e",
              paddingLeft: "0.8rem",
            }}
          >
            <div>→ OPTIMAL: Desktop or laptop</div>
            <div>→ BROWSER: Chrome / Safari / Firefox / Arc — latest</div>
            <div>→ Mobile renders a reduced version</div>
          </div>

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

          <div
            style={{
              marginTop: "1.6rem",
              color: "#242424",
              fontSize: "0.42rem",
              letterSpacing: "0.1em",
            }}
          >
            VER.01.09.26 // JAZZ.CHEEMA SYSTEMS
          </div>
        </div>
      </div>
    );

  if (reached) return <CloudsPage />;
  if (reachedSand) return <SandPage />;
  if (reachedBooks) return <CVPage />;

  return (
    <div
      className="home-room w-dvw h-dvh overflow-hidden relative"
      style={{ width: "100dvw", height: "100dvh", background: "#e9e5e0" }}
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

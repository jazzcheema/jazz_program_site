"use client";

import { useEffect, useState } from "react";
import CarpetScene from "./CarpetScene";
import InfoPanel from "./InfoPanel";
import CloudsPage from "./CloudsPage";
import SandPage from "./SandPage";
import CVPage from "./CVPage";
import VortexBackground from "./VortexBackground";
import WindTextChars from "./WindTextChars";
import type { ObjectData } from "../data/objects";

const CARPET_DATA: ObjectData = {
  id: "carpet",
  file: "/models/carpet.glb",
  label: "TRANSPORT_UNIT_CARPET",
  shortLabel: "CARPET-01",
  class: "LOCOMOTION / AERIAL — ENCHANTED",
  status: "AWAITING_PILOT",
  eqLabel: "LEVITATION_FREQ / Hz",
  eqBars: [
    { hz: "31Hz", pct: 92 },
    { hz: "63Hz", pct: 80 },
    { hz: "125Hz", pct: 65 },
    { hz: "250Hz", pct: 50 },
    { hz: "500Hz", pct: 38 },
    { hz: "1kHz", pct: 28 },
    { hz: "2kHz", pct: 20 },
    { hz: "4kHz", pct: 14 },
    { hz: "8kHz", pct: 9 },
  ],
  specsLabel: "MISSION_BRIEF",
  specs: [
    ["MISSION", "FLY CARPET INTO CLOUDS"],
    ["TARGET", "SECTOR-TR / TOP-RIGHT"],
    ["ALTITUDE", "CLOUD-LEVEL / HIGH"],
    ["PROPULSION", "MAGICAL_LEVITATION / CLASS-IV"],
    ["WARNING", "⚠ CARPET WILL RESIST PILOT"],
    ["CONDITION", "AIRWORTHY / ENCHANTMENT ACTIVE"],
  ],
  scanLabel: "MATERIAL_SCAN",
  materials: [
    ["SURFACE_A", "ENCHNTD_SLK", "PBR", "IOR: 1.540"],
    ["SURFACE_B", "GOLD_THREAD", "0.92", "ROUGHNESS: 0.05"],
    ["WEAVE", "PERSIAN_PTRN", "PROC", "DENSITY: 480 TPI"],
    ["ENCHANT", "CLASS-IV_AURA", "EMIT", "LUMINANCE: 0.40"],
  ],
  finePrint:
    "© 2026 JAZZ.CHEEMA SYSTEMS (INTL) LTD. AERIAL TRANSPORT MANIFEST: CARPET-CLASS-IV / ENCHANTMENT_CERT: AX-8812-CARPET-AERIAL / MISSION: FLY_TO_CLOUDS / TARGET: SECTOR-TR / WARNING: RESISTANCE_EXPECTED / NOT_FOR_COMMERCIAL_USE / PILOT_ASSUMES_ALL_RISK //////// VER.01.09.26",
};

export default function SceneWrapper() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [reached, setReached] = useState(false);
  const [reachedSand, setReachedSand] = useState(false);
  const [reachedBooks, setReachedBooks] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [identityActive, setIdentityActive] = useState(false);
  const [showMobileGate, setShowMobileGate] = useState(false);
  const [gateVisible, setGateVisible] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 768 && "ontouchstart" in window;
    if (isMobile) {
      setShowMobileGate(true);
      const t = setTimeout(() => setGateVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setIdentityActive(true), 180);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("carpet-panel-open", { detail: panelOpen }),
    );
  }, [panelOpen]);

  const handleReachClouds = () => {
    setPanelOpen(false);
    setFlashing(true);
    setTimeout(() => {
      setReached(true);
      setFlashing(false);
    }, 450);
  };

  const handleReachSandcastle = () => {
    setPanelOpen(false);
    setFlashing(true);
    setTimeout(() => {
      setReachedSand(true);
      setFlashing(false);
    }, 450);
  };

  const handleReachBooks = () => {
    setPanelOpen(false);
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
            onClick={() => setShowMobileGate(false)}
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
      className="w-dvw h-dvh overflow-hidden relative"
      style={{ width: "100dvw", height: "100dvh", background: "#09090e" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <VortexBackground
          className="w-full h-full"
          hues={[28, 195, 262]}
          saturation={72}
          lightness={62}
          particleMultiplier={2.6}
          alphaMultiplier={2.2}
          backgroundFill="rgba(9, 9, 13, 0.32)"
        />
      </div>

      <div className="absolute inset-0">
        <CarpetScene
          onCarpetClick={() => setPanelOpen((prev) => !prev)}
          onReachClouds={handleReachClouds}
          onReachSandcastle={handleReachSandcastle}
          onReachBooks={handleReachBooks}
        />
      </div>

      <InfoPanel
        open={panelOpen}
        data={CARPET_DATA}
        onClose={() => setPanelOpen(false)}
      />

      <div
        className="home-identity"
        data-hidden={panelOpen}
        aria-hidden={panelOpen}
        aria-label="Jazz Cheema, Software Engineer"
      >
        <h1>
          <WindTextChars
            active={identityActive}
            text="Jazz Cheema"
            baseDelay={80}
            stagger={58}
            mode="chars"
          />
        </h1>
        <p>
          <WindTextChars
            active={identityActive}
            text="Software Engineer"
            baseDelay={520}
            stagger={36}
            mode="chars"
          />
        </p>
      </div>

      {/* White flash on reach */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-300"
        style={{ background: "#ffffff", opacity: flashing ? 1 : 0, zIndex: 50 }}
      />

      {/* Hint */}
      {!panelOpen && (
        <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div
            style={{
              color: "#484848",
              fontFamily: "var(--font-geist-mono)",
              fontSize: "clamp(0.58rem, 0.68vw, 0.68rem)",
              letterSpacing: "0.1em",
              whiteSpace: "nowrap",
            }}
          >
            → CLICK CARPET FOR MISSION DATA → DRAG TO CLOUDS, SANDCASTLE, OR BOOKS
          </div>
        </div>
      )}
    </div>
  );
}

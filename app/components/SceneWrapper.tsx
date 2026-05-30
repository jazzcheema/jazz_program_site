"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import CarpetScene from "./CarpetScene";
import CloudsPage from "./CloudsPage";
import SandPage from "./SandPage";
import CVPage from "./CVPage";
import GridMouseTrail from "./GridMouseTrail"

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','a','b','Enter']

export default function SceneWrapper() {
  const [reached, setReached] = useState(false);
  const [reachedSand, setReachedSand] = useState(false);
  const [reachedBooks, setReachedBooks] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [showMobileGate, setShowMobileGate] = useState(false);
  const [gateVisible, setGateVisible] = useState(false);
  const [bfgUnlocked, setBfgUnlocked] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.75);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioControlOpen, setAudioControlOpen] = useState(false);
  const [bfgExiting, setBfgExiting] = useState(false);
  const [bfgReturning, setBfgReturning] = useState(false);
  const homeRoomRef = useRef<HTMLDivElement>(null);
  const konamiProgress = useRef(0);
  const bfgFlashRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === KONAMI[konamiProgress.current]) {
        konamiProgress.current++
        if (konamiProgress.current === KONAMI.length) {
          setBfgUnlocked(true)
          konamiProgress.current = 0
        }
      } else {
        konamiProgress.current = e.key === KONAMI[0] ? 1 : 0
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bfg-active', { detail: bfgUnlocked && !bfgExiting }))
  }, [bfgUnlocked, bfgExiting])

  useEffect(() => {
    if (!bfgUnlocked) return
    const el = bfgFlashRef.current
    if (!el) return
    // Power-surge flicker: three bursts of decreasing intensity
    const seq: [number, number][] = [
      [280,  1.0],
      [370,  0],
      [460,  0.62],
      [520,  0],
      [580,  0.28],
      [650,  0],
    ]
    const timers = seq.map(([delay, opacity]) =>
      setTimeout(() => { el.style.opacity = String(opacity) }, delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [bfgUnlocked])

  // Lazy-load audio + auto-play + auto-expand pill after BFG reveal
  useEffect(() => {
    if (!bfgUnlocked) return
    const audio = audioRef.current
    if (!audio) return
    audio.src = '/audio/muslimgauze.mp3'
    audio.volume = audioVolume
    audio.load()
    audio.play().then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false))
    const t = setTimeout(() => setAudioControlOpen(true), 3200)

    let wasPlaying = false
    const onVisibility = () => {
      if (document.hidden) {
        wasPlaying = !audio.paused
        if (wasPlaying) audio.pause()
      } else {
        if (wasPlaying) audio.play().then(() => setAudioPlaying(true)).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [bfgUnlocked])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = audioVolume
  }, [audioVolume])

  useEffect(() => {
    if (!bfgReturning) return
    const audio = audioRef.current
    if (!audio) return
    const startVolume = audio.volume
    const startedAt = performance.now()
    const duration = 2600
    const fade = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - startedAt) / duration)
      audio.volume = startVolume * (1 - p)
      if (p >= 1) {
        window.clearInterval(fade)
        audio.pause()
        setAudioPlaying(false)
      }
    }, 40)
    return () => {
      window.clearInterval(fade)
      if (audioRef.current && !bfgReturning) audioRef.current.volume = audioVolume
    }
  }, [bfgReturning, audioVolume])

  const toggleAudio = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false))
    } else {
      audio.pause()
      setAudioPlaying(false)
    }
  }

  const preventAudioEnter = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") e.preventDefault()
  }

  const beginBfgExit = () => {
    if (bfgExiting) return
    setBfgExiting(true)
    setBfgReturning(false)
    setAudioControlOpen(false)
  }

  const beginBfgReturn = () => {
    setBfgReturning(true)
  }

  const finishBfgExit = () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute("src")
      audio.volume = audioVolume
      audio.load()
    }
    setAudioPlaying(false)
    setAudioTime(0)
    setAudioDuration(0)
    setBfgUnlocked(false)
    setBfgExiting(false)
    setBfgReturning(false)
  }

  const seekAudio = (value: number) => {
    const audio = audioRef.current
    if (!audio || !audioDuration) return
    audio.currentTime = value
    setAudioTime(value)
  }

  const formatAudioTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

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
      style={{
        width: "100dvw",
        height: "100dvh",
        background: bfgUnlocked && !bfgReturning ? "#080906" : "#e2deda",
        transition: "background 4.2s ease",
      }}
    >
      <GridMouseTrail eerie={bfgUnlocked && !bfgExiting} />

      <div className="absolute inset-0">
        <CarpetScene
          onReachClouds={handleReachClouds}
          onReachSandcastle={handleReachSandcastle}
          onReachBooks={handleReachBooks}
          showBfg={bfgUnlocked}
          bfgExiting={bfgExiting}
          onBfgReturnStart={beginBfgReturn}
          onBfgExitComplete={finishBfgExit}
          audioRef={audioRef}
        />
      </div>

      {/* BFG audio pill */}
      {bfgUnlocked && (
        <div
          className="sand-audio-control bfg-audio-control"
          data-expanded={audioControlOpen ? "true" : "false"}
          data-ready="true"
          style={{
            zIndex: 70,
            cursor: "pointer",
            opacity: bfgExiting ? 0 : 1,
            transform: bfgExiting ? "translate(-50%, 1rem) scale(0.96)" : undefined,
            transition: "opacity 2400ms ease, transform 2400ms ease",
            pointerEvents: bfgExiting ? "none" : "auto",
          }}
          onClick={() => setAudioControlOpen(o => !o)}
          onKeyDown={preventAudioEnter}
          onKeyUp={preventAudioEnter}
        >
          <audio
            ref={audioRef}
            loop
            onPlay={() => setAudioPlaying(true)}
            onPause={() => setAudioPlaying(false)}
            onTimeUpdate={(e) => setAudioTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
          />
          <span className="sand-audio-seal" aria-hidden="true">×</span>
          <div className="sand-audio-strip">
            <button
              className="sand-audio-toggle"
              type="button"
              aria-label={audioPlaying ? "Pause audio" : "Play audio"}
              onClick={(e) => { e.stopPropagation(); toggleAudio() }}
            >
              <span className={audioPlaying ? "sand-audio-pause-icon" : "sand-audio-play-icon"} aria-hidden="true" />
            </button>
            <span className="sand-audio-time">
              {formatAudioTime(audioTime)} / {formatAudioTime(audioDuration)}
            </span>
            <input
              className="sand-audio-progress"
              type="range"
              min="0"
              max={audioDuration || 0}
              step="0.1"
              value={audioDuration ? Math.min(audioTime, audioDuration) : 0}
              aria-label="Audio position"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => seekAudio(Number(e.target.value))}
            />
            <span className="sand-audio-speaker" aria-hidden="true" />
            <input
              className="sand-audio-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audioVolume}
              aria-label="Audio volume"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { e.stopPropagation(); setAudioVolume(Number(e.target.value)) }}
            />
          </div>
        </div>
      )}

      {bfgUnlocked && !bfgExiting && (
        <button
          type="button"
          className="bfg-exit-btn"
          style={{ zIndex: 1200 }}
          onClick={beginBfgExit}
          aria-label="Drain BFG mode"
        >
          DRAIN
        </button>
      )}

      {/* White flash on reach */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-300"
        style={{ background: "#ffffff", opacity: flashing ? 1 : 0, zIndex: 50 }}
      />

      {/* BFG power-surge flicker */}
      <div
        ref={bfgFlashRef}
        className="fixed inset-0 pointer-events-none"
        style={{ background: "#ffffff", opacity: 0, zIndex: 60 }}
      />
    </div>
  );
}

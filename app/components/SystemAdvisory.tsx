'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'jazz-sys-advisory-v1'

export default function SystemAdvisory() {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const isMobile = 'ontouchstart' in window || window.innerWidth < 1024
    if (isMobile) return
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
    setMounted(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!mounted || !visible) return null

  return (
    <>
      <div
        aria-hidden="true"
        onClick={dismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: 'rgba(12, 12, 12, 0.65)',
          backdropFilter: 'blur(4px)',
          animation: 'sysadv-fade 220ms ease forwards',
        }}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="System Advisory"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9001,
          width: 300,
          background: '#c87820',
          clipPath:
            'polygon(18px 0%, calc(100% - 18px) 0%, 100% 18px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 0% calc(100% - 18px), 0% 18px)',
          padding: '36px 32px 28px',
          fontFamily: 'var(--font-geist-mono)',
          color: '#0c0c0c',
          animation: 'sysadv-in 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Icon row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: '2px solid #0c0c0c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 900,
              flexShrink: 0,
              clipPath:
                'polygon(6px 0%, calc(100% - 6px) 0%, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0% calc(100% - 6px), 0% 6px)',
            }}
          >
            !
          </div>
          <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.65 }}>
            SYS-ADV // CLASS: NOTICE-A
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            lineHeight: 1.25,
            marginBottom: 4,
          }}
        >
          SYSTEM
          <br />
          REQUIREMENTS
        </div>

        {/* Rule */}
        <div style={{ height: 1, background: 'rgba(12,12,12,0.25)', margin: '12px 0' }} />

        {/* Body */}
        <div style={{ fontSize: 10, lineHeight: 1.7, letterSpacing: '0.03em', opacity: 0.85, marginBottom: 20 }}>
          This application utilises real-time 3D rendering and GPU-accelerated WebGL computation.
          <br /><br />
          → Ensure your OS and browser are fully up to date.<br />
          → A stable broadband connection is required.<br />
          → Performance may vary on older hardware.
          <br /><br />
          This site is engineered to push your machine.
        </div>

        {/* Rule */}
        <div style={{ height: 1, background: 'rgba(12,12,12,0.25)', marginBottom: 16 }} />

        {/* Button */}
        <button
          onClick={dismiss}
          className="sysadv-btn"
        >
          <span className="sysadv-btn-default">CONFIRM &amp; CONTINUE →</span>
          <span className="sysadv-btn-reveal">→ SYSTEM CLEARED</span>
        </button>
      </div>

      <style>{`
        @keyframes sysadv-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sysadv-in {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .sysadv-btn {
          display: block;
          position: relative;
          overflow: hidden;
          width: 100%;
          padding: 11px 0;
          background: #0c0c0c;
          color: #c87820;
          border: none;
          font-family: var(--font-geist-mono);
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          font-weight: 700;
          clip-path: polygon(6px 0%, calc(100% - 6px) 0%, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0% calc(100% - 6px), 0% 6px);
          transition: background 160ms ease, color 160ms ease;
        }
        .sysadv-btn-default,
        .sysadv-btn-reveal {
          display: block;
          transition: opacity 140ms ease, transform 140ms ease;
        }
        .sysadv-btn-reveal {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(0.3rem);
        }
        .sysadv-btn:hover,
        .sysadv-btn:focus-visible {
          background: #c8c8c8;
          color: #0c0c0c;
        }
        .sysadv-btn:hover .sysadv-btn-default,
        .sysadv-btn:focus-visible .sysadv-btn-default {
          opacity: 0;
          transform: translateY(-0.3rem);
        }
        .sysadv-btn:hover .sysadv-btn-reveal,
        .sysadv-btn:focus-visible .sysadv-btn-reveal {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </>
  )
}

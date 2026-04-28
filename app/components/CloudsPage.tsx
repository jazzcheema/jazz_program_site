'use client'

import { useEffect, useState } from 'react'

const MENU = [
  { label: 'PROJECTS',   count: '04', href: '#' },
  { label: 'EXPERIENCE', count: '03', href: '#' },
  { label: 'ABOUT',      count: '01', href: '#' },
  { label: 'CONTACT',    count: '01', href: '#' },
]

export default function CloudsPage() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="w-screen h-screen flex flex-col transition-opacity duration-700"
      style={{
        background: '#050510',
        opacity: show ? 1 : 0,
        fontFamily: 'var(--font-geist-mono)',
        color: '#c0ccff',
      }}
    >
      {/* Top bar */}
      <div
        className="flex justify-between items-center px-8 py-4 text-xs tracking-widest"
        style={{ borderBottom: '1px solid #0033aa', color: '#304080' }}
      >
        <span>JAZZ.CHEEMA_SYSTEMS // VER.01.09.26</span>
        <span>BUILD: 2026.04.29.001</span>
      </div>

      {/* Main content — vertically centered */}
      <div className="flex-1 flex flex-col justify-center px-16">

        {/* Header rule */}
        <div className="text-xs tracking-widest mb-8" style={{ color: '#0055ff' }}>
          ──────────────────────────────────── PORTFOLIO_INIT ────
        </div>

        {/* Name */}
        <div className="mb-2">
          <div className="text-xs tracking-widest mb-1" style={{ color: '#304080' }}>
            → DESIGNATION
          </div>
          <h1
            className="text-5xl font-bold tracking-tight leading-none"
            style={{ color: '#c0ccff', letterSpacing: '-0.02em' }}
          >
            J. CHEEMA
          </h1>
        </div>

        {/* Title */}
        <div className="mb-12">
          <div
            className="text-sm tracking-widest"
            style={{ color: '#0055ff' }}
          >
            SOFTWARE_ENGINEER / FULL_STACK / CREATIVE_TECH
          </div>
        </div>

        {/* Menu */}
        <div className="space-y-0" style={{ borderTop: '1px solid #0d0d2a' }}>
          {MENU.map(({ label, count, href }) => (
            <a
              key={label}
              href={href}
              className="flex items-center justify-between py-3 group transition-colors"
              style={{ borderBottom: '1px solid #0d0d2a' }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="text-xs tracking-widest transition-colors"
                  style={{ color: '#304080' }}
                >
                  →
                </span>
                <span
                  className="text-sm tracking-widest transition-colors group-hover:text-white"
                  style={{ color: '#a0b4e0' }}
                >
                  {label}
                </span>
              </div>
              <span className="text-xs tracking-widest" style={{ color: '#1a2a50' }}>
                [{count}]
              </span>
            </a>
          ))}
        </div>

        {/* Sub-rule */}
        <div className="text-xs tracking-widest mt-8" style={{ color: '#0d1a30' }}>
          ────────────────────────────────────────────────────────
        </div>

      </div>

      {/* Bottom bar */}
      <div
        className="flex justify-between items-center px-8 py-4 text-xs tracking-widest"
        style={{ borderTop: '1px solid #0033aa', color: '#1a2040', fontSize: '0.6rem', letterSpacing: '0.06em' }}
      >
        <span>© 2026 JAZZ.CHEEMA_SYSTEMS (INTL) LTD. ALL RIGHTS RESERVED. NOT FOR REDISTRIBUTION.</span>
        <span style={{ color: '#304080' }}>→</span>
      </div>
    </div>
  )
}

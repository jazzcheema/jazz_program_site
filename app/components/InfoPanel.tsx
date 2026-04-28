'use client'

import { useEffect, useState } from 'react'
import type { ObjectData } from '../data/objects'

// Per-bar wave config: alternating sine/square with unique freq + phase
const BAR_WAVE = [
  { type: 'sine',   freq: 0.018, amp: 6,  phase: 0.0 },
  { type: 'square', freq: 0.025, amp: 9,  phase: 0.8 },
  { type: 'sine',   freq: 0.021, amp: 7,  phase: 1.4 },
  { type: 'square', freq: 0.031, amp: 11, phase: 2.1 },
  { type: 'sine',   freq: 0.019, amp: 8,  phase: 0.5 },
  { type: 'square', freq: 0.015, amp: 7,  phase: 3.1 },
  { type: 'sine',   freq: 0.028, amp: 6,  phase: 1.8 },
  { type: 'square', freq: 0.023, amp: 8,  phase: 2.7 },
  { type: 'sine',   freq: 0.016, amp: 5,  phase: 0.3 },
] as const

interface InfoPanelProps {
  open: boolean
  data: ObjectData
  onClose: () => void
}

export default function InfoPanel({ open, data, onClose }: InfoPanelProps) {
  const [animPcts, setAnimPcts] = useState(() => data.eqBars.map(b => b.pct))

  useEffect(() => {
    let tick = 0
    const id = setInterval(() => {
      tick++
      setAnimPcts(data.eqBars.map((bar, i) => {
        const { type, freq, amp, phase } = BAR_WAVE[i] ?? BAR_WAVE[0]
        const wave = type === 'sine'
          ? Math.sin(tick * freq + phase)
          : Math.sign(Math.sin(tick * freq + phase))
        return Math.max(2, Math.min(99, Math.round(bar.pct + wave * amp)))
      }))
    }, 50)
    return () => clearInterval(id)
  }, [data])
  return (
    <div
      className="fixed top-0 right-0 h-full w-1/3 transition-transform duration-300 ease-in-out z-10 flex flex-col"
      style={{
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        background: '#06060e',
        borderLeft: '1px solid #0033aa',
        fontFamily: 'var(--font-geist-mono)',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #0033aa' }}>
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs tracking-widest mb-0.5" style={{ color: '#0055ff' }}>
              OBJECT_DATA.SYS ──────────────── VER.01.09.26
            </div>
            <div className="text-base font-bold tracking-widest" style={{ color: '#c0ccff' }}>
              → {data.label}
            </div>
            <div className="text-xs tracking-widest mt-0.5" style={{ color: '#304080' }}>
              CLASS: {data.class} / STATUS: [{data.status}]
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs tracking-widest hover:opacity-60 transition-opacity shrink-0"
            style={{ color: '#0055ff' }}
          >
            [×] CLOSE
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ scrollbarWidth: 'none' }}>

        {/* Spatial coords */}
        <section>
          <div className="text-xs tracking-widest mb-1.5" style={{ color: '#0055ff' }}>
            SPATIAL_COORDS ──────────────────────────────
          </div>
          <table className="w-full text-xs" style={{ color: '#a0b4e0' }}>
            <tbody>
              {[
                ['X', '+0.000', 'Y', '+0.023', 'Z', '+0.000'],
                ['ROT.X', '0.040 rad', 'ROT.Y', '0.785 rad', 'ROT.Z', '0.030 rad'],
                ['SCALE', '1.000×', 'POLY', '12,847 TRI', 'UV', 'MAPPED'],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="py-0.5 pr-2"
                      style={{ color: j % 2 === 0 ? '#304080' : '#a0b4e0', whiteSpace: 'nowrap' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* EQ / oscillation bars — unique per object */}
        <section>
          <div className="text-xs tracking-widest mb-2" style={{ color: '#0055ff' }}>
            {data.eqLabel} ───────────────────────────────
          </div>
          <div className="space-y-1">
            {data.eqBars.map(({ hz }, i) => {
              const pct = animPcts[i]
              return (
                <div key={hz} className="flex items-center gap-2">
                  <span className="text-xs w-10 text-right shrink-0" style={{ color: '#304080' }}>{hz}</span>
                  <div className="flex-1 h-2 relative" style={{ background: '#0a0a1e' }}>
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${pct}%`,
                        background: pct > 80 ? '#ff2244' : pct > 55 ? '#0055ff' : '#00aa55',
                      }}
                    />
                  </div>
                  <span className="text-xs w-6 shrink-0 tabular-nums" style={{ color: '#304080' }}>{pct}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Object-specific specs */}
        <section>
          <div className="text-xs tracking-widest mb-1.5" style={{ color: '#0055ff' }}>
            {data.specsLabel} ───────────────────────────────
          </div>
          {data.specs.map(([k, v], i) => (
            <div key={i} className="flex gap-2 text-xs py-0.5" style={{ borderBottom: '1px solid #0d0d2a' }}>
              <span className="w-24 shrink-0" style={{ color: '#304080' }}>{k}</span>
              <span style={{ color: '#a0b4e0' }}>{v}</span>
            </div>
          ))}
        </section>

        {/* Material / composition scan */}
        <section>
          <div className="text-xs tracking-widest mb-1.5" style={{ color: '#0055ff' }}>
            {data.scanLabel} ───────────────────────────────
          </div>
          {data.materials.map(([a, b, c, d], i) => (
            <div key={i} className="flex gap-2 text-xs py-0.5" style={{ borderBottom: '1px solid #0d0d2a' }}>
              <span className="w-20 shrink-0" style={{ color: '#304080' }}>{a}</span>
              <span className="w-20 shrink-0" style={{ color: '#a0b4e0' }}>{b}</span>
              <span className="w-10 shrink-0" style={{ color: '#a0b4e0' }}>{c}</span>
              <span style={{ color: '#607090' }}>{d}</span>
            </div>
          ))}
        </section>

        {/* Sys diag — always engine data */}
        <section>
          <div className="text-xs tracking-widest mb-1.5" style={{ color: '#0055ff' }}>
            SYS_DIAG ────────────────────────────────────
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            {[
              ['RENDERER',   'WebGL 2.0'],
              ['TONE_MAP',   'ACESFilmic'],
              ['FPS',        '60.0'],
              ['DRAW_CALLS', '3'],
              ['MEM_ALLOC',  '384 MB'],
              ['ANTIALIAS',  'ON / 2×'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between" style={{ borderBottom: '1px solid #0a0a1e' }}>
                <span style={{ color: '#304080' }}>{k}</span>
                <span style={{ color: '#a0b4e0' }}>{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Nav */}
        <section>
          <div className="text-xs tracking-widest mb-1.5" style={{ color: '#0055ff' }}>
            NAV ─────────────────────────────────────────
          </div>
          <div className="text-xs space-y-0.5" style={{ color: '#304080' }}>
            <div>→ DRAG LEFT/RIGHT   ROTATE ON Y-AXIS</div>
            <div>↕ DRAG UP/DOWN      TILT ON X-AXIS</div>
            <div>→ DIAL              SWITCH OBJECT</div>
          </div>
        </section>

      </div>

      {/* Fine print */}
      <div
        className="px-4 py-3"
        style={{
          borderTop: '1px solid #0033aa',
          color: '#1a2040',
          fontSize: '0.6rem',
          lineHeight: 1.4,
          letterSpacing: '0.04em',
          wordBreak: 'break-all',
        }}
      >
        <div className="mb-1" style={{ color: '#202840', fontSize: '0.55rem' }}>
          ██████████████████████████████████████████████████████
        </div>
        {data.finePrint}
        <div className="mt-1" style={{ color: '#202840', fontSize: '0.55rem' }}>
          ██████████████████████████████████████████████████████
        </div>
        <div className="mt-1 flex justify-between" style={{ color: '#304080' }}>
          <span>JAZZ.CHEEMA // 2026.04.28</span>
          <span>→</span>
        </div>
      </div>
    </div>
  )
}

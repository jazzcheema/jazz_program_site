'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Pt = { x: number; y: number }
type Phase = 'draw' | 'signal'
type LabMetrics = {
  axis: 'x' | 'y' | 'xy'
  index: number
  energy: number
  collision: number
}
type SynthGraph = {
  ctx: AudioContext
  master: GainNode
  oscA: OscillatorNode
  oscB: OscillatorNode
  filter: BiquadFilterNode
}

const PAGE = '#e9e5e0'
const INK = '#0c0c0c'
const MUTED = '#aaa6a0'
const DOT = '#d0ccc8'
const BLUE = '#2a5fc0'

const CW = 760
const CH = 360
const COLS = 55
const ROWS = 25
const GAP = 13
const GRID_W = (COLS - 1) * GAP
const GRID_H = (ROWS - 1) * GAP
const GRID_X = Math.round((CW - GRID_W) / 2)
const GRID_Y = Math.round((CH - GRID_H) / 2)

function isSquareGesture(pts: Pt[]): boolean {
  if (pts.length < 14) return false

  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = maxX - minX
  const h = maxY - minY

  if (w < 44 || h < 44) return false
  const aspect = w / Math.max(h, 1)
  if (aspect < 0.5 || aspect > 1.95) return false

  const first = pts[0]
  const last = pts[pts.length - 1]
  if (Math.hypot(last.x - first.x, last.y - first.y) > Math.max(w, h) * 0.72) return false

  const nearTop = pts.filter(p => p.y - minY < h * 0.22).length
  const nearBottom = pts.filter(p => maxY - p.y < h * 0.22).length
  const nearLeft = pts.filter(p => p.x - minX < w * 0.22).length
  const nearRight = pts.filter(p => maxX - p.x < w * 0.22).length
  const sideHits = [nearTop, nearBottom, nearLeft, nearRight].filter(count => count >= 2).length
  if (sideHits < 3) return false

  const step = Math.max(1, Math.floor(pts.length / 36))
  let corners = 0
  let straightRuns = 0
  for (const p of pts) {
    if (p.x > minX + w * 0.28 && p.x < maxX - w * 0.28) straightRuns++
    if (p.y > minY + h * 0.28 && p.y < maxY - h * 0.28) straightRuns++
  }
  for (let i = step; i < pts.length - step; i += step) {
    const a1 = Math.atan2(pts[i].y - pts[i - step].y, pts[i].x - pts[i - step].x)
    const a2 = Math.atan2(pts[i + step].y - pts[i].y, pts[i + step].x - pts[i].x)
    let delta = Math.abs(a2 - a1)
    if (delta > Math.PI) delta = Math.PI * 2 - delta
    if (delta > 0.7) corners++
  }

  return corners >= 1 || straightRuns > pts.length * 0.35
}

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size)
}

export default function EasterGame() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const pointer = useRef<Pt>({ x: CW / 2, y: CH / 2 })
  const viewportPointer = useRef<Pt>({ x: 0.5, y: 0.5 })
  const drawPts = useRef<Pt[]>([])
  const isDrawing = useRef(false)
  const phaseRef = useRef<Phase>('draw')
  const unlockTime = useRef(0)
  const lastMetricAt = useRef(0)
  const synthRef = useRef<SynthGraph | null>(null)
  const audioOnRef = useRef(false)
  const patternRef = useRef(0)

  const [phase, setPhase] = useState<Phase>('draw')
  const [small, setSmall] = useState(false)
  const [drawVisible, setDrawVisible] = useState(true)
  const [pattern, setPattern] = useState(0)
  const [metrics, setMetrics] = useState<LabMetrics>({ axis: 'xy', index: 24, energy: 0, collision: 0 })
  const [audioOn, setAudioOn] = useState(false)

  useEffect(() => {
    const check = () => setSmall(window.innerWidth < 760)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  useEffect(() => {
    if (phase !== 'draw') return
    const t = setInterval(() => setDrawVisible(v => !v), 1100)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    return () => {
      const synth = synthRef.current
      if (!synth) return
      synth.master.gain.setTargetAtTime(0, synth.ctx.currentTime, 0.02)
      window.setTimeout(() => {
        void synth.ctx.close()
      }, 80)
    }
  }, [])

  const ensureSynth = () => {
    const existing = synthRef.current
    if (existing) {
      void existing.ctx.resume()
      audioOnRef.current = true
      setAudioOn(true)
      return
    }

    const AudioCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return

    const ctx = new AudioCtor()
    const master = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    const oscA = ctx.createOscillator()
    const oscB = ctx.createOscillator()

    oscA.type = 'sawtooth'
    oscB.type = 'triangle'
    oscA.frequency.value = 146
    oscB.frequency.value = 73
    filter.type = 'lowpass'
    filter.frequency.value = 680
    filter.Q.value = 2.4
    master.gain.value = 0

    oscA.connect(filter)
    oscB.connect(filter)
    filter.connect(master)
    master.connect(ctx.destination)
    oscA.start()
    oscB.start()

    synthRef.current = { ctx, master, oscA, oscB, filter }
    audioOnRef.current = true
    setAudioOn(true)
  }

  const updateSynth = useCallback((vx: number, vy: number, energy: number, collision: number) => {
    const synth = synthRef.current
    if (!synth || !audioOnRef.current || phaseRef.current !== 'signal') return

    const now = synth.ctx.currentTime
    const midi = 36 + Math.round(vx * 26) + (patternRef.current % 4) * 2
    const base = 440 * 2 ** ((midi - 69) / 12)
    const spread = 0.5 + vy * 1.5
    const compression = 1 + energy * 0.75
    const gain = 0.018 + energy * 0.026 + collision * 0.05

    synth.oscA.frequency.setTargetAtTime(base * compression, now, 0.035)
    synth.oscB.frequency.setTargetAtTime(base * spread * (collision > 0.42 ? 1.5 : 0.5), now, 0.045)
    synth.oscB.detune.setTargetAtTime((vy - 0.5) * 26 + collision * 18, now, 0.04)
    synth.filter.frequency.setTargetAtTime(260 + vy * vy * 3800 + collision * 1800, now, 0.03)
    synth.filter.Q.setTargetAtTime(1.2 + collision * 9 + energy * 3, now, 0.04)
    synth.master.gain.setTargetAtTime(gain, now, 0.055)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawGrid = (time: number) => {
      const mx = pointer.current.x
      const my = pointer.current.y
      const vx = viewportPointer.current.x
      const vy = viewportPointer.current.y
      const nx = (mx - GRID_X) / GRID_W
      const ny = (my - GRID_Y) / GRID_H
      const energy = Math.min(1, Math.hypot(vx - 0.5, vy - 0.5) * 1.85)
      const waveOffset = (time * 0.0014) % (Math.PI * 2)
      const activeAxis: LabMetrics['axis'] =
        Math.abs(vx - 0.5) > Math.abs(vy - 0.5) * 1.35
          ? 'x'
          : Math.abs(vy - 0.5) > Math.abs(vx - 0.5) * 1.35
            ? 'y'
            : 'xy'
      const pointerCol = Math.min(COLS - 1, Math.max(0, Math.round(nx * (COLS - 1))))
      const pointerRow = Math.min(ROWS - 1, Math.max(0, Math.round(ny * (ROWS - 1))))
      const upperAtPointer = 6 + Math.sin(pointerCol * (0.22 + vx * 0.2) + waveOffset) * (4 + energy * 5) + ny * 5
      const lowerAtPointer = 18 + Math.cos(pointerCol * (0.2 + vy * 0.18) - waveOffset * 1.2) * (3 + energy * 4) - nx * 4
      const spineAtPointer = 12 + Math.sin(pointerCol * 0.15 + waveOffset * 0.7 + vx * 2) * (2 + energy * 2)
      const waveDistance = Math.min(
        Math.abs(pointerRow - upperAtPointer),
        Math.abs(pointerRow - lowerAtPointer),
        Math.abs(pointerRow - spineAtPointer),
      )
      const collision = phaseRef.current === 'signal' ? Math.max(0, 1 - waveDistance / 4.5) : 0

      updateSynth(vx, vy, energy, collision)

      if (time - lastMetricAt.current > 120) {
        lastMetricAt.current = time
        setMetrics({
          axis: activeAxis,
          index: Math.round((vx * 41 + vy * 37 + pattern * 7) % 64),
          energy: Math.round(energy * 100),
          collision: Math.round(collision * 100),
        })
      }

      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const x = GRID_X + c * GAP
          const y = GRID_Y + r * GAP
          const gx = c / (COLS - 1)
          const gy = r / (ROWS - 1)
          const dx = (x - mx) / GRID_W
          const dy = (y - my) / GRID_H
          const distance = Math.hypot(dx * 1.95, dy * 2.65)
          const viewportDriftX = Math.sin((gy - vy) * 12 + waveOffset) * (vx - 0.5) * 10
          const viewportDriftY = Math.cos((gx - vx) * 12 - waveOffset) * (vy - 0.5) * 10
          const pullX = Math.sin(dy * 16 + waveOffset) * Math.max(0, 1 - distance) * (5.5 + energy * 7) + viewportDriftX
          const pullY = Math.cos(dx * 16 - waveOffset) * Math.max(0, 1 - distance) * (5.5 + energy * 7) + viewportDriftY

          let size = 2
          let color = DOT

          if (phaseRef.current === 'signal') {
            const upperWave = Math.round(6 + Math.sin(c * (0.22 + vx * 0.2) + waveOffset) * (4 + energy * 5) + ny * 5)
            const lowerWave = Math.round(18 + Math.cos(c * (0.2 + vy * 0.18) - waveOffset * 1.2) * (3 + energy * 4) - nx * 4)
            const spine = Math.round(12 + Math.sin(c * 0.15 + waveOffset * 0.7 + vx * 2) * (2 + energy * 2))
            const verticalGate = Math.abs(c - Math.round(vx * (COLS - 1))) < 1 && r % 2 === 0
            const horizontalGate = Math.abs(r - Math.round(vy * (ROWS - 1))) < 1 && c % 2 === 0
            const isBlue =
              Math.abs(r - upperWave) < 1 ||
              Math.abs(r - lowerWave) < 1 ||
              (Math.abs(r - spine) < 1 && c > 8 && c < 47 && c % 3 !== 0) ||
              verticalGate ||
              horizontalGate

            if (isBlue) {
              color = BLUE
              size = (pattern + (activeAxis === 'xy' ? 0 : 1)) % 2 === 0 ? 9 : 7
            } else if (distance < 0.08) {
              color = INK
              size = 4 + energy * 3
            } else if (Math.abs(c / COLS - nx) < 0.015 || Math.abs(r / ROWS - ny) < 0.025) {
              color = '#b9b5b0'
              size = 3
            }
          } else if (distance < 0.075) {
            color = BLUE
            size = 5
          }

          ctx.fillStyle = color
          drawMark(ctx, x + pullX, y + pullY, size)
        }
      }
    }

    const tick = (time: number) => {
      raf.current = requestAnimationFrame(tick)
      ctx.clearRect(0, 0, CW, CH)
      ctx.fillStyle = PAGE
      ctx.fillRect(0, 0, CW, CH)

      drawGrid(time)

      if (phaseRef.current === 'draw' && drawPts.current.length > 1) {
        ctx.strokeStyle = BLUE
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(drawPts.current[0].x, drawPts.current[0].y)
        for (let i = 1; i < drawPts.current.length; i++) {
          ctx.lineTo(drawPts.current[i].x, drawPts.current[i].y)
        }
        ctx.stroke()
      }

      if (phaseRef.current === 'signal') {
        const elapsed = time - unlockTime.current
        const pulse = Math.max(0, 1 - elapsed / 900)
        if (pulse > 0) {
          ctx.strokeStyle = `rgba(42, 95, 192, ${pulse * 0.32})`
          ctx.lineWidth = 1 + pulse * 8
          ctx.beginPath()
          ctx.arc(CW / 2, CH / 2, 88 + (1 - pulse) * 80, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [pattern, updateSynth])

  useEffect(() => {
    const syncPointer = (clientX: number, clientY: number) => {
      const root = rootRef.current
      const canvas = canvasRef.current
      if (!root || !canvas) return

      const vx = Math.min(1, Math.max(0, clientX / window.innerWidth))
      const vy = Math.min(1, Math.max(0, clientY / window.innerHeight))
      viewportPointer.current = { x: vx, y: vy }
      root.style.setProperty('--lab-x', `${clientX}px`)
      root.style.setProperty('--lab-y', `${clientY}px`)

      const rect = canvas.getBoundingClientRect()
      pointer.current = {
        x: (clientX - rect.left) * (CW / rect.width),
        y: (clientY - rect.top) * (CH / rect.height),
      }
    }

    const onMove = (e: PointerEvent) => syncPointer(e.clientX, e.clientY)
    syncPointer(window.innerWidth / 2, window.innerHeight / 2)
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (CW / rect.width),
      y: (e.clientY - rect.top) * (CH / rect.height),
    }
  }

  const syncEventPointer = (e: React.PointerEvent<HTMLElement>) => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    const vx = Math.min(1, Math.max(0, e.clientX / window.innerWidth))
    const vy = Math.min(1, Math.max(0, e.clientY / window.innerHeight))
    viewportPointer.current = { x: vx, y: vy }
    root.style.setProperty('--lab-x', `${e.clientX}px`)
    root.style.setProperty('--lab-y', `${e.clientY}px`)

    const rect = canvas.getBoundingClientRect()
    pointer.current = {
      x: (e.clientX - rect.left) * (CW / rect.width),
      y: (e.clientY - rect.top) * (CH / rect.height),
    }
  }

  const unlock = () => {
    phaseRef.current = 'signal'
    unlockTime.current = performance.now()
    drawPts.current = []
    ensureSynth()
    setPhase('signal')
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toCanvas(e)
    pointer.current = pt
    e.currentTarget.setPointerCapture(e.pointerId)

    if (phaseRef.current === 'draw') {
      isDrawing.current = true
      drawPts.current = [pt]
    } else {
      ensureSynth()
      setPattern(p => p + 1)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toCanvas(e)
    pointer.current = pt
    if (phaseRef.current === 'draw' && isDrawing.current) {
      drawPts.current.push(pt)
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'draw' || !isDrawing.current) return
    isDrawing.current = false
    drawPts.current.push(toCanvas(e))

    if (isSquareGesture(drawPts.current)) {
      unlock()
    } else {
      window.setTimeout(() => {
        drawPts.current = []
      }, 420)
    }
  }

  if (small) {
    return (
      <div style={{ background: PAGE, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: MUTED }}>desktop only</span>
      </div>
    )
  }

  const mono = '"Courier New", Courier, monospace'
  const sans = 'Arial, Helvetica, sans-serif'

  return (
    <div
      ref={rootRef}
      onPointerMove={syncEventPointer}
      style={{
      background: PAGE,
      color: INK,
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: sans,
      userSelect: 'none',
      ['--lab-x' as string]: '50vw',
      ['--lab-y' as string]: '50vh',
    }}>
      <div style={{
        position: 'absolute',
        left: 'var(--lab-x)',
        top: 0,
        width: 1,
        height: '100%',
        background: phase === 'signal' ? 'rgba(42, 95, 192, 0.12)' : 'rgba(12, 12, 12, 0.035)',
        transform: 'translateX(-0.5px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: 0,
        top: 'var(--lab-y)',
        width: '100%',
        height: 1,
        background: phase === 'signal' ? 'rgba(42, 95, 192, 0.10)' : 'rgba(12, 12, 12, 0.03)',
        transform: 'translateY(-0.5px)',
        pointerEvents: 'none',
      }} />
      <header style={{
        position: 'absolute',
        top: 18,
        left: 22,
        right: 22,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        fontSize: 16,
      }}>
        <div />

        <nav style={{ display: 'flex', alignItems: 'center', gap: 34, fontSize: 15 }}>
          <span style={{ color: phase === 'signal' && metrics.axis !== 'y' ? BLUE : INK, opacity: phase === 'draw' ? 0.42 : 1 }}>
            <span style={{ fontFamily: mono, fontSize: 17, marginRight: 8 }}>{metrics.energy > 66 ? '✹' : '✦'}</span>Signal
          </span>
          <span style={{ color: phase === 'draw' ? BLUE : metrics.axis === 'xy' ? INK : MUTED }}>
            <span style={{ fontFamily: mono, fontSize: 17, marginRight: 8 }}>{phase === 'draw' ? '◯' : '●'}</span>Draw
          </span>
          <span style={{ color: phase === 'signal' && metrics.axis !== 'x' ? BLUE : INK, opacity: phase === 'draw' ? 0.42 : 1 }}>
            <span style={{ fontFamily: mono, fontSize: 17, marginRight: 8 }}>{metrics.axis === 'y' ? '↕' : '⌁'}</span>Lab
          </span>
        </nav>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: mono, fontSize: 10, color: MUTED }}>
          ESC
        </div>
      </header>

      <main style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: '92px 32px 70px',
      }}>
        <section style={{ width: 'min(760px, 74vw)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'end',
            marginBottom: 20,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontFamily: mono, color: MUTED }}>hidden room</p>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              lineHeight: 1,
              fontWeight: 500,
              letterSpacing: 0,
              textAlign: 'center',
            }}>
              {phase === 'draw' ? 'draw the box' : 'krate signal lab'}
            </h1>
            <p style={{ margin: 0, fontSize: 12, fontFamily: mono, color: MUTED, textAlign: 'right' }}>
              {phase === 'draw' ? 'unlock' : 'move / click'}
            </p>
          </div>

          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              cursor: phase === 'draw' ? 'crosshair' : 'none',
              touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => { isDrawing.current = false }}
          />

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 20,
            alignItems: 'start',
            marginTop: 21,
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 1.05, fontWeight: 500, letterSpacing: 0 }}>
                {phase === 'draw' ? 'Easter frequency' : '4-bit blue room'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, lineHeight: 1.1, color: MUTED, fontFamily: mono, letterSpacing: 0 }}>
                {phase === 'draw' ? 'square gesture + reactive matrix' : audioOn ? 'mouse field + collision synth' : 'click canvas for synth'}
              </p>
            </div>

            <p style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1,
              fontFamily: mono,
              fontWeight: 700,
              color: BLUE,
              opacity: phase === 'draw' && drawVisible ? 1 : phase === 'draw' ? 0 : 1,
              textShadow: phase === 'draw' ? '0 0 5px rgba(42, 95, 192, 0.22)' : 'none',
              transition: 'opacity 0.45s ease',
              textAlign: 'right',
            }}>
              {phase === 'draw' ? 'draw a square.' : audioOn ? 'synth live.' : 'click for sound.'}
            </p>
          </div>
        </section>
      </main>

      <footer style={{
        position: 'absolute',
        bottom: 22,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 18,
        fontSize: 13,
      }}>
        <span style={{ color: metrics.axis === 'x' ? BLUE : INK }}>index {metrics.index.toString().padStart(2, '0')}</span>
        <span style={{ color: metrics.energy > 52 ? BLUE : INK }}>blueprint {metrics.energy}%</span>
        <span style={{ color: metrics.collision > 45 ? BLUE : INK }}>contact {metrics.collision}%</span>
      </footer>

    </div>
  )
}

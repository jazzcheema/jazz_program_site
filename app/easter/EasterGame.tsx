'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Pt = { x: number; y: number }
type Phase = 'draw' | 'castle' | 'signal'
type LabMetrics = {
  axis: 'x' | 'y' | 'xy'
  index: number
  energy: number
  collision: number
}
type RailGhostDot = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
}
type SynthMode = {
  name: string
  shortName: string
  oscA: OscillatorType
  oscB: OscillatorType
  filter: BiquadFilterType
  midiOffset: number
  spread: number
  drive: number
  resonance: number
  phase: number
}
type SynthGraph = {
  ctx: AudioContext
  master: GainNode
  oscA: OscillatorNode
  oscB: OscillatorNode
  filter: BiquadFilterNode
  shaper: WaveShaperNode
}

const PAGE = '#e9e5e0'
const INK = '#0c0c0c'
const MUTED = '#aaa6a0'
const DOT = '#d0ccc8'
const BLUE = '#2a5fc0'
const EVIL_PAGE = '#050505'
const EVIL_INK = '#f4f0ea'
const EVIL_MUTED = '#706c68'
const EVIL_DOT = '#292725'
const EVIL_RED = '#d3322f'

const CW = 760
const CH = 360
const COLS = 55
const ROWS = 25
const GAP = 13
const GRID_W = (COLS - 1) * GAP
const GRID_H = (ROWS - 1) * GAP
const GRID_X = Math.round((CW - GRID_W) / 2)
const GRID_Y = Math.round((CH - GRID_H) / 2)
const CASTLE_ASCII = [
  '                       /\\                       ',
  '                      /  \\                      ',
  '                     /____\\                     ',
  '        /\\              ||              /\\      ',
  '       /  \\             ||             /  \\     ',
  '      /____\\     _______||_______     /____\\    ',
  '      | [] |    /  ___  ||  ___  \\    | [] |    ',
  '  ____|____|___/__/___\\_||_/___\\__\\___|____|____',
  ' /  _   _   _   _   _   _   _   _   _   _   _  \\',
  '/__/ \\_/ \\_/ \\_/ \\_/ \\_/ \\_/ \\_/ \\_/ \\_/ \\_/ \\__\\',
  '|  |   |   |   |   |   |   |   |   |   |   |  |',
  '|[]|   |[] |   |[] |   |[] |   |[] |   |[] |[]|',
  '|__|___|___|___|___|___|___|___|___|___|___|__|',
  '             |  |              |  |             ',
  '             |__|____      ____|__|             ',
  '                    |      |                    ',
  '                    |______|                    ',
]
const CASTLE_COLS = Math.max(...CASTLE_ASCII.map(line => line.length))
const CASTLE_ASSEMBLE_MS = 2500
const CASTLE_HOLD_MS = 650
const CASTLE_FADE_MS = 620
const EVIL_TRANSITION_MS = 2600
const DEVIL_ASCII = [
  '    ^^                             ^^    ',
  '   /  \\                           /  \\   ',
  '  /    \\                         /    \\  ',
  ' /      \\      ###########      /      \\ ',
  '/        \\   ###############   /        \\',
  '\\         \\ ################# /         /',
  ' \\         ###################         / ',
  '  \\       #####################       /  ',
  '   \\     #######################     /   ',
  '        #########################        ',
  '       ###########   ###########       ',
  '      ##########  @@@  ##########      ',
  '      #########  @@@@@  #########      ',
  '      #########   @@@   #########      ',
  '       #########       #########       ',
  '        #######################        ',
  '         ####   #######   ####         ',
  '          ###  ## ### ##  ###          ',
  '           ###  #######  ###           ',
  '            ####       ####            ',
  '             #############             ',
  '              ###########              ',
  '                #######                ',
  '                  ###                  ',
  '                   #                   ',
]
const SYNTH_MODES: SynthMode[] = [
  {
    name: 'wavefold',
    shortName: 'fold',
    oscA: 'sawtooth',
    oscB: 'triangle',
    filter: 'lowpass',
    midiOffset: 0,
    spread: 1,
    drive: 1,
    resonance: 1,
    phase: 0,
  },
  {
    name: 'pulse rail',
    shortName: 'rail',
    oscA: 'square',
    oscB: 'square',
    filter: 'bandpass',
    midiOffset: 7,
    spread: 1.32,
    drive: 1.72,
    resonance: 1.35,
    phase: 1.8,
  },
  {
    name: 'glass scan',
    shortName: 'scan',
    oscA: 'sine',
    oscB: 'triangle',
    filter: 'lowpass',
    midiOffset: -10,
    spread: 0.74,
    drive: 1.9,
    resonance: 1.15,
    phase: 3.4,
  },
]

function positiveMod(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo
}

function smoothStep(value: number) {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

function mixHex(from: string, to: string, amount: number) {
  const t = Math.min(1, Math.max(0, amount))
  const a = Number.parseInt(from.slice(1), 16)
  const b = Number.parseInt(to.slice(1), 16)
  const ar = (a >> 16) & 255
  const ag = (a >> 8) & 255
  const ab = a & 255
  const br = (b >> 16) & 255
  const bg = (b >> 8) & 255
  const bb = b & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

function devilGlyph(c: number, r: number) {
  const row = DEVIL_ASCII[r]
  if (!row) return ' '
  const offset = Math.floor((COLS - row.length) / 2)
  return row[c - offset] ?? ' '
}

function makeDistortionCurve(amount: number) {
  const samples = 384
  const curve = new Float32Array(samples)
  const k = amount
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = k === 0 ? x : ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x))
  }
  return curve
}

function signalRows(c: number, vx: number, vy: number, nx: number, ny: number, energy: number, waveOffset: number, modeIndex: number, modePhase: number) {
  if (modeIndex === 1) {
    const rail = Math.sin(c * 0.72 - waveOffset * 2.35 + vx * 5.2)
    const step = rail >= 0 ? 1 : -1
    const lock = Math.sin(c * 0.29 + waveOffset * 1.6 + vy * 4) >= 0 ? 1 : -1
    return {
      upper: 6 + step * (2.2 + energy * 3.3) + ny * 3.2,
      lower: 18 - step * (2 + energy * 3) - nx * 3.4,
      spine: 12 + lock * (1.8 + energy * 2.8),
    }
  }

  if (modeIndex === 2) {
    const scan = positiveMod(c * 0.48 + waveOffset * 2.8 + vx * 6 + modePhase, 8)
    const diagonal = Math.sin(c * 0.5 - waveOffset * 2.1 + vy * 7)
    return {
      upper: 3.8 + scan + ny * 2.1,
      lower: 21.5 - scan * 0.92 - nx * 2.8,
      spine: 12 + diagonal * (4.2 + energy * 3.6),
    }
  }

  return {
    upper: 6 + Math.sin(c * (0.2 + vx * 0.16) + waveOffset + modePhase) * (4 + energy * 4.5) + ny * 5,
    lower: 18 + Math.cos(c * (0.18 + vy * 0.14) - waveOffset * 1.05 - modePhase) * (3 + energy * 3.5) - nx * 4,
    spine: 12 + Math.sin(c * 0.13 + waveOffset * 0.65 + vx * 2) * (2 + energy * 2),
  }
}

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
  const railGhostCanvasRef = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  const pointer = useRef<Pt>({ x: CW / 2, y: CH / 2 })
  const viewportPointer = useRef<Pt>({ x: 0.5, y: 0.5 })
  const lastViewportMouse = useRef<Pt | null>(null)
  const mouseVelocity = useRef<Pt>({ x: 0, y: 0 })
  const drawPts = useRef<Pt[]>([])
  const isDrawing = useRef(false)
  const phaseRef = useRef<Phase>('draw')
  const unlockTime = useRef(0)
  const lastMetricAt = useRef(0)
  const synthRef = useRef<SynthGraph | null>(null)
  const audioOnRef = useRef(false)
  const patternRef = useRef(0)
  const synthModeRef = useRef(0)
  const modeSwitchDragging = useRef(false)
  const evilModeRef = useRef(false)
  const evilStartedAt = useRef(0)
  const railSpinAngle = useRef<number | null>(null)
  const railSpinTurns = useRef(0)
  const lastRailSpinAt = useRef(0)
  const railGhostsRef = useRef<RailGhostDot[]>([])

  const [phase, setPhase] = useState<Phase>('draw')
  const [small, setSmall] = useState(false)
  const [drawVisible, setDrawVisible] = useState(true)
  const [pattern, setPattern] = useState(0)
  const [synthMode, setSynthMode] = useState(0)
  const [evilMode, setEvilMode] = useState(false)
  const [metrics, setMetrics] = useState<LabMetrics>({ axis: 'xy', index: 24, energy: 0, collision: 0 })
  const [audioOn, setAudioOn] = useState(false)
  const [audioPrompt, setAudioPrompt] = useState(false)
  const [audioUnsupported, setAudioUnsupported] = useState(false)

  const updateViewportMotion = useCallback((clientX: number, clientY: number) => {
    const previous = lastViewportMouse.current
    if (previous) {
      mouseVelocity.current = {
        x: mouseVelocity.current.x * 0.34 + (clientX - previous.x) * 0.66,
        y: mouseVelocity.current.y * 0.34 + (clientY - previous.y) * 0.66,
      }
    }
    lastViewportMouse.current = { x: clientX, y: clientY }
  }, [])

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
    synthModeRef.current = synthMode
  }, [synthMode])

  useEffect(() => {
    if (phase !== 'draw') return
    const t = setInterval(() => setDrawVisible(v => !v), 1100)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase === 'signal' && synthMode === 1) return
    railGhostsRef.current = []
  }, [phase, synthMode])

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

  useEffect(() => {
    const canvas = railGhostCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const animate = () => {
      animId = requestAnimationFrame(animate)
      ctx.clearRect(0, 0, width, height)
      mouseVelocity.current.x *= 0.92
      mouseVelocity.current.y *= 0.92

      const ghosts = railGhostsRef.current
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const dot = ghosts[i]
        dot.x += dot.vx
        dot.y += dot.vy
        const evilTrail = evilModeRef.current
        dot.vx *= evilTrail ? 0.996 : 0.993
        dot.vy *= evilTrail ? 0.996 : 0.993
        dot.size *= evilTrail ? 0.999 : 0.996
        dot.alpha *= evilTrail ? 0.985 : 0.972

        if (
          dot.alpha < 0.012 ||
          dot.x < (evilTrail ? -520 : -360) ||
          dot.x > width + (evilTrail ? 520 : 360) ||
          dot.y < (evilTrail ? -520 : -360) ||
          dot.y > height + (evilTrail ? 520 : 360)
        ) {
          ghosts.splice(i, 1)
          continue
        }

        if (evilTrail) {
          ctx.fillStyle = `rgba(211, 50, 47, ${Math.min(0.95, dot.alpha * 1.22)})`
          ctx.fillRect(dot.x - dot.size / 2, dot.y - dot.size / 2, dot.size, dot.size)
        } else {
          ctx.fillStyle = `rgba(42, 95, 192, ${dot.alpha})`
          ctx.fillRect(dot.x - dot.size / 2, dot.y - dot.size / 2, dot.size, dot.size)
        }
      }
    }

    resize()
    window.addEventListener('resize', resize)
    animate()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const applySynthMode = useCallback((synth: SynthGraph, nextMode: number) => {
    const mode = SYNTH_MODES[nextMode]
    const now = synth.ctx.currentTime
    const evilOscA: OscillatorType[] = ['sawtooth', 'square', 'sawtooth']
    const evilOscB: OscillatorType[] = ['square', 'sawtooth', 'sine']
    const evilFilter: BiquadFilterType[] = ['bandpass', 'bandpass', 'highpass']

    synth.oscA.type = evilModeRef.current ? evilOscA[nextMode] : mode.oscA
    synth.oscB.type = evilModeRef.current ? evilOscB[nextMode] : mode.oscB
    synth.filter.type = evilModeRef.current ? evilFilter[nextMode] : mode.filter
    synth.filter.frequency.cancelScheduledValues(now)
    synth.filter.Q.cancelScheduledValues(now)
    synth.shaper.curve = makeDistortionCurve(evilModeRef.current ? 120 + nextMode * 38 : nextMode === 1 ? 28 : 0)
    synth.filter.frequency.setTargetAtTime(evilModeRef.current ? 180 + nextMode * 110 : mode.filter === 'highpass' ? 820 : 520, now, 0.035)
    synth.filter.Q.setTargetAtTime(evilModeRef.current ? 7 + nextMode * 2.5 : 1.4 + mode.resonance * 1.2, now, 0.035)
  }, [])

  const markAudioReady = (ctx: AudioContext) => {
    if (ctx.state === 'running') {
      audioOnRef.current = true
      setAudioOn(true)
      setAudioPrompt(false)
    } else {
      audioOnRef.current = false
      setAudioOn(false)
      setAudioPrompt(true)
    }
  }

  const ensureSynth = () => {
    const existing = synthRef.current
    if (existing) {
      void existing.ctx.resume().then(() => markAudioReady(existing.ctx)).catch(() => {
        setAudioPrompt(true)
      })
      markAudioReady(existing.ctx)
      return
    }

    const AudioCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) {
      setAudioUnsupported(true)
      setAudioPrompt(false)
      return
    }

    const ctx = new AudioCtor()
    const master = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    const shaper = ctx.createWaveShaper()
    const oscA = ctx.createOscillator()
    const oscB = ctx.createOscillator()
    const mode = SYNTH_MODES[synthModeRef.current]

    oscA.type = mode.oscA
    oscB.type = mode.oscB
    oscA.frequency.value = 146
    oscB.frequency.value = 73
    filter.type = mode.filter
    filter.frequency.value = 680
    filter.Q.value = 2.4
    shaper.curve = makeDistortionCurve(synthModeRef.current === 1 ? 28 : 0)
    shaper.oversample = '2x'
    master.gain.value = 0

    oscA.connect(filter)
    oscB.connect(filter)
    filter.connect(shaper)
    shaper.connect(master)
    master.connect(ctx.destination)
    oscA.start()
    oscB.start()

    synthRef.current = { ctx, master, oscA, oscB, filter, shaper }
    ctx.addEventListener('statechange', () => markAudioReady(ctx))
    void ctx.resume().then(() => markAudioReady(ctx)).catch(() => {
      setAudioPrompt(true)
    })
    markAudioReady(ctx)
  }

  const resetRailSpin = useCallback(() => {
    railSpinAngle.current = null
    railSpinTurns.current = 0
    lastRailSpinAt.current = 0
  }, [])

  const triggerEvilMode = useCallback((startedAt: number) => {
    if (evilModeRef.current) return
    evilModeRef.current = true
    evilStartedAt.current = startedAt
    resetRailSpin()
    setEvilMode(true)
    setPattern(p => p + 13)
    const synth = synthRef.current
    if (synth) applySynthMode(synth, synthModeRef.current)
  }, [applySynthMode, resetRailSpin])

  const triggerBlueMode = useCallback(() => {
    if (!evilModeRef.current) return
    evilModeRef.current = false
    evilStartedAt.current = 0
    resetRailSpin()
    setEvilMode(false)
    setPattern(p => p + 7)
    const synth = synthRef.current
    if (synth) applySynthMode(synth, synthModeRef.current)
  }, [applySynthMode, resetRailSpin])

  const trackRailSpin = useCallback((clientX: number, clientY: number, eventTime: number) => {
    if (
      phaseRef.current !== 'signal' ||
      synthModeRef.current !== 1 ||
      modeSwitchDragging.current
    ) {
      resetRailSpin()
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    if (Math.hypot(dx, dy) < Math.min(rect.width, rect.height) * 0.22) {
      railSpinAngle.current = null
      return
    }

    const now = eventTime || 0
    const angle = Math.atan2(dy, dx)
    const previous = railSpinAngle.current
    if (previous !== null) {
      let delta = angle - previous
      if (delta > Math.PI) delta -= Math.PI * 2
      if (delta < -Math.PI) delta += Math.PI * 2

      if (now - lastRailSpinAt.current > 1500) railSpinTurns.current = 0

      if (evilModeRef.current) {
        if (delta < -0.015) {
          railSpinTurns.current += Math.abs(delta) / (Math.PI * 2)
        } else if (delta > 0.09) {
          railSpinTurns.current = Math.max(0, railSpinTurns.current - (delta / (Math.PI * 2)) * 1.6)
        }

        if (railSpinTurns.current >= 5) triggerBlueMode()
      } else if (delta > 0.015) {
        railSpinTurns.current += delta / (Math.PI * 2)
      } else if (delta < -0.09) {
        railSpinTurns.current = Math.max(0, railSpinTurns.current + delta / (Math.PI * 2) * 1.6)
      }

      if (!evilModeRef.current && railSpinTurns.current >= 5) triggerEvilMode(now)
    }

    railSpinAngle.current = angle
    lastRailSpinAt.current = now
  }, [resetRailSpin, triggerBlueMode, triggerEvilMode])

  const selectSynthMode = (next: number) => {
    if (next === synthModeRef.current) return
    if (next !== 1) resetRailSpin()
    synthModeRef.current = next
    setSynthMode(next)
    const synth = synthRef.current
    if (synth) applySynthMode(synth, next)
    if (phaseRef.current === 'signal') {
      ensureSynth()
      setPattern(p => p + 1)
    }
  }

  const selectSynthModeFromPointer = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const progress = Math.min(0.999, Math.max(0, (e.clientX - rect.left) / rect.width))
    selectSynthMode(Math.floor(progress * SYNTH_MODES.length))
  }

  const updateSynth = useCallback((vx: number, vy: number, energy: number, collision: number) => {
    const synth = synthRef.current
    if (!synth || !audioOnRef.current || phaseRef.current !== 'signal') return

    const mode = SYNTH_MODES[synthModeRef.current]
    const now = synth.ctx.currentTime

    if (synthModeRef.current === 1) {
      const center = Math.max(0, 1 - Math.hypot(vx - 0.5, vy - 0.5) * 2.25)
      const breakup = Math.min(1, center * 0.82 + collision * 0.72)
      const railStep = Math.round(vx * 7)
      const rowStep = Math.round((1 - vy) * 4)

      if (evilModeRef.current) {
        const snarl = Math.sin(now * (9 + collision * 18) + patternRef.current)
        const bite = Math.sin(now * (29 + breakup * 42) + railStep * 0.8)
        const midi = 20 + railStep * 2 - rowStep * 4 + Math.round(snarl * (3 + collision * 6))
        const base = 440 * 2 ** ((midi - 69) / 12)
        const split = 0.48 + Math.sin(now * 3.7 + vx * 5) * 0.045
        const gate = snarl > -0.42 || bite > 0.72 ? 1 : 0.18
        const gain = (0.045 + energy * 0.06 + collision * 0.16 + center * 0.045) * gate

        synth.shaper.curve = makeDistortionCurve(180 + breakup * 260 + collision * 310)
        synth.oscA.frequency.setTargetAtTime(base * (0.62 + collision * 0.22), now, 0.014)
        synth.oscB.frequency.setTargetAtTime(base * split * (1.33 + breakup * 0.24), now, 0.016)
        synth.oscB.detune.setTargetAtTime(-68 + railStep * 16 + snarl * 46 + bite * 22, now, 0.014)
        synth.filter.frequency.setTargetAtTime(90 + center * 320 + collision * 1350 + energy * 460, now, 0.014)
        synth.filter.Q.setTargetAtTime(8 + breakup * 22 + collision * 16, now, 0.016)
        synth.master.gain.setTargetAtTime(gain, now, 0.018)
        return
      }

      const crumble = Math.round(Math.sin(now * (28 + breakup * 56) + patternRef.current * 0.7) * breakup * 5)
      const midi = 31 + railStep * 3 + rowStep * 2 + crumble
      const base = 440 * 2 ** ((midi - 69) / 12)
      const split = breakup > 0.46 ? 0.5 : 2
      const stutterRate = 18 + breakup * 58 + collision * 24
      const stutter = Math.sin(now * stutterRate + railStep * 1.7) > 0.18 + (1 - breakup) * 0.62 ? 1 : 0.34
      const gain = (0.026 + energy * 0.036 + collision * 0.09 + center * 0.035) * stutter

      synth.shaper.curve = makeDistortionCurve(20 + breakup * 170 + collision * 190)
      synth.oscA.frequency.setTargetAtTime(base * (1 - collision * 0.08), now, 0.026)
      synth.oscB.frequency.setTargetAtTime(base * split * (1 + center * 0.04), now, 0.018)
      synth.oscB.detune.setTargetAtTime((railStep - 3.5) * 9 + collision * 34 - breakup * 22, now, 0.024)
      synth.filter.frequency.setTargetAtTime(280 + railStep * 190 + center * 620 + collision * 850, now, 0.02)
      synth.filter.Q.setTargetAtTime(2.4 + breakup * 12 + collision * 7, now, 0.025)
      synth.master.gain.setTargetAtTime(gain, now, breakup > 0.35 ? 0.018 : 0.045)
      return
    }

    if (synthModeRef.current === 2) {
      const sweep = Math.sin((vx - 0.5) * Math.PI)

      if (evilModeRef.current) {
        const shard = Math.sin(now * (4.5 + energy * 8) + vx * 9 - vy * 6)
        const ratchet = Math.round(Math.max(0, Math.sin(now * (11 + collision * 22) + patternRef.current)) * 7)
        const midi = 18 + Math.round((1 - vy) * 13) + ratchet - Math.round(vx * 5)
        const base = 440 * 2 ** ((midi - 69) / 12)
        const choke = collision > 0.22 ? 0.42 : 1
        const gain = (0.035 + energy * 0.06 + collision * 0.17) * (shard > -0.72 ? 1 : 0.26)

        synth.shaper.curve = makeDistortionCurve(110 + energy * 190 + collision * 300)
        synth.oscA.frequency.setTargetAtTime(base * (0.72 + shard * 0.035), now, 0.045)
        synth.oscB.frequency.setTargetAtTime(base * (2.02 + sweep * 0.34) * choke, now, 0.038)
        synth.oscB.detune.setTargetAtTime(-120 + vx * 90 - collision * 70 + shard * 26, now, 0.034)
        synth.filter.frequency.setTargetAtTime(420 + Math.abs(sweep) * 1200 + collision * 1800 + energy * 900, now, 0.036)
        synth.filter.Q.setTargetAtTime(9 + energy * 8 + collision * 13, now, 0.04)
        synth.master.gain.setTargetAtTime(gain, now, 0.048)
        return
      }

      const midi = 26 + Math.round((1 - vy) * 10) + (patternRef.current % 3) * 2
      const base = 440 * 2 ** ((midi - 69) / 12)
      const collisionBend = collision > 0.28 ? 0.5 : 1
      const subDrop = 1 - collision * 0.34
      const gain = 0.052 + energy * 0.046 + collision * 0.13

      synth.oscA.frequency.setTargetAtTime(base * subDrop, now, 0.065)
      synth.oscB.frequency.setTargetAtTime(base * (1.48 + sweep * 0.22) * collisionBend, now, 0.075)
      synth.oscB.detune.setTargetAtTime(-18 + vx * 36 - collision * 42, now, 0.06)
      synth.filter.frequency.setTargetAtTime(150 + (1 - vy) * 760 + energy * 620 + collision * 280, now, 0.08)
      synth.filter.Q.setTargetAtTime(0.9 + energy * 1.4 + collision * 4.6, now, 0.07)
      synth.master.gain.setTargetAtTime(gain, now, 0.075)
      return
    }

    const midi = 36 + mode.midiOffset + Math.round(vx * (26 - mode.midiOffset * 0.45)) + (patternRef.current % 4) * 2
    const base = 440 * 2 ** ((midi - 69) / 12)
    const spread = (0.5 + vy * 1.5) * mode.spread
    const compression = 1 + energy * (0.55 + mode.drive * 0.28)
    const gain = (0.014 + energy * 0.024 + collision * 0.048) * mode.drive

    if (evilModeRef.current) {
      const crawl = Math.sin(now * 2.4 + vx * 8 + patternRef.current * 0.6)
      const tremor = Math.sin(now * (16 + collision * 30) + vy * 5)
      const evilMidi = 24 + Math.round(vx * 9) - Math.round(vy * 12) + (patternRef.current % 2) * 6
      const evilBase = 440 * 2 ** ((evilMidi - 69) / 12)
      const evilGain = (0.028 + energy * 0.052 + collision * 0.12) * (tremor > -0.18 ? 1 : 0.33)

      synth.shaper.curve = makeDistortionCurve(95 + energy * 170 + collision * 280)
      synth.oscA.frequency.setTargetAtTime(evilBase * (0.5 + collision * 0.18), now, 0.05)
      synth.oscB.frequency.setTargetAtTime(evilBase * (0.99 + crawl * 0.08), now, 0.055)
      synth.oscB.detune.setTargetAtTime(-240 + vy * 120 + collision * 90 + tremor * 32, now, 0.045)
      synth.filter.frequency.setTargetAtTime(120 + vx * 260 + collision * 1450 + energy * 380, now, 0.05)
      synth.filter.Q.setTargetAtTime(10 + collision * 18 + energy * 5, now, 0.045)
      synth.master.gain.setTargetAtTime(evilGain, now, 0.052)
      return
    }

    synth.oscA.frequency.setTargetAtTime(base * compression, now, 0.035)
    synth.oscB.frequency.setTargetAtTime(base * spread * (collision > 0.42 ? 1.5 : 0.5), now, 0.045)
    synth.oscB.detune.setTargetAtTime((vy - 0.5) * (20 + mode.spread * 12) + collision * 18, now, 0.04)
    synth.filter.frequency.setTargetAtTime(240 + vy * vy * (2500 + mode.resonance * 900) + collision * 1800 + mode.midiOffset * 24, now, 0.03)
    synth.filter.Q.setTargetAtTime(1.2 + collision * 8 * mode.resonance + energy * 3, now, 0.04)
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
      const modeIndex = synthModeRef.current
      const mode = SYNTH_MODES[modeIndex]
      const modePhase = mode.phase + modeIndex * 0.33
      const evilProgress = evilModeRef.current ? smoothStep((time - evilStartedAt.current) / EVIL_TRANSITION_MS) : 0
      const inkColor = mixHex(INK, EVIL_INK, evilProgress)
      const mutedColor = mixHex('#b9b5b0', EVIL_MUTED, evilProgress)
      const dotColor = mixHex(DOT, EVIL_DOT, evilProgress)
      const accentColor = mixHex(BLUE, EVIL_RED, evilProgress)
      const devilColor = mixHex(BLUE, EVIL_INK, evilProgress)
      const devilEyeColor = mixHex(BLUE, EVIL_RED, evilProgress)
      const railGhostRect = phaseRef.current === 'signal' && modeIndex === 1 ? canvas.getBoundingClientRect() : null
      const railVelocity = mouseVelocity.current
      const railSpeed = Math.hypot(railVelocity.x, railVelocity.y)
      const activeAxis: LabMetrics['axis'] =
        Math.abs(vx - 0.5) > Math.abs(vy - 0.5) * 1.35
          ? 'x'
          : Math.abs(vy - 0.5) > Math.abs(vx - 0.5) * 1.35
            ? 'y'
            : 'xy'
      const pointerCol = Math.min(COLS - 1, Math.max(0, Math.round(nx * (COLS - 1))))
      const pointerRow = Math.min(ROWS - 1, Math.max(0, Math.round(ny * (ROWS - 1))))
      const pointerRows = signalRows(pointerCol, vx, vy, nx, ny, energy, waveOffset, modeIndex, modePhase)
      const waveDistance = Math.min(
        Math.abs(pointerRow - pointerRows.upper),
        Math.abs(pointerRow - pointerRows.lower),
        Math.abs(pointerRow - pointerRows.spine),
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
          const proximity = Math.max(0, 1 - distance)
          let pullX = Math.sin(dy * 15 + waveOffset + modePhase) * proximity * (5.5 + energy * 6.5) + Math.sin((gy - vy) * 11 + waveOffset + modePhase) * (vx - 0.5) * 9
          let pullY = Math.cos(dx * 15 - waveOffset - modePhase) * proximity * (5.5 + energy * 6.5) + Math.cos((gx - vx) * 11 - waveOffset - modePhase) * (vy - 0.5) * 9

          if (modeIndex === 1) {
            const railPulse = Math.sin(c * 0.92 + waveOffset * 3.4 + pattern * 0.28) >= 0 ? 1 : -1
            const rowLock = r % 4 === 0 ? 1 : 0.26
            pullX = railPulse * (vx - 0.5) * (11 + energy * 10) * rowLock + proximity * Math.sin(r * 0.8 + waveOffset * 2) * 9
            pullY = Math.sign(Math.sin(r * 0.68 - waveOffset * 2.7)) * (vy - 0.5) * (8 + energy * 8) + proximity * railPulse * 5
          } else if (modeIndex === 2) {
            const cx = gx - 0.5
            const cy = gy - 0.5
            const angle = Math.atan2(cy, cx)
            const radius = Math.hypot(cx, cy)
            const scan = Math.sin(radius * 30 - waveOffset * 4.2 + angle * 3 + vx * 4)
            pullX = Math.cos(angle + waveOffset * 1.4) * scan * (4 + energy * 10) + proximity * Math.sin((c + r) * 0.55 + waveOffset * 3) * 12
            pullY = Math.sin(angle - waveOffset * 1.2) * scan * (4 + energy * 10) + proximity * Math.cos((c - r) * 0.45 - waveOffset * 3) * 12
          }

          let size = 2
          let color = dotColor

          if (phaseRef.current === 'castle') {
            const castleElapsed = time - unlockTime.current
            const scan = Math.min(COLS + 2, (castleElapsed / CASTLE_ASSEMBLE_MS) * (COLS + 4) - 2)
            const distanceToScan = Math.abs(c - scan)
            if (distanceToScan < 3) {
              color = accentColor
              size = 2.5 + (3 - distanceToScan)
            } else if ((c + r) % 11 === 0) {
              color = mutedColor
              size = 2
            }
          } else if (phaseRef.current === 'signal') {
            const glyph = evilProgress > 0 ? devilGlyph(c, r) : ' '
            const devilCell = glyph !== ' '
            const rows = signalRows(c, vx, vy, nx, ny, energy, waveOffset, modeIndex, modePhase)
            const upperWave = Math.round(rows.upper)
            const lowerWave = Math.round(rows.lower)
            const spine = Math.round(rows.spine)
            const verticalGate = Math.abs(c - Math.round(vx * (COLS - 1))) < 1 && r % 2 === 0
            const horizontalGate = Math.abs(r - Math.round(vy * (ROWS - 1))) < 1 && c % 2 === 0
            const railGate = modeIndex === 1 && (r === 4 || r === 9 || r === 15 || r === 20 || (c % 8 < 4 && Math.abs(r - spine) < 2))
            const glassGate = modeIndex === 2 && (
              Math.abs((c - r * 1.9) - (vx * 22 - 4)) < 1.2 ||
              Math.abs((c + r * 1.55) - (36 + vy * 18)) < 1.1 ||
              positiveMod(c + r + Math.floor(waveOffset * 4), 13) === 0
            )
            const baseSignal =
              Math.abs(r - upperWave) < 1 ||
              Math.abs(r - lowerWave) < 1 ||
              (Math.abs(r - spine) < 1 && c > 8 && c < 47 && c % 3 !== 0) ||
              verticalGate ||
              horizontalGate
            const isBlue = modeIndex === 1 ? railGate || Math.abs(r - upperWave) < 1 || Math.abs(r - lowerWave) < 1 : modeIndex === 2 ? glassGate || Math.abs(r - spine) < 1 : baseSignal

            if (isBlue) {
              color = accentColor
              size = modeIndex === 1
                ? (r % 4 === 0 ? 8 : 5)
                : modeIndex === 2
                  ? (positiveMod(c + r + pattern, 5) === 0 ? 4 : 8)
                  : (pattern + (activeAxis === 'xy' ? 0 : 1)) % 2 === 0 ? 9 : 7
              const evilTrail = evilModeRef.current
              const ghostModulo = evilTrail ? 5 : 9
              if (modeIndex === 1 && railGhostRect && railSpeed > (evilTrail ? 0.58 : 0.8) && (c * 13 + r * 17 + pattern) % ghostModulo === 0) {
                const ghosts = railGhostsRef.current
                const directionX = railVelocity.x / railSpeed
                const directionY = railVelocity.y / railSpeed
                const sideSign = (c + r) % 2 === 0 ? 1 : -1
                const side = sideSign * Math.min(evilTrail ? 5.4 : 1.8, railSpeed * (evilTrail ? 0.062 : 0.02))
                const throwSpeed = Math.min(evilTrail ? 42 : 30, (evilTrail ? 7.5 : 4.8) + railSpeed * (evilTrail ? 0.56 : 0.42))
                const drawX = x + pullX
                const drawY = y + pullY
                const viewportX = railGhostRect.left + (drawX / CW) * railGhostRect.width
                const viewportY = railGhostRect.top + (drawY / CH) * railGhostRect.height
                const viewportSize = Math.max(3, size * (railGhostRect.width / CW) * (evilTrail ? 1.18 : 0.82))
                ghosts.push({
                  x: viewportX,
                  y: viewportY,
                  vx: directionX * throwSpeed - directionY * side,
                  vy: directionY * throwSpeed + directionX * side,
                  size: viewportSize,
                  alpha: (evilTrail ? 0.58 : 0.42) + Math.min(evilTrail ? 0.38 : 0.34, railSpeed * (evilTrail ? 0.011 : 0.008)),
                })
                if (evilTrail && (c + pattern) % 3 === 0) {
                  ghosts.push({
                    x: viewportX - directionX * viewportSize * 1.5,
                    y: viewportY - directionY * viewportSize * 1.5,
                    vx: directionX * throwSpeed * 0.68 + directionY * side * 0.72,
                    vy: directionY * throwSpeed * 0.68 - directionX * side * 0.72,
                    size: viewportSize * 0.68,
                    alpha: 0.36 + Math.min(0.26, railSpeed * 0.007),
                  })
                }
                const maxGhosts = evilTrail ? 980 : 560
                if (ghosts.length > maxGhosts) ghosts.splice(0, ghosts.length - maxGhosts)
              }
            } else if (distance < 0.08) {
              color = inkColor
              size = 4 + energy * 3
            } else if (Math.abs(c / COLS - nx) < 0.015 || Math.abs(r / ROWS - ny) < 0.025) {
              color = mutedColor
              size = 3
            }

            if (devilCell) {
              const twitch = Math.sin(time * 0.011 + c * 0.6 + r * 0.35 + pattern * 0.4)
              pullX += Math.sin(r * 0.9 + time * 0.006) * evilProgress * (1.4 + energy * 3.2)
              pullY += twitch * evilProgress * (1.2 + collision * 2.8)
              color = glyph === '@' ? devilEyeColor : devilColor
              size = Math.max(size, 3.5 + evilProgress * (2.4 + Math.max(0, twitch) * 2.4 + collision * 2.8))
            } else if (evilProgress > 0) {
              color = mixHex(color, EVIL_DOT, evilProgress * 0.82)
              size *= 1 - evilProgress * 0.22
            }
          } else if (distance < 0.075) {
            color = accentColor
            size = 5
          }

          ctx.fillStyle = color
          drawMark(ctx, x + pullX, y + pullY, size)
        }
      }
    }

    const tick = (time: number) => {
      raf.current = requestAnimationFrame(tick)
      const evilRaw = evilModeRef.current ? Math.min(1, Math.max(0, (time - evilStartedAt.current) / EVIL_TRANSITION_MS)) : 0
      const evilProgress = smoothStep(evilRaw)
      const pageColor = mixHex(PAGE, EVIL_PAGE, evilProgress)
      const accentColor = mixHex(BLUE, EVIL_RED, evilProgress)
      ctx.clearRect(0, 0, CW, CH)
      ctx.fillStyle = pageColor
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

      if (phaseRef.current === 'castle') {
        const elapsed = time - unlockTime.current
        const lineH = 16
        const charW = 7.4
        const scanCol = Math.min(CASTLE_COLS + 2, (elapsed / CASTLE_ASSEMBLE_MS) * (CASTLE_COLS + 4) - 2)
        const fadeIn = Math.min(1, elapsed / 360)
        const fadeStart = CASTLE_ASSEMBLE_MS + CASTLE_HOLD_MS
        const fadeOut = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / CASTLE_FADE_MS) : 1
        const alpha = fadeIn * fadeOut
        const startY = CH / 2 - ((CASTLE_ASCII.length - 1) * lineH) / 2
        const startX = CW / 2 - (CASTLE_COLS * charW) / 2

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.font = 'bold 12px "Courier New", Courier, monospace'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        for (let row = 0; row < CASTLE_ASCII.length; row++) {
          const line = CASTLE_ASCII[row]
          for (let col = 0; col < line.length; col++) {
            const glyph = line[col]
            if (glyph === ' ' || col > scanCol) continue

            const scanDistance = Math.abs(col - scanCol)
            const isFront = scanDistance < 1.9 && elapsed < CASTLE_ASSEMBLE_MS
            ctx.fillStyle = isFront ? BLUE : INK
            ctx.shadowColor = isFront ? 'rgba(42, 95, 192, 0.38)' : `rgba(42, 95, 192, ${0.08 * alpha})`
            ctx.shadowBlur = isFront ? 10 : 4 * alpha
            ctx.fillText(glyph, startX + col * charW, startY + row * lineH)
          }
        }

        if (elapsed < CASTLE_ASSEMBLE_MS) {
          ctx.fillStyle = BLUE
          ctx.shadowColor = 'rgba(42, 95, 192, 0.42)'
          ctx.shadowBlur = 10
          const x = startX + scanCol * charW
          for (let y = startY - lineH; y <= startY + CASTLE_ASCII.length * lineH; y += 20) {
            drawMark(ctx, x + Math.sin(y * 0.07 + time * 0.02) * 2, y, 4)
          }
        }
        ctx.restore()

        if (elapsed > CASTLE_ASSEMBLE_MS + CASTLE_HOLD_MS + CASTLE_FADE_MS) {
          phaseRef.current = 'signal'
          unlockTime.current = time
          setPhase('signal')
        }
      } else if (phaseRef.current === 'signal') {
        const elapsed = time - unlockTime.current
        const pulse = Math.max(0, 1 - elapsed / 900)
        if (pulse > 0) {
          ctx.strokeStyle = evilModeRef.current
            ? `rgba(211, 50, 47, ${pulse * 0.34})`
            : `rgba(42, 95, 192, ${pulse * 0.32})`
          ctx.lineWidth = 1 + pulse * 8
          ctx.beginPath()
          ctx.arc(CW / 2, CH / 2, 88 + (1 - pulse) * 80, 0, Math.PI * 2)
          ctx.stroke()
        }

        if (evilModeRef.current && evilRaw < 1) {
          const sweep = smoothStep(evilRaw)
          ctx.save()
          ctx.globalAlpha = 1 - sweep
          ctx.strokeStyle = accentColor
          ctx.lineWidth = 2 + (1 - sweep) * 10
          ctx.beginPath()
          ctx.arc(CW / 2, CH / 2, 26 + sweep * 460, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = (1 - sweep) * 0.2
          ctx.fillStyle = EVIL_INK
          ctx.fillRect(0, 0, CW, CH)
          ctx.restore()
        }
      }
    }

    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [pattern, updateSynth])

  useEffect(() => {
    const syncPointer = (clientX: number, clientY: number, eventTime = 0) => {
      const root = rootRef.current
      const canvas = canvasRef.current
      if (!root || !canvas) return

      trackRailSpin(clientX, clientY, eventTime)
      updateViewportMotion(clientX, clientY)
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

    const onMove = (e: PointerEvent) => syncPointer(e.clientX, e.clientY, e.timeStamp)
    syncPointer(window.innerWidth / 2, window.innerHeight / 2)
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [trackRailSpin, updateViewportMotion])

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

  const unlock = (startedAt: number) => {
    phaseRef.current = 'castle'
    unlockTime.current = startedAt
    drawPts.current = []
    ensureSynth()
    setPhase('castle')
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
      unlock(e.timeStamp)
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
  const pageColor = evilMode ? EVIL_PAGE : PAGE
  const inkColor = evilMode ? EVIL_INK : INK
  const mutedColor = evilMode ? EVIL_MUTED : MUTED
  const accentColor = evilMode ? EVIL_RED : BLUE
  const switchTrackColor = evilMode ? 'rgba(5, 5, 5, 0.68)' : 'rgba(233, 229, 224, 0.68)'

  return (
    <div
      ref={rootRef}
      onPointerMove={syncEventPointer}
      style={{
      background: pageColor,
      color: inkColor,
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: sans,
      userSelect: 'none',
      transition: 'background 1.8s ease, color 1.8s ease',
      ['--lab-x' as string]: '50vw',
      ['--lab-y' as string]: '50vh',
    }}>
      <style>{`
        @keyframes railRiddlePulse {
          0%, 100% {
            opacity: 0.48;
            text-shadow: 0 0 5px rgba(211, 50, 47, 0.2);
          }
          50% {
            opacity: 0.82;
            text-shadow: 0 0 10px rgba(211, 50, 47, 0.46);
          }
        }
        @keyframes railBlueRiddlePulse {
          0%, 100% {
            opacity: 0.48;
            text-shadow: 0 0 5px rgba(42, 95, 192, 0.22);
          }
          50% {
            opacity: 0.84;
            text-shadow: 0 0 10px rgba(42, 95, 192, 0.5);
          }
        }
      `}</style>
      <div style={{
        position: 'absolute',
        left: 'var(--lab-x)',
        top: 0,
        width: 1,
        height: '100%',
        background: evilMode
          ? phase !== 'draw' ? 'rgba(211, 50, 47, 0.16)' : 'rgba(244, 240, 234, 0.035)'
          : phase !== 'draw' ? 'rgba(42, 95, 192, 0.12)' : 'rgba(12, 12, 12, 0.035)',
        transform: 'translateX(-0.5px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: 0,
        top: 'var(--lab-y)',
        width: '100%',
        height: 1,
        background: evilMode
          ? phase !== 'draw' ? 'rgba(211, 50, 47, 0.14)' : 'rgba(244, 240, 234, 0.03)'
          : phase !== 'draw' ? 'rgba(42, 95, 192, 0.10)' : 'rgba(12, 12, 12, 0.03)',
        transform: 'translateY(-0.5px)',
        pointerEvents: 'none',
      }} />
      <canvas
        ref={railGhostCanvasRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <header style={{
        position: 'absolute',
        top: 18,
        left: 22,
        right: 22,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        fontSize: 16,
        zIndex: 4,
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'grid', justifyItems: 'end' }}>
          {phase === 'signal' && (
            <>
              <div
                role="radiogroup"
                aria-label="Synth type"
                onPointerDown={(e) => {
                  modeSwitchDragging.current = true
                  e.currentTarget.setPointerCapture(e.pointerId)
                  selectSynthModeFromPointer(e)
                }}
                onPointerMove={(e) => {
                  if (modeSwitchDragging.current) selectSynthModeFromPointer(e)
                }}
                onPointerUp={() => {
                  modeSwitchDragging.current = false
                }}
                onPointerCancel={() => {
                  modeSwitchDragging.current = false
                }}
                onLostPointerCapture={() => {
                  modeSwitchDragging.current = false
                }}
                style={{
                  position: 'relative',
                  width: 150,
                  height: 34,
                  color: accentColor,
                  cursor: 'pointer',
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0,
                  lineHeight: 1,
                  touchAction: 'none',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: '5px 0',
                    border: evilMode ? '1px solid rgba(211, 50, 47, 0.34)' : '1px solid rgba(42, 95, 192, 0.28)',
                    background: switchTrackColor,
                  }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 7,
                    left: 4,
                    width: 'calc((100% - 8px) / 3)',
                    height: 20,
                    background: accentColor,
                    transform: `translateX(${synthMode * 100}%)`,
                    transition: 'transform 180ms ease',
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  {SYNTH_MODES.map((mode, index) => (
                    <button
                      key={mode.shortName}
                      type="button"
                      role="radio"
                      aria-checked={synthMode === index}
                      aria-label={mode.name}
                      onClick={() => selectSynthMode(index)}
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: '100%',
                        height: '100%',
                        border: 0,
                        background: 'transparent',
                        color: synthMode === index ? pageColor : index === 0 ? inkColor : accentColor,
                        cursor: 'pointer',
                        font: 'inherit',
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: 1,
                        margin: 0,
                        padding: 0,
                        opacity: synthMode === index ? 1 : 0.72,
                        transition: 'color 180ms ease, opacity 180ms ease',
                      }}
                    >
                      {mode.shortName}
                    </button>
                  ))}
                </span>
              </div>
              <span style={{ marginTop: 2, fontSize: 11, lineHeight: 1.1, color: mutedColor, fontFamily: mono, letterSpacing: 0 }}>
                synth select
              </span>
              {synthMode === 1 && !evilMode && (
                <span style={{
                  marginTop: 6,
                  maxWidth: 150,
                  color: EVIL_RED,
                  fontFamily: mono,
                  fontSize: 10,
                  lineHeight: 1.15,
                  letterSpacing: 0,
                  opacity: 0.72,
                  textAlign: 'right',
                  textShadow: '0 0 7px rgba(211, 50, 47, 0.32)',
                  animation: 'railRiddlePulse 2.8s ease-in-out infinite',
                }}>
                  five clockwise sparks open the red room
                </span>
              )}
              {synthMode === 1 && evilMode && (
                <span style={{
                  marginTop: 6,
                  maxWidth: 150,
                  color: BLUE,
                  fontFamily: mono,
                  fontSize: 10,
                  lineHeight: 1.15,
                  letterSpacing: 0,
                  opacity: 0.72,
                  textAlign: 'right',
                  textShadow: '0 0 7px rgba(42, 95, 192, 0.34)',
                  animation: 'railBlueRiddlePulse 2.8s ease-in-out infinite',
                }}>
                  five counterclockwise sparks return the blue room
                </span>
              )}
            </>
          )}
        </div>

        <nav style={{ gridColumn: 2, justifySelf: 'center', display: 'flex', alignItems: 'center', gap: 34, fontSize: 15 }}>
          <span style={{ color: phase === 'signal' && metrics.axis !== 'y' ? accentColor : inkColor, opacity: phase === 'draw' ? 0.42 : 1 }}>
            <span style={{ fontFamily: mono, fontSize: 17, marginRight: 8 }}>{metrics.energy > 66 ? '✹' : '✦'}</span>Signal
          </span>
          <span style={{ color: phase === 'draw' ? accentColor : phase === 'castle' ? accentColor : metrics.axis === 'xy' ? inkColor : mutedColor }}>
            <span style={{ fontFamily: mono, fontSize: 17, marginRight: 8 }}>{phase === 'draw' ? '◯' : phase === 'castle' ? '□' : '●'}</span>Draw
          </span>
          <span style={{ color: phase === 'signal' && metrics.axis !== 'x' ? accentColor : inkColor, opacity: phase === 'draw' ? 0.42 : 1 }}>
            <span style={{ fontFamily: mono, fontSize: 17, marginRight: 8 }}>{metrics.axis === 'y' ? '↕' : '⌁'}</span>Drift
          </span>
        </nav>

        <div style={{ gridColumn: 3 }} />
      </header>

      <main style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: '92px 32px 70px',
        position: 'relative',
        zIndex: 2,
      }}>
        <section style={{ width: 'min(760px, 74vw)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'end',
            marginBottom: 20,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontFamily: mono, color: mutedColor }}>hidden room</p>
            <h1 style={{
              margin: 0,
              fontSize: 22,
              lineHeight: 1,
              fontWeight: 500,
              letterSpacing: 0,
              textAlign: 'center',
            }}>
              {phase === 'draw' ? 'draw the box' : phase === 'castle' ? 'unlocking gate' : 'krate signal lab'}
            </h1>
            <p style={{ margin: 0, fontSize: 12, fontFamily: mono, color: mutedColor, textAlign: 'right' }}>
              {phase === 'draw' ? 'unlock' : phase === 'castle' ? 'stand by' : 'move / click'}
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
                {phase === 'draw' ? 'Easter frequency' : phase === 'castle' ? 'Gate sequence' : evilMode ? '4-bit red room' : '4-bit blue room'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, lineHeight: 1.1, color: mutedColor, fontFamily: mono, letterSpacing: 0 }}>
                {phase === 'draw' ? 'square gesture + reactive matrix' : phase === 'castle' ? 'terminal reveal + synth warmup' : evilMode ? 'inverted field + sinister synth' : audioOn ? 'mouse field + collision synth' : audioUnsupported ? 'visual signal only' : 'sound permission required'}
              </p>
            </div>

            <p style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1,
              fontFamily: mono,
              fontWeight: 700,
              color: accentColor,
              opacity: phase === 'draw' && drawVisible ? 1 : phase === 'draw' ? 0 : 1,
              textShadow: phase === 'draw' ? `0 0 5px ${evilMode ? 'rgba(211, 50, 47, 0.22)' : 'rgba(42, 95, 192, 0.22)'}` : 'none',
              transition: 'opacity 0.45s ease',
              textAlign: 'right',
            }}>
              {phase === 'draw' ? 'draw a square.' : phase === 'castle' ? 'opening.' : evilMode ? 'evil live.' : audioOn ? 'synth live.' : audioUnsupported ? 'visual only.' : 'enable sound.'}
            </p>
          </div>
        </section>
      </main>

      {phase === 'signal' && audioPrompt && !audioOn && !audioUnsupported && (
        <div style={{
          position: 'absolute',
          right: 28,
          bottom: 54,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          border: evilMode ? '1px solid rgba(244, 240, 234, 0.16)' : '1px solid rgba(12, 12, 12, 0.12)',
          background: evilMode ? 'rgba(5, 5, 5, 0.86)' : 'rgba(233, 229, 224, 0.86)',
          backdropFilter: 'blur(8px)',
          fontFamily: mono,
          fontSize: 11,
          color: inkColor,
        }}>
          <span style={{ color: mutedColor }}>sound locked</span>
          <button
            type="button"
            onClick={ensureSynth}
            style={{
              border: evilMode ? '1px solid rgba(211, 50, 47, 0.42)' : '1px solid rgba(42, 95, 192, 0.36)',
              background: evilMode ? 'rgba(211, 50, 47, 0.1)' : 'rgba(42, 95, 192, 0.08)',
              color: accentColor,
              cursor: 'pointer',
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 7px',
            }}
          >
            enable
          </button>
        </div>
      )}

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
        <span style={{ color: metrics.axis === 'x' ? accentColor : inkColor }}>index {metrics.index.toString().padStart(2, '0')}</span>
        <span style={{ color: metrics.energy > 52 ? accentColor : inkColor }}>blueprint {metrics.energy}%</span>
        <span style={{ color: metrics.collision > 45 ? accentColor : inkColor }}>contact {metrics.collision}%</span>
      </footer>

    </div>
  )
}

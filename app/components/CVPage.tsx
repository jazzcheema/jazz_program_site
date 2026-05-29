'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const ABOUT =
  'I build cinematic interactive experiences that merge storytelling, realtime technology, and immersive design. Drawing from a background in film directing and editing, I approach software as a medium for atmosphere, participation, and worldbuilding-- building interfaces that pull users into an experience rather than presenting them with one. I\'m drawn to interactive software where engagement becomes part of the system itself, and each user builds a personal relationship with the product through their own journey.'

const EXPERIENCE = [
  {
    role: 'Creative Developer & Interactive Director',
    company: 'Episode Companies',
    type: 'Contract',
    period: 'Feb – May 2026',
    detail: 'Built a cinematic 3D real estate flagship-- CRT television interface with knob navigation, film-inspired motion, and synchronized video textures. Architected a purpose-built mobile experience with device-specific models and dedicated camera choreography. Custom shaders, render textures, raycasting, and adaptive GPU optimization.',
  },
  {
    role: 'Software Engineer',
    company: 'Krate',
    type: 'Freelance',
    period: 'Aug 2024 – Present',
    detail: 'Migrating a 15k+ user social music platform from React Native to Expo Router with Firebase and New Architecture. Implemented new features and modernised the app with haptics. Full ownership of mobile architecture, auth flows, and real-time data layer.',
  },
  {
    role: 'Full Stack Engineer',
    company: 'The Offer Haus',
    type: 'Internship · Stealth',
    period: 'Apr – May 2024',
    detail: 'Built the full product UI from scratch. Next.js, TypeScript, Tailwind CSS, Sentry, PostHog.',
  },
  {
    role: 'Senior Video Editor',
    company: 'Partners & Spade',
    type: 'Contract',
    period: 'Nov 2021 – Mar 2022',
    detail: '"Be You, No One Else Can" for Schick — directed by Mike Mills. 4M+ views. End-to-end post-production on a national broadcast spot.',
  },
  {
    role: 'Video Editor',
    company: 'RCA Commercial Electronics',
    type: 'Contract',
    period: 'Dec 2022 – Jan 2023',
    detail: 'Commercial post-production for consumer electronics campaigns.',
  },
]

const EDUCATION = [
  { institution: 'Rithm School', degree: 'Full Stack Software Development', period: 'Jan – Jun 2024' },
  { institution: 'London Film School', degree: 'MA · Film / Cinema / Video Studies', period: '2017 – 2021' },
  { institution: 'California State University, Long Beach', degree: 'BA · English Literature & Creative Writing', period: '' },
]

const AWARDS = [
  { title: 'Best Short Film', event: 'London Short Film Festival', year: '2024' },
]

const CREDITS = [
  { name: 'Jazz Cheema', role: 'Program & Software', detail: 'Three.js · Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · WebGL' },
  { name: 'Kevin Netteberg', role: '3D Models', detail: 'Genie · Lamp · Carpet · Krate · Mobile TV' },
]

const TECHNICAL_SKILLS = [
  {
    label: 'Languages',
    skills: ['JavaScript', 'TypeScript', 'Python', 'SQL', 'HTML', 'CSS'],
  },
  {
    label: 'Libraries & Frameworks',
    skills: ['React', 'React Native', 'Three.js', 'Expo', 'React Testing Library', 'jQuery', 'Node.js', 'Express', 'Jest', 'Flask', 'Next.js', 'Tailwind CSS', 'unittest'],
  },
  {
    label: 'Tools / Methodologies',
    skills: ['SQLAlchemy', 'PostgreSQL', 'Amazon S3', 'Google Firebase', 'Xcode', 'Android Studio', 'npm', 'Cron', 'VS Code', 'Jinja', 'Git', 'GitHub', 'Sentry.io', 'PostHog', 'Microservices Architecture', 'Object-Oriented Programming', 'Agile Development', 'Scrum', 'Test-Driven Development', 'DevTools / Debugging', 'Adobe Premiere Pro', 'After Effects', 'Figma', 'Photoshop', 'Final Cut Pro', 'Ableton Live', 'Logic Pro'],
  },
]

// ---------- Ghost trail overlay ----------

type GhostFrame = { pts: Float32Array; exc: Float32Array; alpha: number }

// ---------- Dot-grid canvas ----------

const SPRING  = 0.036
const DAMPING = 0.84
// Desktop repulsion constants (unused on mobile)
const REPULSE_R = 100
const REPULSE_F = 9

function DotCanvas({ isMobile, scrollVelRef, ghostsRef }: { isMobile: boolean; scrollVelRef: { current: number }; ghostsRef: { current: GhostFrame[] } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveMouseRef  = useRef({ x: 0.5, y: 0.5 })
  const canvasMouseRef = useRef({ x: -9999, y: -9999 })

  // Mouse tracking — desktop only
  useEffect(() => {
    if (isMobile) return
    const onMove = (e: MouseEvent) => {
      waveMouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }
      const canvas = canvasRef.current
      if (canvas) {
        const r = canvas.getBoundingClientRect()
        canvasMouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [isMobile])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Grid params — smaller on mobile so dots fit the narrower viewport
    const COLS    = isMobile ? 26 : 54
    const ROWS    = isMobile ? 10 : 20
    const SPACING = isMobile ? 14 : 21

    const N  = COLS * ROWS
    const px  = new Float32Array(N)
    const py  = new Float32Array(N)
    const vx  = new Float32Array(N)
    const vy  = new Float32Array(N)
    const exc = new Float32Array(N)  // excite value per dot, for ghost snapshots
    let ready = false

    let animId: number
    let tick = 0
    let smX = 0.5, smY = 0.5

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
      ready = false
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick++
      const t = tick * 0.011

      if (isMobile) {
        // Gentle autonomous oscillation — no mouse input on mobile
        smX = 0.5 + Math.sin(t * 0.28) * 0.30
        smY = 0.5 + Math.cos(t * 0.19) * 0.22
      } else {
        smX += (waveMouseRef.current.x - smX) * 0.055
        smY += (waveMouseRef.current.y - smY) * 0.055
      }

      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)


      const totalW = (COLS - 1) * SPACING
      const totalH = (ROWS - 1) * SPACING
      const startX = (W - totalW) / 2
      const startY = (H - totalH) / 2

      const amplitude = (smY * 0.7 + 0.15) * totalH * 0.42
      const phase     = smX * Math.PI * 2.8

      const mx = canvasMouseRef.current.x
      const my = canvasMouseRef.current.y

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const idx = row * COLS + col

          const homeX = startX + col * SPACING
          const homeY = startY + row * SPACING

          if (!ready) {
            px[idx] = homeX
            py[idx] = homeY
            vx[idx] = 0
            vy[idx] = 0
          }

          vx[idx] += (homeX - px[idx]) * SPRING
          vy[idx] += (homeY - py[idx]) * SPRING

          // Repulsion — desktop only
          if (!isMobile) {
            const ddx = px[idx] - mx
            const ddy = py[idx] - my
            const dd  = Math.hypot(ddx, ddy)
            if (dd < REPULSE_R && dd > 0.5) {
              const f = ((1 - dd / REPULSE_R) ** 1.6) * REPULSE_F
              vx[idx] += (ddx / dd) * f
              vy[idx] += (ddy / dd) * f
            }
          }

          vx[idx] *= DAMPING
          vy[idx] *= DAMPING
          px[idx] += vx[idx]
          py[idx] += vy[idx]

          const xNorm  = col / (COLS - 1)
          const wave1  = Math.sin(xNorm * Math.PI * 2.2 + phase + t * 0.7) * amplitude
          const wave2  = Math.sin(xNorm * Math.PI * 4.8 + phase * 1.4 + t * 1.2) * amplitude * 0.18
          const wave3  = Math.sin(xNorm * Math.PI * 0.9 + t * 0.35) * amplitude * 0.12
          const waveY  = startY + (ROWS / 2) * SPACING + wave1 + wave2 + wave3
          const wProx  = Math.max(0, 1 - Math.abs(homeY - waveY) / (SPACING * 2.6)) ** 2

          const speed  = Math.hypot(vx[idx], vy[idx])
          const sFact  = Math.min(1, speed / 2.8)
          const excite = Math.max(wProx, sFact * 0.95)
          exc[idx] = excite

          const r = 1.8 + excite * 5.2

          if (excite > 0.55) {
            const a = Math.min(1, (excite - 0.55) / 0.45)
            ctx.fillStyle = `rgba(${Math.round(180 + a * 20)},${Math.round(100 - a * 50)},${Math.round(20 + a * 8)},${0.55 + a * 0.45})`
          } else if (excite > 0.1) {
            const a = (excite - 0.1) / 0.45
            ctx.fillStyle = `rgba(80,60,20,${0.18 + a * 0.38})`
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.13)'
          }

          ctx.beginPath()
          ctx.arc(px[idx], py[idx], r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ready = true

      // Snapshot in viewport coordinates so the fixed overlay can draw it
      const vel = scrollVelRef.current
      scrollVelRef.current *= 0.82
      if (Math.abs(vel) > 0.15) {
        const rect = canvas.getBoundingClientRect()
        const pts = new Float32Array(N * 2)
        for (let i = 0; i < N; i++) {
          pts[i * 2]     = rect.left + px[i]
          pts[i * 2 + 1] = rect.top  + py[i]
        }
        const store = ghostsRef.current
        if (store.length >= 22) store.shift()
        store.push({ pts, exc: exc.slice() as Float32Array, alpha: Math.min(0.55, Math.abs(vel) * 0.18 + 0.2) })
      }
    }

    animate()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [ghostsRef, isMobile, scrollVelRef])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

// ---------- Ghost overlay (fixed, full-viewport) ----------

function GhostOverlay({ ghostsRef }: { ghostsRef: { current: GhostFrame[] } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width  = window.innerWidth  * dpr
      canvas.height = window.innerHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      animId = requestAnimationFrame(animate)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      const store = ghostsRef.current
      for (let g = store.length - 1; g >= 0; g--) {
        const ghost = store[g]
        ghost.alpha *= 0.955
        if (ghost.alpha < 0.006) { store.splice(g, 1); continue }

        ctx.globalAlpha = ghost.alpha
        const pts = ghost.pts
        const excG = ghost.exc
        const n = pts.length / 2

        // Two batched passes — skip background dots (excite ≤ 0.1)
        // Pass 1: mid excite — warm brown
        ctx.fillStyle = 'rgba(80,60,20,1)'
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const e = excG[i]
          if (e <= 0.1 || e > 0.55) continue
          const r = 1.8 + e * 5.2
          ctx.moveTo(pts[i*2] + r, pts[i*2+1])
          ctx.arc(pts[i*2], pts[i*2+1], r, 0, Math.PI * 2)
        }
        ctx.fill()

        // Pass 2: high excite — amber/red
        ctx.fillStyle = 'rgba(190,75,18,1)'
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const e = excG[i]
          if (e <= 0.55) continue
          const r = 1.8 + e * 5.2
          ctx.moveTo(pts[i*2] + r, pts[i*2+1])
          ctx.arc(pts[i*2], pts[i*2+1], r, 0, Math.PI * 2)
        }
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    animate()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [ghostsRef])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 6,
      }}
    />
  )
}

// ---------- Skills matrix ----------

type SkillTrailBlock = { col: number; row: number; alpha: number; size: number; kind: 'snake' | 'wave'; hot: number }
type SkillDrawPoint = { x: number; y: number }
type SkillPixelTrailBlock = { x: number; y: number; alpha: number; size: number }

function isCircleGesture(points: SkillDrawPoint[]) {
  if (points.length < 28) return false

  const first = points[0]
  const last = points[points.length - 1]
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = maxX - minX
  const height = maxY - minY
  const closeDistance = Math.hypot(last.x - first.x, last.y - first.y)
  const aspect = width / Math.max(height, 1)

  if (width < 96 || height < 96) return false
  if (aspect < 0.58 || aspect > 1.72) return false
  if (closeDistance > Math.max(width, height) * 0.42) return false

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const sectors = new Set<number>()
  let pathLength = 0
  let radiusTotal = 0

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const previous = points[i - 1]
    if (previous) pathLength += Math.hypot(point.x - previous.x, point.y - previous.y)
    radiusTotal += Math.hypot(point.x - centerX, point.y - centerY)
    const angle = Math.atan2(point.y - centerY, point.x - centerX)
    sectors.add(Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 12))
  }

  const averageRadius = radiusTotal / points.length
  const circumference = Math.PI * 2 * averageRadius
  return sectors.size >= 9 && pathLength > circumference * 0.58
}

function SkillsMatrixCanvas({
  isMobile,
  unlockMode = false,
  unlocked = true,
  unlocking = false,
  onUnlock,
}: {
  isMobile: boolean
  unlockMode?: boolean
  unlocked?: boolean
  unlocking?: boolean
  onUnlock?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ x: 0.32, y: 0.46, active: false })
  const drawPointsRef = useRef<SkillDrawPoint[]>([])
  const pixelTrailRef = useRef<SkillPixelTrailBlock[]>([])
  const isDrawingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let frame = 0
    let animId = 0
    const trail: SkillTrailBlock[] = []

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const addTrailBlock = (col: number, row: number, size = 1, kind: SkillTrailBlock['kind'] = 'snake') => {
      trail.push({ col, row, alpha: 0.9, size, kind, hot: 0 })
      if (trail.length > 190) trail.shift()
    }

    const drawBlock = (x: number, y: number, size: number, alpha: number) => {
      ctx.fillStyle = `rgba(74, 178, 45, ${alpha})`
      ctx.fillRect(x, y, size, size)
    }

    const drawCollisionBlock = (x: number, y: number, size: number, alpha: number, heat: number) => {
      const glow = Math.min(1, Math.max(0, heat))
      const r = Math.round(74 + glow * 126)
      const g = Math.round(178 - glow * 58)
      const b = Math.round(45 - glow * 27)
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
      ctx.fillRect(x, y, size, size)
    }

    const drawLineBlocks = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      blockSize: number,
      alpha: number,
      progress = 1,
    ) => {
      const dx = toX - fromX
      const dy = toY - fromY
      const distance = Math.hypot(dx, dy)
      const steps = Math.max(1, Math.floor(distance / (blockSize * 0.86)))
      const visibleSteps = Math.floor(steps * progress)
      for (let i = 0; i <= visibleSteps; i++) {
        const p = i / steps
        drawBlock(fromX + dx * p - blockSize / 2, fromY + dy * p - blockSize / 2, blockSize, alpha)
      }
    }

    const drawKeyOutline = (startX: number, startY: number, gridWidth: number, gridHeight: number, blockSize: number, progress: number) => {
      const cx = startX + gridWidth * 0.34
      const cy = startY + gridHeight * 0.53
      const radius = Math.min(gridWidth * 0.075, gridHeight * 0.18)
      const shaftStartX = cx + radius * 1.05
      const shaftEndX = startX + gridWidth * 0.76
      const toothOneX = startX + gridWidth * 0.62
      const toothTwoX = startX + gridWidth * 0.71
      const toothTipX = shaftEndX
      const toothDepth = gridHeight * 0.095
      const toothNotchY = cy + toothDepth * 0.45
      const keyBlock = blockSize * 1.08
      const eased = 1 - Math.pow(1 - progress, 3)
      const pulse = 0.72 + Math.sin(frame * 0.12) * 0.16

      const segments: Array<[number, number, number, number]> = []
      const circleSteps = 48
      for (let i = 0; i < circleSteps; i++) {
        const a1 = (i / circleSteps) * Math.PI * 2
        const a2 = ((i + 1) / circleSteps) * Math.PI * 2
        segments.push([
          cx + Math.cos(a1) * radius,
          cy + Math.sin(a1) * radius,
          cx + Math.cos(a2) * radius,
          cy + Math.sin(a2) * radius,
        ])
      }
      segments.push([shaftStartX, cy, shaftEndX, cy])
      segments.push([toothOneX, cy, toothOneX, cy + toothDepth])
      segments.push([toothOneX, cy + toothDepth, toothTwoX, cy + toothDepth])
      segments.push([toothTwoX, cy + toothDepth, toothTwoX, toothNotchY])
      segments.push([toothTwoX, toothNotchY, toothTipX, toothNotchY])
      segments.push([toothTipX, toothNotchY, toothTipX, cy])

      const total = segments.length
      segments.forEach((segment, i) => {
        const segmentStart = i / total
        const segmentEnd = (i + 1) / total
        if (eased < segmentStart) return
        const segmentProgress = eased >= segmentEnd ? 1 : (eased - segmentStart) / (segmentEnd - segmentStart)
        drawLineBlocks(segment[0], segment[1], segment[2], segment[3], keyBlock, pulse, segmentProgress)
      })

      if (eased > 0.86) {
        const capPoints = [
          [shaftEndX, cy],
          [toothTipX, toothNotchY],
          [toothTipX, (cy + toothNotchY) / 2],
          [toothTwoX, toothNotchY],
          [toothTwoX, cy + toothDepth],
          [toothOneX, cy + toothDepth],
          [toothOneX, cy],
        ]
        capPoints.forEach(([x, y]) => {
          drawBlock(x - keyBlock / 2, y - keyBlock / 2, keyBlock * 1.08, Math.min(1, pulse + 0.12))
        })
        drawLineBlocks(toothTipX, cy, toothTipX, toothNotchY, keyBlock * 1.08, Math.min(1, pulse + 0.16), 1)
      }
    }

    const animate = () => {
      animId = requestAnimationFrame(animate)
      if (!width || !height) return

      frame++
      ctx.clearRect(0, 0, width, height)

      const cell = isMobile ? 14 : 17
      const cols = Math.max(12, Math.floor(width / cell))
      const rows = Math.max(8, Math.floor(height / cell))
      const gridWidth = (cols - 1) * cell
      const gridHeight = (rows - 1) * cell
      const startX = (width - gridWidth) / 2
      const startY = (height - gridHeight) / 2
      const dotRadius = isMobile ? 1.6 : 1.9
      const blockSize = isMobile ? 10 : 12
      const lockedMode = unlockMode && !unlocked

      ctx.fillStyle = 'rgba(0, 0, 0, 0.86)'
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = startX + col * cell
          const y = startY + row * cell
          ctx.beginPath()
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      const t = frame * 0.026
      const autoX = 0.5 + Math.sin(t * 0.72) * 0.38
      const autoY = 0.5 + Math.cos(t * 0.57) * 0.26
      const targetX = pointerRef.current.active ? pointerRef.current.x : autoX
      const targetY = pointerRef.current.active ? pointerRef.current.y : autoY
      const headCol = Math.max(0, Math.min(cols - 1, Math.round(targetX * (cols - 1))))
      const headRow = Math.max(0, Math.min(rows - 1, Math.round(targetY * (rows - 1))))

      if (!lockedMode && frame % 3 === 0) {
        addTrailBlock(headCol, headRow, 1.25, 'snake')
        addTrailBlock(headCol - 1, headRow, 0.9, 'snake')
        addTrailBlock(headCol, headRow + 1, 0.9, 'snake')
      }

      if (lockedMode && !unlocking) {
        const centerX = startX + gridWidth * 0.5
        const centerY = startY + gridHeight * 0.52
        const radius = Math.min(gridWidth * 0.17, gridHeight * 0.34)
        for (let i = 0; i < 42; i++) {
          const angle = i / 42 * Math.PI * 2
          const pulse = 0.5 + Math.sin(t * 2.2 + i * 0.55) * 0.22
          const size = blockSize * (i % 6 === 0 ? 1.12 : 0.86)
          drawBlock(
            centerX + Math.cos(angle) * radius - size / 2,
            centerY + Math.sin(angle) * radius - size / 2,
            size,
            pulse,
          )
        }
      } else if (!lockedMode) {
        for (let col = 0; col < cols; col++) {
          const wave = Math.sin(col * 0.56 + t * 1.8) * rows * 0.18
          const row = Math.round(rows * 0.52 + wave)
          if ((col + frame) % 7 === 0) addTrailBlock(col, row, col % 3 === 0 ? 1.2 : 0.9, 'wave')
        }
      }

      const snakeBlocks = !lockedMode
        ? trail.filter((block) => block.kind === 'snake' && block.alpha > 0.16)
        : []

      for (let i = trail.length - 1; i >= 0; i--) {
        const block = trail[i]
        block.alpha *= 0.943
        block.hot *= 0.9
        if (block.alpha < 0.035 || block.col < 0 || block.row < 0 || block.col >= cols || block.row >= rows) {
          trail.splice(i, 1)
          continue
        }

        if (!lockedMode && block.kind === 'wave') {
          const headDistance = Math.hypot(block.col - headCol, block.row - headRow)
          const snakeHit = headDistance <= 1.55 || snakeBlocks.some((snake) => Math.hypot(block.col - snake.col, block.row - snake.row) <= 1.25)
          if (snakeHit) block.hot = 1
        } else if (!lockedMode && block.kind === 'snake') {
          const waveHit = trail.some((wave) => wave.kind === 'wave' && wave.alpha > 0.16 && Math.hypot(block.col - wave.col, block.row - wave.row) <= 1.25)
          if (waveHit) block.hot = Math.max(block.hot, 0.72)
        }

        const size = blockSize * block.size
        const x = startX + block.col * cell - size / 2
        const y = startY + block.row * cell - size / 2
        if (block.hot > 0.04) {
          drawCollisionBlock(x, y, size * (1 + block.hot * 0.08), Math.min(1, block.alpha + block.hot * 0.16), block.hot)
        } else {
          drawBlock(x, y, size, block.alpha)
        }
      }

      const pixelTrail = pixelTrailRef.current
      for (let i = pixelTrail.length - 1; i >= 0; i--) {
        const block = pixelTrail[i]
        block.alpha *= 0.94
        if (block.alpha < 0.035) {
          pixelTrail.splice(i, 1)
          continue
        }
        drawBlock(block.x - block.size / 2, block.y - block.size / 2, block.size, block.alpha)
      }

      if (lockedMode && unlocking) {
        const progress = Math.min(1, frame / 76)
        drawKeyOutline(startX, startY, gridWidth, gridHeight, blockSize, progress)
      }

      if (!lockedMode) {
        const headSize = blockSize * 1.24
        drawBlock(startX + headCol * cell - headSize / 2, startY + headRow * cell - headSize / 2, headSize, 0.96)
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    animId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [isMobile, unlockMode, unlocked, unlocking])

  const updatePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    pointerRef.current = {
      x,
      y,
      active: true,
    }
    return {
      x: x * rect.width,
      y: y * rect.height,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = updatePointer(event)
    if (unlockMode && !unlocked && isDrawingRef.current) {
      drawPointsRef.current.push(point)
      pixelTrailRef.current.push({ x: point.x, y: point.y, alpha: 0.95, size: isMobile ? 10 : 12 })
      if (pixelTrailRef.current.length > 240) pixelTrailRef.current.shift()
      if (isCircleGesture(drawPointsRef.current)) {
        isDrawingRef.current = false
        onUnlock?.()
      }
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = updatePointer(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    if (!unlockMode || unlocked) return
    isDrawingRef.current = true
    drawPointsRef.current = [point]
    pixelTrailRef.current.push({ x: point.x, y: point.y, alpha: 0.95, size: isMobile ? 10 : 12 })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!unlockMode || unlocked || !isDrawingRef.current) return
    const point = updatePointer(event)
    drawPointsRef.current.push(point)
    isDrawingRef.current = false
    if (isCircleGesture(drawPointsRef.current)) {
      onUnlock?.()
    }
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { isDrawingRef.current = false }}
      onPointerEnter={() => { pointerRef.current.active = true }}
      onPointerLeave={() => { pointerRef.current.active = false }}
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
    />
  )
}

// ---------- Page ----------

export default function CVPage() {
  const [visible, setVisible]   = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [skillsUnlocked, setSkillsUnlocked] = useState(false)
  const [skillsUnlocking, setSkillsUnlocking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)
  const scrollVelRef = useRef(0)
  const lastScrollRef = useRef({ top: 0, time: 0 })
  const ghostsRef = useRef<GhostFrame[]>([])
  const skillsUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slotRafRef = useRef<number | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const prevBody = document.body.style.background
    const prevHtml = document.documentElement.style.background
    document.body.style.background = '#e2deda'
    document.documentElement.style.background = '#e2deda'
    return () => {
      document.body.style.background = prevBody
      document.documentElement.style.background = prevHtml
    }
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cv-page-active', { detail: true }))
    return () => { window.dispatchEvent(new CustomEvent('cv-page-active', { detail: false })) }
  }, [])

  useEffect(() => {
    return () => {
      if (skillsUnlockTimerRef.current) clearTimeout(skillsUnlockTimerRef.current)
      if (slotRafRef.current) cancelAnimationFrame(slotRafRef.current)
    }
  }, [])

  const updateSlotRows = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const focalY = containerRect.top + containerRect.height * 0.53
    const focusRadius = Math.max(isMobile ? 170 : 180, containerRect.height * (isMobile ? 0.3 : 0.2))
    const falloff = Math.max(isMobile ? 190 : 300, containerRect.height * (isMobile ? 0.42 : 0.4))

    const about = aboutRef.current
    if (about) {
      const rect = about.getBoundingClientRect()
      const exitStart = containerRect.top + containerRect.height * 0.36
      const exitEnd = containerRect.top + containerRect.height * 0.08
      const rawExit = (exitStart - rect.top) / (exitStart - exitEnd)
      const exit = Math.min(1, Math.max(0, rawExit))
      const easedExit = exit * exit * (3 - 2 * exit)
      const velocity = Math.min(1, Math.abs(scrollVelRef.current) * 0.42)
      const copyLift = easedExit * (isMobile ? -14 : -30) - velocity * (isMobile ? 2 : 4)
      const labelDrift = easedExit * (isMobile ? -8 : -20)

      about.style.setProperty('--cv-about-copy-y', `${copyLift}px`)
      about.style.setProperty('--cv-about-label-y', `${labelDrift}px`)
    }

    container.querySelectorAll<HTMLElement>('.cv-slot-row').forEach((row, index) => {
      const rect = row.getBoundingClientRect()
      const center = rect.top + rect.height * 0.5
      const distance = Math.abs(center - focalY)
      const unfocused = Math.min(1, Math.max(0, (distance - focusRadius) / falloff))
      const intensity = unfocused * unfocused * (3 - 2 * unfocused)
      const rowDirection = index % 2 === 0 ? 1 : -1
      const offset = intensity * (isMobile ? 24 : 84)
      const jitter = intensity * (isMobile ? 10 : 28)
      const tilt = intensity * rowDirection * 0.85
      const clarity = 1 - intensity

      row.style.setProperty('--cv-slot-left-x', `${offset}px`)
      row.style.setProperty('--cv-slot-right-x', `${-offset}px`)
      row.style.setProperty('--cv-slot-left-y', `${jitter * rowDirection}px`)
      row.style.setProperty('--cv-slot-right-y', `${-jitter * rowDirection}px`)
      row.style.setProperty('--cv-slot-left-tilt', `${tilt}deg`)
      row.style.setProperty('--cv-slot-right-tilt', `${-tilt}deg`)
      row.style.setProperty('--cv-slot-opacity', `${0.46 + clarity * 0.54}`)
      row.style.setProperty('--cv-slot-crunch', `${intensity * 0.052}em`)
      row.style.setProperty('--cv-slot-nest-x', `${intensity * (isMobile ? 8 : 22)}px`)
    })
  }, [isMobile])

  const scheduleSlotRows = useCallback(() => {
    if (slotRafRef.current) return
    slotRafRef.current = requestAnimationFrame(() => {
      slotRafRef.current = null
      updateSlotRows()
    })
  }, [updateSlotRows])

  useEffect(() => {
    const t = requestAnimationFrame(updateSlotRows)
    window.addEventListener('resize', scheduleSlotRows)
    return () => {
      cancelAnimationFrame(t)
      window.removeEventListener('resize', scheduleSlotRows)
    }
  }, [scheduleSlotRows, updateSlotRows])

  const handleScroll = () => {
    const top = scrollRef.current?.scrollTop ?? 0
    const now = performance.now()
    const dt = now - lastScrollRef.current.time
    // Only compute velocity when delta is in a sane range (active scrolling)
    if (dt > 0 && dt < 250) {
      scrollVelRef.current = (top - lastScrollRef.current.top) / dt
    }
    lastScrollRef.current = { top, time: now }
    setScrolled(top > 52)
    scheduleSlotRows()
  }

  const scrollToSection = (id: string) => {
    const container = scrollRef.current
    const target = document.getElementById(id)
    if (!container || !target) return
    const start = container.scrollTop
    const end = target.getBoundingClientRect().top - container.getBoundingClientRect().top + start - 72
    const duration = 1100
    const t0 = performance.now()
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      container.scrollTop = start + (end - start) * ease(p)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  const openSkills = () => {
    if (isMobile || skillsUnlocked || skillsUnlocking) return
    setSkillsUnlocking(true)
    skillsUnlockTimerRef.current = setTimeout(() => {
      setSkillsUnlocked(true)
      setSkillsUnlocking(false)
      skillsUnlockTimerRef.current = null
    }, 1680)
  }

  // Nav sizing — smaller on mobile
  const navFontSize    = isMobile ? '0.56rem' : '0.88rem'
  const navLetterSp   = isMobile ? '0.01em'  : '0.06em'
  const navGap        = isMobile ? '0.42rem'  : '1.35rem'
  const navPadding    = scrolled
    ? (isMobile ? '0.42rem 0.54rem' : '0.9rem 1.8rem')
    : (isMobile ? '0.48rem 0.7rem'  : '0.78rem 2rem')
  const navMaxWidth   = scrolled
    ? (isMobile ? 'min(23.25rem, calc(100vw - 16px))' : 'min(34rem, calc(100vw - 32px))')
    : '100%'
  const skillsAreOpen = isMobile || skillsUnlocked
  const skillsShellClass = [
    'cv-rise',
    'cv-skills-shell',
    skillsAreOpen ? 'cv-skills-shell-opened' : 'cv-skills-shell-locked',
    skillsUnlocking ? 'cv-skills-shell-opening' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
    <GhostOverlay ghostsRef={ghostsRef} />
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#e2deda',
        overflowY: 'auto',
        fontFamily: 'var(--font-geist-mono)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms ease',
      }}
    >
      <style>{`
        @keyframes cv-rise {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cv-skills-unlock-fade {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(0.992); filter: blur(3px); }
        }
        @keyframes cv-skills-content-in {
          from { opacity: 0; transform: translateY(18px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cv-rise { opacity: 0; animation: cv-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .cv-about-motion {
          --cv-about-copy-y: 0px;
          --cv-about-label-y: 0px;
        }
        .cv-about-motion .cv-about-label {
          transform: translate3d(0, var(--cv-about-label-y), 0);
          transition: transform 120ms linear;
          will-change: transform;
        }
        .cv-about-motion .cv-body-text {
          transform: translate3d(0, var(--cv-about-copy-y), 0);
          transition: transform 120ms linear;
          will-change: transform;
        }
        .cv-slot-row {
          --cv-slot-left-x: 84px;
          --cv-slot-right-x: -84px;
          --cv-slot-left-y: 28px;
          --cv-slot-right-y: -28px;
          --cv-slot-left-tilt: 0.85deg;
          --cv-slot-right-tilt: -0.85deg;
          --cv-slot-opacity: 0.46;
          --cv-slot-crunch: 0.052em;
          --cv-slot-nest-x: 22px;
          position: relative;
          overflow: hidden;
        }
        .cv-slot-row > :first-child {
          opacity: var(--cv-slot-opacity);
          transform: translate(var(--cv-slot-left-x), var(--cv-slot-left-y)) skewY(var(--cv-slot-left-tilt));
          letter-spacing: var(--cv-slot-crunch);
          transition: opacity 110ms linear, transform 110ms linear, letter-spacing 110ms linear;
          will-change: opacity, transform, letter-spacing;
        }
        .cv-slot-row > :last-child {
          opacity: var(--cv-slot-opacity);
          transform: translate(var(--cv-slot-right-x), var(--cv-slot-right-y)) skewY(var(--cv-slot-right-tilt));
          letter-spacing: var(--cv-slot-crunch);
          transition: opacity 110ms linear, transform 110ms linear, letter-spacing 110ms linear;
          will-change: opacity, transform, letter-spacing;
        }
        .cv-slot-row > :only-child {
          transform: translate(0, var(--cv-slot-left-y)) skewY(var(--cv-slot-left-tilt));
        }
        .cv-slot-row > :first-child > *:nth-child(odd) {
          transform: translateX(calc(var(--cv-slot-nest-x) * -1));
          transition: transform 110ms linear;
        }
        .cv-slot-row > :first-child > *:nth-child(even) {
          transform: translateX(var(--cv-slot-nest-x));
          transition: transform 110ms linear;
        }
        .cv-slot-row > :last-child > *:nth-child(odd) {
          transform: translateX(var(--cv-slot-nest-x));
          transition: transform 110ms linear;
        }
        .cv-slot-row > :last-child > *:nth-child(even) {
          transform: translateX(calc(var(--cv-slot-nest-x) * -1));
          transition: transform 110ms linear;
        }
        @media (prefers-reduced-motion: reduce) {
          .cv-slot-row > :first-child,
          .cv-slot-row > :last-child {
            opacity: 1 !important;
            transform: none !important;
            letter-spacing: inherit !important;
            transition: none !important;
          }
          .cv-slot-row > :first-child > *,
          .cv-slot-row > :last-child > * {
            transform: none !important;
            transition: none !important;
          }
          .cv-about-motion .cv-about-label,
          .cv-about-motion .cv-body-text {
            transform: none !important;
            transition: none !important;
          }
        }

        .cv-skills-shell {
          --cv-skills-frame-height: clamp(31rem, 56vw, 42rem);
          margin-top: 1.2rem;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
          height: var(--cv-skills-frame-height);
          background: #d8d8da;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 8px;
          overflow: hidden;
          transition: height 720ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 520ms ease, border-color 520ms ease;
        }
        .cv-skills-shell-locked {
          grid-template-columns: 1fr;
          cursor: crosshair;
        }
        .cv-skills-shell-opening {
          border-color: rgba(74,178,45,0.36);
          box-shadow: 0 0 0 1px rgba(74,178,45,0.12), 0 18px 48px rgba(74,178,45,0.08);
          cursor: default;
        }
        .cv-skills-shell-opened .cv-skills-list,
        .cv-skills-shell-opened .cv-skills-matrix {
          animation: cv-skills-content-in 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .cv-skills-shell-opened .cv-skills-matrix {
          animation-delay: 80ms;
        }
        .cv-skills-unlock-stage {
          position: relative;
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          background: #d8d8da;
        }
        .cv-skills-shell-opening .cv-skills-unlock-stage {
          pointer-events: none;
          animation: cv-skills-unlock-fade 420ms cubic-bezier(0.16, 1, 0.3, 1) 1220ms forwards;
        }
        .cv-skills-shell-opening .cv-skills-unlock-title {
          opacity: 0.38;
          transform: translateY(-0.25rem);
          transition: opacity 360ms ease, transform 360ms ease;
        }
        .cv-skills-shell-opening .cv-skills-unlock-subtitle {
          color: #4ab22d;
          transition: color 220ms ease;
        }
        .cv-skills-unlock-copy {
          position: relative;
          z-index: 2;
          padding: 2.1rem 1.5rem 0.3rem;
          text-align: center;
          pointer-events: none;
        }
        .cv-skills-unlock-title {
          margin: 0;
          color: #101012;
          font-family: var(--font-geist-sans);
          font-size: clamp(1.9rem, 4vw, 3rem);
          font-weight: 500;
          letter-spacing: 0;
          line-height: 1;
        }
        .cv-skills-unlock-subtitle {
          margin: 0.55rem 0 0;
          color: #77726d;
          font-size: 0.62rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .cv-skills-unlock-matrix {
          position: relative;
          min-height: 0;
        }
        .cv-skills-unlock-footer {
          position: relative;
          z-index: 2;
          padding: 0.2rem 1.5rem 2.1rem;
          text-align: center;
          color: #1a1a1a;
          font-family: var(--font-geist-sans);
          font-size: clamp(1.35rem, 2.9vw, 2.35rem);
          font-weight: 500;
          line-height: 1;
          pointer-events: none;
        }
        .cv-skills-list {
          padding: 1.35rem 1.45rem;
          border-right: 1px solid rgba(0,0,0,0.11);
          min-height: 0;
        }
        .cv-skill-group {
          display: grid;
          grid-template-columns: minmax(8.5rem, 0.34fr) 1fr;
          gap: 0.8rem 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid rgba(0,0,0,0.11);
        }
        .cv-skill-group:first-child { padding-top: 0; }
        .cv-skill-group:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .cv-skill-token {
          display: inline-flex;
          align-items: center;
          min-height: 1.45rem;
          margin: 0 0.28rem 0.38rem 0;
          padding: 0.22rem 0.42rem;
          background: rgba(255,255,255,0.3);
          border: 1px solid rgba(0,0,0,0.09);
          border-radius: 4px;
          color: #252525;
          font-size: 0.62rem;
          letter-spacing: 0.03em;
          line-height: 1.1;
          transition: background 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
        }
        .cv-skill-token:hover {
          background: #4ab22d;
          border-color: #4ab22d;
          color: #071106;
          transform: translateY(-1px);
        }
        .cv-skills-matrix {
          position: relative;
          min-height: 0;
          height: 100%;
          background: #d8d8da;
          cursor: crosshair;
        }
        .cv-skills-matrix::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-left: 1px solid rgba(255,255,255,0.22);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
        }

        .cv-exp-row {
          padding: 1.4rem 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem 2rem;
        }
        @media (max-width: 640px) {
          .cv-exp-row { grid-template-columns: 1fr; gap: 0.5rem; }
        }

        /* Mobile about — single column */
        @media (max-width: 768px) {
          .cv-nav-inner {
            display: flex !important;
            align-items: center !important;
            gap: 0.42rem;
            padding: 0.42rem 0.54rem !important;
            max-width: min(23.25rem, calc(100vw - 16px)) !important;
          }
          .cv-nav-brand {
            font-size: 0.68rem !important;
            letter-spacing: 0.11em !important;
          }
          .cv-nav-links {
            display: flex !important;
            align-items: center;
            gap: 0.42rem !important;
            width: auto;
          }
          .cv-nav-floating-mobile .cv-nav-links {
            flex: 1;
            justify-content: space-evenly;
            margin-left: 0 !important;
          }
          .cv-nav-link {
            min-width: 0;
            font-size: 0.56rem !important;
            letter-spacing: 0.01em !important;
            text-align: center;
          }
          .cv-nav-contact {
            font-size: 0.56rem !important;
            letter-spacing: 0.025em !important;
            padding: 0.26rem 0.54rem !important;
            margin-left: 0.18rem !important;
          }
          .cv-nav-floating-mobile .cv-nav-contact {
            margin-left: 0 !important;
          }
          .cv-about-grid {
            grid-template-columns: 1fr !important;
            gap: 0.5rem 0 !important;
          }
          .cv-about-label { margin-bottom: 0.3rem !important; }
          .cv-body-text {
            letter-spacing: 0.01em !important;
            line-height: 1.58 !important;
          }
          .cv-exp-detail {
            font-size: 0.68rem !important;
            letter-spacing: 0.01em !important;
          }
          .cv-skills-shell {
            grid-template-columns: 1fr;
            height: auto;
            min-height: 0;
          }
          .cv-skills-shell-locked {
            min-height: 0;
          }
          .cv-skills-unlock-stage {
            display: none;
          }
          .cv-skills-list {
            padding: 1rem;
            border-right: none;
            border-bottom: 1px solid rgba(0,0,0,0.11);
          }
          .cv-skill-group {
            grid-template-columns: 1fr;
            gap: 0.55rem;
            padding: 0.9rem 0;
          }
          .cv-skill-token {
            font-size: 0.58rem;
            min-height: 1.35rem;
            margin: 0 0.22rem 0.32rem 0;
          }
          .cv-skills-matrix {
            min-height: 14.5rem;
            cursor: default;
          }
          .cv-skills-matrix::after {
            border-left: none;
            border-top: 1px solid rgba(255,255,255,0.22);
          }
        }

        .cv-nav-contact {
          position: relative;
          overflow: hidden;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          color: #f5f2ee;
          text-decoration: none;
          background: #1a1a1a;
          border-radius: 6px;
          padding: 0.38rem 1.1rem;
          transition: background 140ms ease, color 140ms ease;
          white-space: nowrap;
        }
        .cv-nav-contact:hover, .cv-nav-contact:focus-visible {
          background: #e2deda;
          color: #1a1a1a;
          outline: none;
        }
        .cv-nav-contact-default,
        .cv-nav-contact-reveal {
          display: block;
          transition: opacity 130ms ease, transform 130ms ease;
        }
        .cv-nav-contact-reveal {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(0.3rem);
        }
        .cv-nav-contact:hover .cv-nav-contact-default,
        .cv-nav-contact:focus-visible .cv-nav-contact-default {
          opacity: 0;
          transform: translateY(-0.3rem);
        }
        .cv-nav-contact:hover .cv-nav-contact-reveal,
        .cv-nav-contact:focus-visible .cv-nav-contact-reveal {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Nav — flat bar at top, condenses to floating pill on scroll */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          padding: scrolled ? (isMobile ? '8px 10px' : '10px 12px') : '0',
          transition: 'padding 620ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <nav
          className={`cv-nav-inner ${isMobile && scrolled ? 'cv-nav-floating-mobile' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: navMaxWidth,
            background: scrolled ? 'rgba(200, 194, 186, 0.46)' : '#e2deda',
            backdropFilter: scrolled ? 'blur(22px) saturate(160%)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(22px) saturate(160%)' : 'none',
            border: scrolled ? '1px solid rgba(0,0,0,0.09)' : 'none',
            borderBottom: scrolled ? 'none' : '1px solid rgba(0,0,0,0.09)',
            borderRadius: scrolled ? (isMobile ? 10 : 20) : 0,
            padding: navPadding,
            boxShadow: scrolled ? '0 2px 18px rgba(0,0,0,0.08)' : 'none',
            transition: [
              'border-radius 620ms cubic-bezier(0.16, 1, 0.3, 1)',
              'background 480ms ease',
              'box-shadow 480ms ease',
              'padding 620ms cubic-bezier(0.16, 1, 0.3, 1)',
              'max-width 620ms cubic-bezier(0.16, 1, 0.3, 1)',
            ].join(', '),
          }}
        >
          <button
            className="cv-nav-brand"
            onClick={() => window.location.reload()}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: isMobile ? '0.78rem' : '0.88rem',
              letterSpacing: '0.18em',
              color: '#1a1a1a',
              fontWeight: 700,
              fontFamily: 'var(--font-geist-mono)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            J · C
          </button>
          <div className="cv-nav-links" style={{ display: 'flex', gap: navGap, alignItems: 'center', marginLeft: 'auto' }}>
            <button
              className="cv-nav-link"
              onClick={() => scrollToSection('skills')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: navFontSize, letterSpacing: navLetterSp, color: '#5a5550', fontFamily: 'var(--font-geist-mono)', whiteSpace: 'nowrap' }}
            >
              Skills
            </button>
            <button
              className="cv-nav-link"
              onClick={() => scrollToSection('experience')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: navFontSize, letterSpacing: navLetterSp, color: '#5a5550', fontFamily: 'var(--font-geist-mono)', whiteSpace: 'nowrap' }}
            >
              Experience
            </button>
            <button
              className="cv-nav-link"
              onClick={() => scrollToSection('credits')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: navFontSize, letterSpacing: navLetterSp, color: '#5a5550', fontFamily: 'var(--font-geist-mono)', whiteSpace: 'nowrap' }}
            >
              Credits
            </button>
          </div>
          <a href="mailto:thecyberfoolz@gmail.com" className="cv-nav-contact" style={{ marginLeft: navGap }}>
            <span className="cv-nav-contact-default">Contact</span>
            <span className="cv-nav-contact-reveal">Email</span>
          </a>
        </nav>
      </div>

      {/* Hero header */}
      <div
        className="cv-rise"
        style={{
          animationDelay: '80ms',
          maxWidth: '80rem',
          margin: '0 auto',
          padding: isMobile ? '1.8rem 1.2rem 0' : '2.8rem 2rem 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.22em', color: '#9a9590', marginBottom: '0.9rem', textTransform: 'uppercase' }}>
            CV
          </div>
          <h1 style={{ fontSize: 'clamp(3.2rem, 9.5vw, 8rem)', fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 0.88, color: '#18181a', margin: 0 }}>
            Selected<br />Work
          </h1>
        </div>
        <p style={{ fontSize: 'clamp(0.62rem, 1.1vw, 0.82rem)', letterSpacing: '0.1em', color: '#8a8580', paddingBottom: '0.5rem', margin: 0 }}>
          Software Engineer · Full Stack
        </p>
      </div>

      {/* DOT GRID — centerpiece */}
      <div
        className="cv-rise"
        style={{
          animationDelay: '180ms',
          width: '100%',
          height: isMobile ? 'clamp(160px, 26vh, 220px)' : 'clamp(260px, 38vh, 420px)',
          margin: isMobile ? '1.6rem 0 0' : '2.4rem 0 0',
          cursor: isMobile ? 'default' : 'crosshair',
        }}
      >
        <DotCanvas isMobile={isMobile} scrollVelRef={scrollVelRef} ghostsRef={ghostsRef} />
      </div>

      {/* About / Interests */}
      <div
        ref={aboutRef}
        className="cv-rise cv-about-motion"
        style={{
          animationDelay: '300ms',
          maxWidth: '80rem',
          margin: '0 auto',
          padding: isMobile ? '1.8rem 1.2rem 0' : '2.6rem 2rem 0',
        }}
      >
        <div
          className="cv-about-grid"
          style={{ display: 'grid', gridTemplateColumns: 'min(10rem, 28%) 1fr', gap: '0 2.5rem', alignItems: 'start' }}
        >
          <div
            className="cv-about-label"
            style={{ fontSize: '0.56rem', letterSpacing: '0.22em', color: '#aaa59f', textTransform: 'uppercase', paddingTop: '0.18rem' }}
          >
            About
          </div>
          <p
            className="cv-body-text"
            style={{ fontSize: 'clamp(0.78rem, 1.15vw, 0.96rem)', lineHeight: 1.68, color: '#3a3530', margin: 0, letterSpacing: '0.01em' }}
          >
            {ABOUT}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: isMobile ? '2.4rem 1.2rem 5rem' : '3.5rem 2rem 7rem' }}>

        {/* Technical Skills */}
        <Section label="Technical Skills" id="skills" delay={380}>
          <div className={skillsShellClass} style={{ animationDelay: '450ms' }}>
            {skillsAreOpen ? (
              <>
                <div className="cv-skills-list">
                  {TECHNICAL_SKILLS.map((group) => (
                    <div key={group.label} className="cv-skill-group">
                      <div style={{ fontSize: '0.56rem', letterSpacing: '0.18em', color: '#77726d', textTransform: 'uppercase', paddingTop: '0.28rem' }}>
                        {group.label}
                      </div>
                      <div>
                        {group.skills.map((skill) => (
                          <span key={skill} className="cv-skill-token">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cv-skills-matrix">
                  <SkillsMatrixCanvas isMobile={isMobile} />
                </div>
              </>
            ) : (
              <div className="cv-skills-unlock-stage">
                <div className="cv-skills-unlock-copy">
                  <p className="cv-skills-unlock-title">Draw a circle to open</p>
                  <p className="cv-skills-unlock-subtitle">Skills matrix locked</p>
                </div>
                <div className="cv-skills-unlock-matrix">
                  <SkillsMatrixCanvas
                    isMobile={isMobile}
                    unlockMode
                    unlocked={skillsAreOpen}
                    unlocking={skillsUnlocking}
                    onUnlock={openSkills}
                  />
                </div>
                <div className="cv-skills-unlock-footer">
                  Technical Skills
                </div>
                <button
                  type="button"
                  onClick={openSkills}
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                  }}
                >
                  Open technical skills
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* Experience */}
        <Section label="Experience" id="experience" delay={620}>
          {EXPERIENCE.map((job, i) => (
            <div
              key={i}
              className="cv-rise cv-exp-row cv-slot-row"
              style={{ animationDelay: `${700 + i * 70}ms` }}
            >
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#18181a', marginBottom: '0.3rem', letterSpacing: '0.01em' }}>
                  {job.role}
                </div>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', color: '#9a9590' }}>
                  {job.company} · {job.type}
                </div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.06em', color: '#b5b0aa', marginTop: '0.15rem' }}>
                  {job.period}
                </div>
              </div>
              <div className="cv-exp-detail" style={{ fontSize: '0.7rem', lineHeight: 1.68, color: '#5a5550', letterSpacing: '0.01em' }}>
                {job.detail}
              </div>
            </div>
          ))}
        </Section>

        {/* Awards */}
        <Section label="Awards" delay={740}>
          {AWARDS.map((award, i) => (
            <div
              key={i}
              className="cv-rise cv-slot-row"
              style={{
                animationDelay: `${800 + i * 60}ms`,
                padding: '1.2rem 0',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.52rem', letterSpacing: '0.1em', background: '#c87820', color: '#fff', borderRadius: 4, padding: '0.18rem 0.52rem', flexShrink: 0 }}>
                  AWARD
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#18181a', letterSpacing: '0.01em' }}>{award.title}</span>
                <span style={{ fontSize: '0.64rem', letterSpacing: '0.06em', color: '#9a9590' }}>{award.event}</span>
              </div>
              <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', color: '#b5b0aa' }}>{award.year}</span>
            </div>
          ))}
        </Section>

        {/* Education */}
        <Section label="Education" delay={860}>
          {EDUCATION.map((edu, i) => (
            <div
              key={i}
              className="cv-rise cv-slot-row"
              style={{
                animationDelay: `${920 + i * 55}ms`,
                padding: '1.1rem 0',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 500, color: '#18181a', letterSpacing: '0.01em' }}>{edu.institution}</div>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.06em', color: '#9a9590', marginTop: '0.18rem' }}>{edu.degree}</div>
              </div>
              {edu.period && (
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.06em', color: '#b5b0aa', flexShrink: 0 }}>{edu.period}</div>
              )}
            </div>
          ))}
        </Section>

        {/* Credits */}
        <Section label="Credits" id="credits" delay={1060}>
          <div
            className="cv-rise"
            style={{
              animationDelay: '1100ms',
              marginTop: '1.2rem',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.07)',
            }}
          >
            {CREDITS.map((credit, i) => (
              <div
                key={i}
                className="cv-slot-row"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem 2.5rem',
                  padding: '1.3rem 1.6rem',
                  borderBottom: i < CREDITS.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ minWidth: '9rem' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#18181a', letterSpacing: '0.01em' }}>{credit.name}</div>
                  <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', color: '#9a9590', marginTop: '0.18rem' }}>{credit.role}</div>
                </div>
                <div style={{ fontSize: '0.68rem', lineHeight: 1.58, color: '#5a5550', letterSpacing: '0.01em', flex: 1, minWidth: '12rem' }}>
                  {credit.detail}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div
          className="cv-rise"
          style={{
            animationDelay: '1180ms',
            marginTop: '3.5rem',
            paddingTop: '1.4rem',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.56rem', letterSpacing: '0.1em', color: '#aaa59f' }}>Jazz Cheema © 2026 · Ver.01.09.26</span>
          <span style={{ fontSize: '0.56rem', letterSpacing: '0.1em', color: '#bbb6b0' }}>Built with Three.js · Next.js · React</span>
        </div>

      </div>
    </div>
    </>
  )
}

function Section({ label, id, delay = 0, children }: { label: string; id?: string; delay?: number; children: React.ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: '3rem' }}>
      <div
        className="cv-rise"
        style={{
          animationDelay: `${delay}ms`,
          fontSize: '0.54rem',
          letterSpacing: '0.26em',
          color: '#aaa59f',
          textTransform: 'uppercase',
          marginBottom: '0',
          paddingBottom: '0.7rem',
          borderBottom: '1px solid rgba(0,0,0,0.14)',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

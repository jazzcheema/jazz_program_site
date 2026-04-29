'use client'

import { useEffect, useRef } from 'react'

type VortexParticle = {
  angle: number
  radius: number
  speed: number
  drift: number
  size: number
  alpha: number
  hue: number
}

const DEFAULT_HUES = [32, 142, 220]

type VortexBackgroundProps = {
  className?: string
  hues?: number[]
  particleMultiplier?: number
  speedMultiplier?: number
  alphaMultiplier?: number
  saturation?: number
  lightness?: number
  backgroundFill?: string
  wind?: number
}

export default function VortexBackground({
  className,
  hues = DEFAULT_HUES,
  particleMultiplier = 1,
  speedMultiplier = 1,
  alphaMultiplier = 1,
  saturation = 54,
  lightness = 48,
  backgroundFill = 'rgba(12, 12, 12, 0.42)',
  wind = 0,
}: VortexBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let dpr = 1
    let tick = 0

    const particleCount = Math.round((prefersReducedMotion ? 120 : 320) * particleMultiplier)
    const particles: VortexParticle[] = []

    const resetParticle = (particle?: Partial<VortexParticle>): VortexParticle => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random(),
      speed: (0.0012 + Math.random() * 0.0032) * speedMultiplier,
      drift: (0.0007 + Math.random() * 0.0022) * speedMultiplier,
      size: 0.45 + Math.random() * 1.15,
      alpha: (0.12 + Math.random() * 0.34) * alphaMultiplier,
      hue: hues[Math.floor(Math.random() * hues.length)] ?? DEFAULT_HUES[0],
      ...particle,
    })

    for (let i = 0; i < particleCount; i++) {
      particles.push(resetParticle())
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()

    const draw = () => {
      tick += prefersReducedMotion ? 0.18 : 1
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = backgroundFill
      ctx.fillRect(0, 0, width, height)

      const cx = width * 0.5
      const cy = height * 0.48
      const maxRadius = Math.hypot(width, height) * 0.58

      ctx.globalCompositeOperation = 'lighter'

      for (const p of particles) {
        p.angle += p.speed
        p.radius += p.drift

        if (p.radius > 1.08) {
          Object.assign(p, resetParticle({ radius: 0.04, angle: p.angle + Math.PI * 0.35 }))
        }

        const wave = Math.sin(tick * 0.006 + p.angle * 2.2) * 0.085
        const r = (p.radius + wave) * maxRadius
        const pinch = 0.24 + p.radius * 0.76
        const windOffset = Math.sin(tick * 0.004 + p.radius * 6) * wind * p.radius
        const x = cx + Math.cos(p.angle + p.radius * 5.4) * r + windOffset
        const y = cy + Math.sin(p.angle + p.radius * 5.4) * r * pinch
        const alpha = p.alpha * Math.max(0, 1 - p.radius * 0.72)

        ctx.globalAlpha = alpha
        ctx.fillStyle = `hsl(${p.hue} ${saturation}% ${lightness}%)`
        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fill()

        if (p.radius > 0.22) {
          const tailAngle = p.angle + p.radius * 5.4 - 0.05
          ctx.globalAlpha = alpha * 0.34
          ctx.strokeStyle = `hsl(${p.hue} ${saturation}% ${Math.max(16, lightness - 6)}%)`
          ctx.lineWidth = 0.55
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(
            cx + Math.cos(tailAngle) * (r - 18) + windOffset * 0.72,
            cy + Math.sin(tailAngle) * (r - 18) * pinch,
          )
          ctx.stroke()
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1

      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(draw)
      }
    }

    let animationId = requestAnimationFrame(draw)
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(animationId)
      ro.disconnect()
    }
  }, [alphaMultiplier, backgroundFill, hues, lightness, particleMultiplier, saturation, speedMultiplier, wind])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

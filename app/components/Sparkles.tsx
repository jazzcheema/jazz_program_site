'use client'

import { useEffect, useRef } from 'react'

export default function Sparkles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    type P = { x: number; y: number; size: number; vy: number; opacity: number; fade: number }

    const spawn = (): P => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 4,
      size: Math.random() * 1.1 + 0.2,
      vy: -(Math.random() * 0.28 + 0.07),
      opacity: 0,
      fade: Math.random() * 0.006 + 0.003,
    })

    const particles: P[] = Array.from({ length: 90 }, () => {
      const p = spawn()
      p.y = Math.random() * canvas.height
      p.opacity = Math.random()
      return p
    })

    let animId: number

    const draw = () => {
      animId = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.y += p.vy
        p.opacity += p.fade
        if (p.opacity >= 1) { p.opacity = 1; p.fade *= -1 }
        if (p.opacity <= 0 || p.y < -4) Object.assign(p, spawn())
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = '#c0c0c0'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

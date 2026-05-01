'use client'

import { useEffect, useRef } from 'react'

type WebcamPixelGridProps = {
  gridCols?: number
  gridRows?: number
  maxElevation?: number
  motionSensitivity?: number
  elevationSmoothing?: number
  colorMode?: 'webcam' | 'monochrome'
  monochromeColor?: string
  backgroundColor?: string
  mirror?: boolean
  gapRatio?: number
  invertColors?: boolean
  darken?: number
  borderColor?: string
  borderOpacity?: number
  className?: string
  onWebcamError?: (error: Error) => void
  onWebcamReady?: () => void
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const parseHexColor = (color: string) => {
  const clean = color.replace('#', '').trim()
  if (clean.length !== 6) return { r: 0, g: 255, b: 136 }
  const parsed = Number.parseInt(clean, 16)
  if (Number.isNaN(parsed)) return { r: 0, g: 255, b: 136 }
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  }
}

export default function WebcamPixelGrid({
  gridCols = 64,
  gridRows = 48,
  maxElevation = 15,
  motionSensitivity = 0.9,
  elevationSmoothing = 0.1,
  colorMode = 'webcam',
  monochromeColor = '#00ff88',
  backgroundColor = '#0a0a0a',
  mirror = true,
  gapRatio = 0.1,
  invertColors = false,
  darken = 0,
  borderColor = '#ffffff',
  borderOpacity = 0.08,
  className,
  onWebcamError,
  onWebcamReady,
}: WebcamPixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onWebcamErrorRef = useRef(onWebcamError)
  const onWebcamReadyRef = useRef(onWebcamReady)
  const gapRatioRef = useRef(gapRatio)

  useEffect(() => {
    onWebcamErrorRef.current = onWebcamError
    onWebcamReadyRef.current = onWebcamReady
  }, [onWebcamError, onWebcamReady])

  useEffect(() => {
    gapRatioRef.current = gapRatio
  }, [gapRatio])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!navigator.mediaDevices?.getUserMedia) {
      onWebcamErrorRef.current?.(new Error('Webcam access is not available in this browser.'))
      return
    }

    const sampleCanvas = document.createElement('canvas')
    sampleCanvas.width = gridCols
    sampleCanvas.height = gridRows
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true })
    if (!sampleCtx) return

    const video = document.createElement('video')
    video.autoplay = true
    video.muted = true
    video.playsInline = true

    let width = 0
    let height = 0
    let dpr = 1
    let animationId = 0
    let stream: MediaStream | null = null
    let ready = false
    let mounted = true
    const previousLuma = new Float32Array(gridCols * gridRows)
    const elevations = new Float32Array(gridCols * gridRows)
    const mono = parseHexColor(monochromeColor)
    const sensitivity = clamp01(motionSensitivity)
    const smoothing = clamp01(elevationSmoothing)
    const darkenFactor = 1 - clamp01(darken)

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      animationId = requestAnimationFrame(draw)
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)

      if (!ready || !width || !height) return

      sampleCtx.drawImage(video, 0, 0, gridCols, gridRows)
      const frame = sampleCtx.getImageData(0, 0, gridCols, gridRows).data
      const cellWidth = width / gridCols
      const cellHeight = height / gridRows
      const gap = Math.min(cellWidth, cellHeight) * clamp01(gapRatioRef.current)
      const baseCellWidth = Math.max(0, cellWidth - gap)
      const baseCellHeight = Math.max(0, cellHeight - gap)
      const maxMotion = Math.max(1, 255 * (1 - sensitivity * 0.82))

      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const drawIndex = row * gridCols + col
          const sampleCol = mirror ? gridCols - 1 - col : col
          const sampleIndex = row * gridCols + sampleCol
          const frameIndex = sampleIndex * 4
          let r = frame[frameIndex] ?? 0
          let g = frame[frameIndex + 1] ?? 0
          let b = frame[frameIndex + 2] ?? 0

          if (invertColors) {
            r = 255 - r
            g = 255 - g
            b = 255 - b
          }

          r *= darkenFactor
          g *= darkenFactor
          b *= darkenFactor

          const luma = r * 0.2126 + g * 0.7152 + b * 0.0722
          const delta = Math.abs(luma - previousLuma[drawIndex])
          previousLuma[drawIndex] = luma
          const targetElevation = clamp01(delta / maxMotion) * maxElevation
          elevations[drawIndex] += (targetElevation - elevations[drawIndex]) * smoothing

          const lift = maxElevation > 0 ? elevations[drawIndex] / maxElevation : 0
          const brightness = 0.74 + lift * 0.42
          const alpha = 0.72 + lift * 0.26
          const rectWidth = baseCellWidth * (0.92 + lift * 0.08)
          const rectHeight = baseCellHeight * (0.92 + lift * 0.08)
          const x = col * cellWidth + (cellWidth - rectWidth) * 0.5
          const y = row * cellHeight + (cellHeight - rectHeight) * 0.5

          ctx.fillStyle = colorMode === 'monochrome'
            ? `rgba(${mono.r}, ${mono.g}, ${mono.b}, ${alpha})`
            : `rgba(${Math.min(255, r * brightness)}, ${Math.min(255, g * brightness)}, ${Math.min(255, b * brightness)}, ${alpha})`
          ctx.fillRect(x, y, rectWidth, rectHeight)

          if (borderOpacity > 0) {
            ctx.strokeStyle = borderColor
            ctx.globalAlpha = borderOpacity * (0.5 + lift * 0.5)
            ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, rectWidth - 1), Math.max(0, rectHeight - 1))
            ctx.globalAlpha = 1
          }
        }
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      .then((mediaStream) => {
        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }
        stream = mediaStream
        video.srcObject = mediaStream
        return video.play()
      })
      .then(() => {
        if (!mounted) return
        ready = true
        onWebcamReadyRef.current?.()
      })
      .catch((error: unknown) => {
        const normalized = error instanceof Error ? error : new Error('Unable to start webcam.')
        onWebcamErrorRef.current?.(normalized)
      })

    animationId = requestAnimationFrame(draw)

    return () => {
      mounted = false
      cancelAnimationFrame(animationId)
      ro.disconnect()
      stream?.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
  }, [
    backgroundColor,
    borderColor,
    borderOpacity,
    colorMode,
    darken,
    elevationSmoothing,
    gridCols,
    gridRows,
    invertColors,
    maxElevation,
    mirror,
    monochromeColor,
    motionSensitivity,
  ])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

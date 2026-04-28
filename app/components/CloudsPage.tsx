'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Sparkles from './Sparkles'

const CAM = {
  startDist:  14,
  endDist:    5.5,
  startAngle: Math.PI * 1.5,
  startY:     3.2,
  endY:       0.4,
  duration:   340,
}

const LIGHT_TARGETS = { ambient: 0.45, key: 1.6, rim: 2.2 }
const LIGHT_DURATION = 260

function ProjectCard({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(visible))
    return () => cancelAnimationFrame(frame)
  }, [visible])

  if (!visible && !mounted) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: '16%',
        right: '7%',
        width: 320,
        fontFamily: 'var(--font-geist-mono)',
        background: '#0c0c0c',
        border: '1px solid #1e1e1e',
        transform: `perspective(900px) rotateY(-7deg) translateY(${mounted && visible ? 0 : 12}px)`,
        opacity: mounted && visible ? 1 : 0,
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: '12px 14px', position: 'relative' }}>
        <div style={{ color: '#2a2a2a', fontSize: '0.55rem', letterSpacing: '0.1em', marginBottom: 6 }}>
          PROJECT_DATA.SYS ──────── VER.02.01.14
        </div>
        <div style={{ color: '#d0d0d0', fontSize: '0.8rem', letterSpacing: '0.08em', fontWeight: 'bold' }}>
          → TEVACHEEMA.COM
        </div>
        <div style={{ color: '#2e2e2e', fontSize: '0.55rem', letterSpacing: '0.06em', marginTop: 3 }}>
          CLASS: FILM / INTERACTIVE / WEB
        </div>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 14, color: '#383838', fontSize: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}
        >
          [×]
        </button>
      </div>

      {/* Specs */}
      <div style={{ padding: '10px 14px' }}>
        {([
          ['STACK',  'NEXT.JS + THREE.JS + REACT'],
          ['TYPE',   'FILM PORTFOLIO / INTERACTIVE'],
          ['DESC',   'immersive web experience for filmmaker Jazz Cheema — interactive 3D storytelling'],
          ['STATUS', 'LIVE / PUBLIC'],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 10, borderBottom: '1px solid #161616', padding: '5px 0' }}>
            <span style={{ color: '#2e2e2e', fontSize: '0.6rem', width: 44, flexShrink: 0, letterSpacing: '0.04em' }}>{k}</span>
            <span style={{ color: '#585858', fontSize: '0.6rem', lineHeight: 1.6, letterSpacing: '0.02em' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Visit link */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #161616' }}>
        <a
          href="https://tevacheema.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            color: '#909090',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textAlign: 'center',
            padding: '8px 0',
            border: '1px solid #222222',
            textDecoration: 'none',
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.color = '#d0d0d0'; (e.target as HTMLElement).style.borderColor = '#404040' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = '#909090'; (e.target as HTMLElement).style.borderColor = '#222222' }}
        >
          VISIT SITE →
        </a>
      </div>

      {/* Fine print */}
      <div style={{ padding: '7px 14px', borderTop: '1px solid #141414', color: '#161616', fontSize: '0.5rem', letterSpacing: '0.05em', wordBreak: 'break-all' }}>
        © JAZZ.CHEEMA_SYSTEMS / TEVACHEEMA.COM / REG: TC-WEB-002 / STACK: NEXT.JS+THREE.JS / NOT FOR REDISTRIBUTION
      </div>
    </div>
  )
}

export default function CloudsPage() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [show, setShow]              = useState(false)
  const [showProject, setShowProject] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(
      Math.sin(CAM.startAngle) * CAM.startDist,
      CAM.startY,
      Math.cos(CAM.startAngle) * CAM.startDist,
    )
    camera.lookAt(0, 0, 0)

    const ambient = new THREE.AmbientLight('#ffffff', 0)
    scene.add(ambient)
    const key = new THREE.DirectionalLight('#ffffff', 0)
    key.position.set(2, 4, 3)
    scene.add(key)
    const rim = new THREE.PointLight('#5577ff', 0, 15)
    rim.position.set(-3, 2, -2)
    scene.add(rim)
    let lightT = 0

    let genie: THREE.Group | null = null
    const raycaster = new THREE.Raycaster()

    new GLTFLoader().load('/models/genie2.glb', (gltf) => {
      genie = gltf.scene
      const box = new THREE.Box3().setFromObject(genie)
      genie.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      genie.scale.setScalar(2.5 / Math.max(size.x, size.y, size.z))
      scene.add(genie)
    })

    // Click detection
    let downX = 0, downY = 0

    const onPointerDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY }

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6 || !genie) return
      const ndc = new THREE.Vector2(
        (e.clientX / window.innerWidth)  *  2 - 1,
        (e.clientY / window.innerHeight) * -2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      if (raycaster.intersectObject(genie, true).length > 0) setShowProject(p => !p)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    let tick = 0, camT = 0, animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick++
      const t = tick * 0.01

      if (lightT < 1) {
        lightT = Math.min(1, lightT + 1 / LIGHT_DURATION)
        const e = lightT * lightT * (3 - 2 * lightT)
        ambient.intensity = LIGHT_TARGETS.ambient * e
        key.intensity     = LIGHT_TARGETS.key     * e
        rim.intensity     = LIGHT_TARGETS.rim     * e
      }

      if (camT < 1) {
        camT = Math.min(1, camT + 1 / CAM.duration)
        const e     = camT * camT * (3 - 2 * camT)
        const angle = CAM.startAngle * (1 - e)
        const dist  = CAM.startDist  + (CAM.endDist - CAM.startDist) * e
        const y     = CAM.startY     + (CAM.endY    - CAM.startY)    * e
        camera.position.set(Math.sin(angle) * dist, y, Math.cos(angle) * dist)
        camera.lookAt(0, 0, 0)
      }

      if (genie) {
        genie.position.y = Math.sin(t * 0.7)  * 0.1
        genie.rotation.y = Math.sin(t * 0.22) * 0.12
        genie.rotation.z = Math.sin(t * 0.31) * 0.02
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div
      className="w-screen h-screen relative transition-opacity duration-700 overflow-hidden"
      style={{ background: '#0c0c0c', opacity: show ? 1 : 0 }}
    >
      <div className="absolute inset-0">
        <Sparkles className="w-full h-full" />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%', cursor: 'pointer' }}
      />

      <ProjectCard visible={showProject} onClose={() => setShowProject(false)} />
    </div>
  )
}

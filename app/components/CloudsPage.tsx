'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
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

type ProjectData = {
  id: string
  model: string
  label: string
  className: string
  href: string
  stack: string
  type: string
  description: string
  status: string
  finePrint: string
}

const PROJECTS: ProjectData[] = [
  {
    id: 'teva',
    model: '/models/genie3.glb',
    label: 'TEVACHEEMA.COM',
    className: 'FILM / INTERACTIVE / WEB',
    href: 'https://tevacheema.com',
    stack: 'NEXT.JS + THREE.JS + REACT',
    type: 'FILM PORTFOLIO / INTERACTIVE',
    description: 'Immersive web experience for filmmaker Teva Cheema, built around interactive 3D storytelling.',
    status: 'LIVE / PUBLIC',
    finePrint: '© JAZZ.CHEEMA_SYSTEMS / TEVACHEEMA.COM / REG: TC-WEB-002 / STACK: NEXT.JS+THREE.JS / INTERACTIVE_FILM_PORTFOLIO',
  },
  {
   id: 'krate',
    model: '/models/lamp1.glb',
    label: 'KRATE',
    className: 'SOCIAL / MUSIC / MOBILE',
    href: 'https://apps.apple.com/us/app/krate-rate-music/id1540002251',
    stack: 'REACT NATIVE + EXPO ROUTER + FIREBASE',
    type: 'IOS / ANDROID SOCIAL MUSIC APP',
    description: 'Rebuilt a 15k+ user social music app from deprecated React Native and Expo versions to Expo Router, Firebase methodologies, and React Native New Architecture. Improved feature velocity, load times, accessibility, and reduced technical debt.',
    status: 'APP STORE / PUBLIC',
    finePrint: '© JAZZ.CHEEMA_SYSTEMS / KRATE_MOBILE / REG: KR-IOS-ANDROID-001 / EXPO_ROUTER / FIREBASE / NEW_ARCHITECTURE',
  },
    {
    id: 'episode',
    model: '/models/mobile_tv.glb',
    label: 'EPISODE-ETA.VERCEL.APP',
    className: 'PROPERTY / DEVELOPMENT / INTERACTIVE',
    href: 'https://episode-eta.vercel.app/',
    stack: 'NEXT.JS + THREE.JS + REACT',
    type: 'PROPERTY DEVELOPMENT WEBSITE',
    description: 'Interactive property development website for Episode Companies, featuring a 3D television interface and knob-turning navigation.',
    status: 'LIVE / PUBLIC',
    finePrint: '© JAZZ.CHEEMA_SYSTEMS / EPISODE_COMPANIES / REG: EP-WEB-001 / THREEJS_INTERFACE / KNOB_CONTROL_NAVIGATION',
  },
]

function ProjectCard({
  visible,
  project,
  carouselOpen,
  onClose,
  onPrev,
  onNext,
}: {
  visible: boolean
  project: ProjectData
  carouselOpen: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
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
        top: carouselOpen ? 'max(86px, 12dvh)' : 'max(72px, 10dvh)',
        right: 'max(16px, 7vw)',
        width: 'min(360px, calc(100vw - 32px))',
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
          → {project.label}
        </div>
        <div style={{ color: '#2e2e2e', fontSize: '0.55rem', letterSpacing: '0.06em', marginTop: 3 }}>
          CLASS: {project.className}
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
          ['STACK',  project.stack],
          ['TYPE',   project.type],
          ['DESC',   project.description],
          ['STATUS', project.status],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 10, borderBottom: '1px solid #161616', padding: '5px 0' }}>
            <span style={{ color: '#2e2e2e', fontSize: '0.6rem', width: 44, flexShrink: 0, letterSpacing: '0.04em' }}>{k}</span>
            <span style={{ color: '#585858', fontSize: '0.6rem', lineHeight: 1.6, letterSpacing: '0.02em' }}>{v}</span>
          </div>
        ))}
      </div>

      {carouselOpen && (
        <div style={{ display: 'flex', borderTop: '1px solid #161616', borderBottom: '1px solid #161616' }}>
          <button
            onClick={onPrev}
            style={{ flex: 1, padding: '8px 0', border: 0, borderRight: '1px solid #161616', background: 'transparent', color: '#585858', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            [←]
          </button>
          <button
            onClick={onNext}
            style={{ flex: 1, padding: '8px 0', border: 0, background: 'transparent', color: '#585858', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            [→]
          </button>
        </div>
      )}

      {/* Visit link */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #161616' }}>
        <a
          href={project.href}
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
        {project.finePrint}
      </div>
    </div>
  )
}

export default function CloudsPage() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [show, setShow]              = useState(false)
  const [showProject, setShowProject] = useState(false)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [activeProject, setActiveProject] = useState(0)
  const carouselOpenRef = useRef(false)
  const activeProjectRef = useRef(0)

  const selectProject = useCallback((nextIndex: number) => {
    const normalized = (nextIndex + PROJECTS.length) % PROJECTS.length
    activeProjectRef.current = normalized
    setActiveProject(normalized)
    setShowProject(true)
  }, [])

  const openCarousel = useCallback(() => {
    carouselOpenRef.current = true
    setCarouselOpen(true)
    selectProject(0)
  }, [selectProject])

  const selectPrev = useCallback(() => selectProject(activeProjectRef.current - 1), [selectProject])
  const selectNext = useCallback(() => selectProject(activeProjectRef.current + 1), [selectProject])

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
    const rim = new THREE.PointLight('#3a3a3a', 0, 15)
    rim.position.set(-3, 2, -2)
    scene.add(rim)
    let lightT = 0

    type ProjectObject = {
      group: THREE.Group
      maxDim: number
      index: number
      baseRotationY: number
    }

    const projectObjects: ProjectObject[] = []
    const raycaster = new THREE.Raycaster()

    const responsiveModelSize = () => {
      const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * CAM.endDist
      const width = height * camera.aspect
      return Math.min(2.5, Math.max(1.45, width * 0.72))
    }

    const applyMaterialOpacity = (object: THREE.Object3D, opacity: number) => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => {
          material.transparent = opacity < 0.98
          material.opacity = opacity
          material.depthWrite = opacity > 0.7
        })
      })
    }

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/gltf/')

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    PROJECTS.forEach((project, index) => {
      loader.load(project.model, (gltf) => {
        const group = gltf.scene
        const box = new THREE.Box3().setFromObject(group)
        group.position.sub(box.getCenter(new THREE.Vector3()))
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const baseRotationY = index === 1 ? Math.PI / 4 : 0
        group.rotation.y = baseRotationY
        group.visible = index === 0
        group.scale.setScalar(responsiveModelSize() / maxDim)
        group.userData.projectIndex = index
        scene.add(group)
        projectObjects[index] = { group, maxDim, index, baseRotationY }
      })
    })

    // Click detection
    let downX = 0, downY = 0, dragDX = 0

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
      dragDX = 0
      canvas.setPointerCapture(e.pointerId)
    }

    const onPointerUp = (e: PointerEvent) => {
      dragDX = e.clientX - downX
      const moved = Math.hypot(dragDX, e.clientY - downY)

      if (carouselOpenRef.current && Math.abs(dragDX) > 44) {
        selectProject(activeProjectRef.current + (dragDX < 0 ? 1 : -1))
        return
      }

      if (moved > 8) return

      const loadedObjects = projectObjects.filter(Boolean)
      if (loadedObjects.length === 0) return

      const ndc = new THREE.Vector2(
        (e.clientX / window.innerWidth)  *  2 - 1,
        (e.clientY / window.innerHeight) * -2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObjects(loadedObjects.map(({ group }) => group), true)[0]
      if (!hit) return

      const clickedProject = hit.object.parent
        ? loadedObjects.find(({ group }) => {
            let current: THREE.Object3D | null = hit.object
            while (current) {
              if (current === group) return true
              current = current.parent
            }
            return false
          })
        : undefined

      if (!clickedProject) return

      if (!carouselOpenRef.current) {
        openCarousel()
        return
      }

      selectProject(clickedProject.index)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      projectObjects.forEach(({ group, maxDim }) => {
        group.scale.setScalar(responsiveModelSize() / maxDim)
      })
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

      projectObjects.forEach((projectObject) => {
        const { group, maxDim, index, baseRotationY } = projectObject
        const carouselOffset = index - activeProjectRef.current
        const wrappedOffset = ((carouselOffset + PROJECTS.length + 1) % PROJECTS.length) - 1
        const focus = carouselOpenRef.current ? 1 - Math.min(Math.abs(wrappedOffset), 1) : index === 0 ? 1 : 0
        const visible = carouselOpenRef.current || index === 0
        const targetX = carouselOpenRef.current ? wrappedOffset * 2.25 : 0
        const targetZ = carouselOpenRef.current ? 0.55 - Math.abs(wrappedOffset) * 1.45 : 0
        const targetY = Math.sin(t * 0.7 + index * 0.8) * 0.1
        const targetScale = (responsiveModelSize() / maxDim) * (0.76 + focus * 0.28)

        group.visible = visible
        if (!visible) return

        group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, 0.09)
        group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, 0.09)
        group.position.z = THREE.MathUtils.lerp(group.position.z, targetZ, 0.09)
        group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.09)
        group.rotation.y = THREE.MathUtils.lerp(
          group.rotation.y,
          baseRotationY + Math.sin(t * 0.22 + index) * 0.12 + wrappedOffset * -0.18,
          0.08,
        )
        group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, Math.sin(t * 0.31 + index) * 0.02, 0.08)
        applyMaterialOpacity(group, 0.34 + focus * 0.66)
      })

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', onResize)
      dracoLoader.dispose()
      renderer.dispose()
    }
  }, [openCarousel, selectProject])

  return (
    <div
      className="w-dvw h-dvh relative transition-opacity duration-700 overflow-hidden"
      style={{ width: '100dvw', height: '100dvh', background: '#0c0c0c', opacity: show ? 1 : 0 }}
    >
      <div className="absolute inset-0">
        <Sparkles className="w-full h-full" />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%', cursor: carouselOpen ? 'grab' : 'pointer' }}
      />

      <div
        className="absolute left-1/2 -translate-x-1/2 text-center text-[0.6rem] sm:text-xs tracking-widest pointer-events-none"
        style={{
          bottom: carouselOpen ? 'max(18px, 4dvh)' : 'max(22px, 7dvh)',
          width: 'min(38rem, calc(100vw - 32px))',
          color: '#303030',
          fontFamily: 'var(--font-geist-mono)',
          zIndex: 9,
        }}
      >
        {carouselOpen
          ? '→ DRAG LEFT / RIGHT TO ROTATE PORTFOLIO AXIS → CLICK MODEL TO FOCUS'
          : '→ CLICK GENIE TO OPEN PORTFOLIO AXIS'}
      </div>

      <ProjectCard
        visible={showProject}
        project={PROJECTS[activeProject]}
        carouselOpen={carouselOpen}
        onClose={() => setShowProject(false)}
        onPrev={selectPrev}
        onNext={selectNext}
      />
    </div>
  )
}

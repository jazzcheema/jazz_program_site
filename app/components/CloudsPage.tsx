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
  if (!visible) return null

  const scanBars = project.id === 'episode'
    ? [88, 72, 41, 66, 24]
    : project.id === 'krate'
      ? [96, 82, 75, 70, 44]
      : [78, 63, 57, 38, 21]
  const activeSignal = project.id === 'episode'
    ? '#c87820'
    : project.id === 'krate'
      ? '#249958'
      : '#808080'
  const projectIndex = PROJECTS.findIndex(({ id }) => id === project.id) + 1

  const stop = (event: React.SyntheticEvent) => event.stopPropagation()

  return (
    <div
      style={{
        position: 'fixed',
        top: carouselOpen ? 'max(76px, 10dvh)' : 'max(82px, 12dvh)',
        right: 'clamp(14px, 5vw, 76px)',
        zIndex: 30,
        width: 'min(430px, calc(100vw - 28px))',
        pointerEvents: 'none',
        fontFamily: 'var(--font-geist-mono), monospace',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 10,
          transform: 'translate3d(14px, 12px, 0)',
          border: '1px solid rgba(128, 128, 128, 0.08)',
          background: 'rgba(12, 12, 12, 0.22)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 5,
          transform: 'translate3d(7px, 6px, 0)',
          border: '1px solid rgba(200, 200, 200, 0.08)',
          background: 'rgba(12, 12, 12, 0.18)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          overflow: 'hidden',
          border: '1px solid rgba(200, 200, 200, 0.18)',
          background: 'rgba(12, 12, 12, 0.72)',
          backdropFilter: 'blur(18px) saturate(118%)',
          WebkitBackdropFilter: 'blur(18px) saturate(118%)',
          color: '#808080',
        }}
      >
        <header
          style={{
            position: 'relative',
            padding: '13px 14px 11px',
            borderBottom: '1px solid rgba(200, 200, 200, 0.12)',
          }}
        >
          <div style={{ paddingRight: 78 }}>
            <div style={{ marginBottom: 6, color: '#303030', fontSize: '0.55rem', fontWeight: 700, letterSpacing: 0 }}>
              PROJECT_DATA.SYS -------- AXIS:{String(projectIndex).padStart(2, '0')} / VER.02.01.14
            </div>
            <h2 style={{ margin: 0, color: '#c8c8c8', fontSize: '0.86rem', fontWeight: 800, letterSpacing: '0.08em', lineHeight: 1.2 }}>
              → {project.label}
            </h2>
            <div style={{ marginTop: 4, color: '#303030', fontSize: '0.56rem', letterSpacing: '0.06em' }}>
              CLASS: {project.className}
            </div>
          </div>
          <button
            type="button"
            className="clouds-project-close"
            onClick={(event) => {
              event.stopPropagation()
              onClose()
            }}
            onPointerDown={stop}
            onPointerUp={stop}
            style={{
              position: 'absolute',
              top: 11,
              right: 12,
              cursor: 'pointer',
              border: 0,
              background: 'transparent',
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '0.58rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            [×] close
          </button>
        </header>

        <section style={{ padding: '10px 14px', borderBottom: '1px solid rgba(200, 200, 200, 0.08)' }}>
          <div style={{ color: '#303030', fontSize: '0.58rem', letterSpacing: '0.06em', marginBottom: 6 }}>
            MISSION_BRIEF --------------------------------
          </div>
          <p style={{ margin: 0, color: '#808080', fontSize: '0.66rem', lineHeight: 1.65 }}>
            {project.description}
          </p>
        </section>

        <section style={{ padding: '8px 14px 10px', borderBottom: '1px solid rgba(200, 200, 200, 0.08)' }}>
          {([
            ['STACK', project.stack],
            ['TYPE', project.type],
            ['STATUS', project.status],
          ] as [string, string][]).map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'grid',
                gridTemplateColumns: '54px minmax(0, 1fr)',
                gap: 10,
                padding: '5px 0',
                borderBottom: '1px solid rgba(200, 200, 200, 0.05)',
              }}
            >
              <span style={{ color: '#303030', fontSize: '0.58rem', letterSpacing: '0.04em' }}>{k}</span>
              <span style={{ color: '#808080', fontSize: '0.6rem', lineHeight: 1.45 }}>{v}</span>
            </div>
          ))}
        </section>

        <section style={{ padding: '9px 14px 10px', borderBottom: '1px solid rgba(200, 200, 200, 0.08)' }}>
          <div style={{ color: '#303030', fontSize: '0.58rem', letterSpacing: '0.06em', marginBottom: 8 }}>
            SIGNAL_SCAN / MHz ----------------------------
          </div>
          <div style={{ display: 'grid', gap: 5 }}>
            {scanBars.map((pct, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '30px minmax(0, 1fr) 26px',
                  gap: 7,
                  alignItems: 'center',
                  color: '#303030',
                  fontSize: '0.56rem',
                }}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ height: 7, background: '#101010', overflow: 'hidden' }}>
                  <i style={{ display: 'block', width: `${pct}%`, height: '100%', background: i === 0 ? activeSignal : '#404040' }} />
                </span>
                <span style={{ textAlign: 'right' }}>{pct}</span>
              </div>
            ))}
          </div>
        </section>

        {carouselOpen && (
          <nav
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              borderBottom: '1px solid rgba(200, 200, 200, 0.08)',
            }}
          >
            <button
              type="button"
              className="clouds-axis-button clouds-axis-button-prev"
              onClick={(event) => {
                event.stopPropagation()
                onPrev()
              }}
              onPointerDown={stop}
              onPointerUp={stop}
              style={{
                minHeight: 36,
                cursor: 'pointer',
                border: 0,
                borderRight: '1px solid rgba(200, 200, 200, 0.08)',
                background: 'transparent',
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: '0.62rem',
                letterSpacing: '0.08em',
                pointerEvents: 'auto',
              }}
            >
              ← PREV_AXIS
            </button>
            <button
              type="button"
              className="clouds-axis-button clouds-axis-button-next"
              onClick={(event) => {
                event.stopPropagation()
                onNext()
              }}
              onPointerDown={stop}
              onPointerUp={stop}
              style={{
                minHeight: 36,
                cursor: 'pointer',
                border: 0,
                background: 'transparent',
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: '0.62rem',
                letterSpacing: '0.08em',
                pointerEvents: 'auto',
              }}
            >
              NEXT_AXIS →
            </button>
          </nav>
        )}

        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(200, 200, 200, 0.06)' }}>
          <a
            href={project.href}
            target="_blank"
            rel="noopener noreferrer"
            className="clouds-project-link"
            onPointerDown={stop}
            onPointerUp={stop}
            onClick={stop}
            style={{
              display: 'flex',
              minHeight: 38,
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0 10px',
              border: '1px solid rgba(128, 128, 128, 0.28)',
              color: '#909090',
              fontSize: '0.64rem',
              letterSpacing: '0.1em',
              textDecoration: 'none',
              pointerEvents: 'auto',
            }}
          >
            <span>VISIT SITE</span>
            <span>→</span>
          </a>
        </div>

        <div
          style={{
            padding: '7px 14px 9px',
            color: '#202020',
            fontSize: '0.48rem',
            lineHeight: 1.45,
            letterSpacing: '0.04em',
            wordBreak: 'break-all',
          }}
        >
          {project.finePrint}
        </div>
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

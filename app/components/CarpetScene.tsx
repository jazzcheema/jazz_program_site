'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { REFERENCE_ASPECT } from '../lib/responsiveScene'

interface CarpetSceneProps {
  onReachClouds: () => void
  onReachSandcastle: () => void
  onReachBooks: () => void
  showBfg?: boolean
}

// Desktop target; the live position is clamped to the camera's visible area.
const CAMERA_Z = 6
const REACH_DIST = 1.3
const SANDCASTLE_REACH_DIST = 1.15
const SANDCASTLE_PULL_DIST = 2.15
const BOOKS_REACH_DIST = 0.8
const MOBILE_CARPET_MIN_SCALE = 0.28
const CLOUD_FRAC  = { x: 0.38, y: 0.39 }
const SAND_FRAC   = { x: 0.44, y: 0.42 }
const BOOKS_FRAC  = { x: 0.40, y: 0.40 }
const MOBILE_CLOUD_FRAC = { x: 0.31, y: 0.44 }
const MOBILE_SAND_FRAC = { x: 0.36, y: 0.44 }
const MOBILE_BOOKS_FRAC = { x: 0.32, y: 0.43 }

export default function CarpetScene({ onReachClouds, onReachSandcastle, onReachBooks, showBfg }: CarpetSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const onReachRef = useRef(onReachClouds)
  const onReachSandcastleRef = useRef(onReachSandcastle)
  const onReachBooksRef = useRef(onReachBooks)
  const showBfgRef = useRef(showBfg)
  const darknessProgressRef = useRef(0)
  const bfgGrabbedRef = useRef(false)
  const bfgManualRotYRef = useRef(0)
  const bfgDragStartXRef = useRef(0)
  const bfgDragStartYRef = useRef(0)
  const bfgTiltTargetRef = useRef(0)
  const enterHeldRef = useRef(false)
  const chargeFramesRef = useRef(0)
  const shotsFiredRef = useRef(false)
  const chargePctRef = useRef(0)

  useEffect(() => {
    onReachRef.current = onReachClouds
    onReachSandcastleRef.current = onReachSandcastle
    onReachBooksRef.current = onReachBooks
  }, [onReachClouds, onReachSandcastle, onReachBooks])

  useEffect(() => { showBfgRef.current = showBfg }, [showBfg])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isPortrait = () => window.innerWidth / window.innerHeight < 1.0
    const isMobile = ('ontouchstart' in window)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true })

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isPortrait() ? 1.25 : 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = isPortrait() ? 1.35 : 1.0

    renderer.setClearColor(0xe9e5e0, 0)

    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.fog = new THREE.Fog('#e9e5e0', 16, 34)

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, CAMERA_Z)
    camera.updateProjectionMatrix()
    cameraRef.current = camera

    const designVisibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * CAMERA_Z
    const designVisibleWidth = designVisibleHeight * REFERENCE_ASPECT

    const stageScale = () => {
      const visible = visibleWorldSize()
      return Math.min(1, visible.width / designVisibleWidth, visible.height / designVisibleHeight)
    }

    const visibleWorldSize = () => {
      const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * camera.position.z
      return { width: height * camera.aspect, height }
    }

    const responsiveCloudPos = () => {
      const { width, height } = visibleWorldSize()
      const frac = isPortrait() ? MOBILE_CLOUD_FRAC : CLOUD_FRAC
      return new THREE.Vector3(width * frac.x, height * frac.y, 0)
    }

    const responsiveSandcastlePos = () => {
      const { width, height } = visibleWorldSize()
      const frac = isPortrait() ? MOBILE_SAND_FRAC : SAND_FRAC
      return new THREE.Vector3(-width * frac.x, -height * frac.y, 0)
    }

    const responsiveModelSize = (desktopSize: number, mobileWidthFactor: number) => {
      if (isPortrait()) return visibleWorldSize().width * mobileWidthFactor
      return desktopSize * stageScale()
    }

    const responsiveBooksPos = () => {
      const { width, height } = visibleWorldSize()
      const frac = isPortrait() ? MOBILE_BOOKS_FRAC : BOOKS_FRAC
      return new THREE.Vector3(width * frac.x, -height * frac.y, 0)
    }

    let cloudPos = responsiveCloudPos()
    let sandcastlePos = responsiveSandcastlePos()
    let booksPos = responsiveBooksPos()

    // All lights start at 0 and ramp up cinematically
    const ambient = new THREE.AmbientLight('#ffffff', 0)
    scene.add(ambient)
    const key = new THREE.DirectionalLight('#ffffff', 0)
    key.position.set(2, 4, 3)
    scene.add(key)
    const rim = new THREE.PointLight('#2a5fc0', 0, 15)
    rim.position.set(-3, 2, -2)
    scene.add(rim)
    const cloudLight = new THREE.PointLight('#8899ff', 0, 8)
    cloudLight.position.copy(cloudPos).add(new THREE.Vector3(0, 1, 2))
    scene.add(cloudLight)
    const sandcastleLight = new THREE.PointLight('#c87820', 0, 7)
    sandcastleLight.position.copy(sandcastlePos).add(new THREE.Vector3(0, 0.8, 2))
    scene.add(sandcastleLight)

    const booksLight = new THREE.PointLight('#6688cc', 0, 7)
    booksLight.position.copy(booksPos).add(new THREE.Vector3(0, 0.8, 2))
    scene.add(booksLight)

    // Eerie lights — dormant until BFG unlock
    const eerieGreen = new THREE.PointLight('#1aff66', 0, 12)
    eerieGreen.position.set(0, 0.6, 2)
    scene.add(eerieGreen)
    const eerieDeep = new THREE.PointLight('#0a1a5c', 0, 18)
    eerieDeep.position.set(0.8, -0.8, -1)
    scene.add(eerieDeep)

    const LIGHT_TARGETS = { ambient: 0.52, key: 1.9, rim: 2.8, cloud: 2.0, sandcastle: 1.15, books: 1.2 }
    const LIGHT_DURATION = 210 // ~3.5s at 60fps
    let lightT = 0

    // Convert screen coords → world coords at z=0
    const toWorld = (sx: number, sy: number) => {
      const v = new THREE.Vector3(
        (sx / window.innerWidth) * 2 - 1,
        -(sy / window.innerHeight) * 2 + 1,
        0.5,
      ).unproject(camera)
      const dir = v.sub(camera.position).normalize()
      const t = -camera.position.z / dir.z
      return camera.position.clone().add(dir.multiplyScalar(t))
    }

    let carpet: THREE.Group | null = null
    let clouds: THREE.Group | null = null
    let sandcastle: THREE.Group | null = null
    let books: THREE.Group | null = null
    let carpetBaseScale = 1
    let carpetMaxDim = 1
    let cloudsMaxDim = 1
    let sandcastleMaxDim = 1
    let booksMaxDim = 1
    let reached = false
    let sandcastleActivated = false
    let booksActivated = false

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/gltf/')

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    loader.load('/models/carpet.glb', (gltf) => {
      carpet = gltf.scene
      const box = new THREE.Box3().setFromObject(carpet)
      carpet.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      carpetMaxDim = Math.max(size.x, size.y, size.z)
      carpetBaseScale = responsiveModelSize(2.2, 0.56) / carpetMaxDim
      carpet.scale.setScalar(carpetBaseScale)
      carpet.rotation.y = Math.PI / 3
      scene.add(carpet)
    })

    loader.load('/models/clouds.glb', (gltf) => {
      clouds = gltf.scene
      const box = new THREE.Box3().setFromObject(clouds)
      clouds.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      cloudsMaxDim = Math.max(size.x, size.y, size.z)
      clouds.scale.setScalar(responsiveModelSize(1.6, 0.26) / cloudsMaxDim)
      clouds.position.copy(cloudPos)
      scene.add(clouds)
    })

    loader.load('/models/sandcastle.glb', (gltf) => {
      sandcastle = gltf.scene
      const box = new THREE.Box3().setFromObject(sandcastle)
      sandcastle.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      sandcastleMaxDim = Math.max(size.x, size.y, size.z)
      sandcastle.scale.setScalar(responsiveModelSize(1.35, 0.22) / sandcastleMaxDim)
      sandcastle.position.copy(sandcastlePos)
      sandcastle.rotation.y = -Math.PI / 7
      scene.add(sandcastle)
    })

    loader.load('/models/books.glb', (gltf) => {
      books = gltf.scene
      const box = new THREE.Box3().setFromObject(books)
      books.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      booksMaxDim = Math.max(size.x, size.y, size.z)
      books.scale.setScalar(responsiveModelSize(0.72, 0.16) / booksMaxDim)
      books.position.copy(booksPos)
      books.rotation.y = Math.PI / 5
      scene.add(books)
    })

    // Drag state
    let isDragging = false
    let downX = 0, downY = 0
    let holdFrames = 0

    // Carpet world position (smoothed)
    let currX = 0, currY = 0
    let targetX = 0, targetY = 0

    const onPointerDown = (e: PointerEvent) => {
      if (showBfgRef.current && darknessProgressRef.current > 0.88) {
        bfgGrabbedRef.current = true
        bfgDragStartXRef.current = e.clientX
        bfgDragStartYRef.current = e.clientY
        canvas.setPointerCapture(e.pointerId)
        return
      }
      isDragging = true
      downX = e.clientX
      downY = e.clientY
      holdFrames = 0
      canvas.setPointerCapture(e.pointerId)
      const w = toWorld(e.clientX, e.clientY)
      targetX = w.x
      targetY = w.y
    }

    const onPointerMove = (e: PointerEvent) => {
      if (bfgGrabbedRef.current) {
        const dx = e.clientX - bfgDragStartXRef.current
        bfgManualRotYRef.current += dx * 0.012
        bfgDragStartXRef.current = e.clientX
        // Vertical drag tilts the gun to show the top (clamped to ±0.5 rad)
        const dy = e.clientY - bfgDragStartYRef.current
        bfgTiltTargetRef.current = Math.max(-0.5, Math.min(0.5, dy * 0.008))
        return
      }
      if (!isDragging) return
      const w = toWorld(e.clientX, e.clientY)
      targetX = w.x
      targetY = w.y
    }

    const onPointerUp = (e: PointerEvent) => {
      if (bfgGrabbedRef.current) {
        bfgGrabbedRef.current = false
        bfgTiltTargetRef.current = 0
        return
      }
      isDragging = false
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY)
      if (moved < 6) return
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isPortrait() ? 1.25 : 2))
      renderer.toneMappingExposure = isPortrait() ? 1.35 : 1.0
      renderer.setSize(window.innerWidth, window.innerHeight)
      cloudPos = responsiveCloudPos()
      sandcastlePos = responsiveSandcastlePos()
      booksPos = responsiveBooksPos()
      cloudLight.position.copy(cloudPos).add(new THREE.Vector3(0, 1, 2))
      sandcastleLight.position.copy(sandcastlePos).add(new THREE.Vector3(0, 0.8, 2))
      booksLight.position.copy(booksPos).add(new THREE.Vector3(0, 0.8, 2))
      if (carpet) {
        carpetBaseScale = responsiveModelSize(2.2, 0.56) / carpetMaxDim
        carpet.scale.setScalar(carpetBaseScale)
      }
      if (clouds) clouds.scale.setScalar(responsiveModelSize(1.6, 0.26) / cloudsMaxDim)
      if (sandcastle) sandcastle.scale.setScalar(responsiveModelSize(1.35, 0.22) / sandcastleMaxDim)
      if (books) books.scale.setScalar(responsiveModelSize(0.72, 0.16) / booksMaxDim)
    }
    window.addEventListener('resize', onResize)

    let tick = 0
    let animId: number
    let bfgDarkSettledAtTick = -1

    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick++
      const t = tick * 0.01

      // Cinematic light fade-in — smoothstep easing
      if (lightT < 1 && !showBfgRef.current) {
        lightT = Math.min(1, lightT + 1 / LIGHT_DURATION)
        const e = lightT * lightT * (3 - 2 * lightT)
        ambient.intensity   = LIGHT_TARGETS.ambient * e
        key.intensity       = LIGHT_TARGETS.key     * e
        rim.intensity       = LIGHT_TARGETS.rim     * e
        cloudLight.intensity = LIGHT_TARGETS.cloud  * e
        sandcastleLight.intensity = LIGHT_TARGETS.sandcastle * e
        booksLight.intensity = LIGHT_TARGETS.books * e
      }

      // BFG unlock — darken scene, fade objects, bring in eerie lights
      if (showBfgRef.current) {
        darknessProgressRef.current = Math.min(1, darknessProgressRef.current + 0.007)

        // Start 3-second countdown once fully dark
        if (darknessProgressRef.current >= 1 && bfgDarkSettledAtTick === -1) {
          bfgDarkSettledAtTick = tick
        }
        const baselineActive = bfgDarkSettledAtTick !== -1 && (tick - bfgDarkSettledAtTick) > 180
        const grabbed = bfgGrabbedRef.current

        // Regular scene lights stay dark throughout
        ambient.intensity         += (0.003 - ambient.intensity) * 0.022
        key.intensity             += (0 - key.intensity) * 0.02
        rim.intensity             += (0 - rim.intensity) * 0.02
        cloudLight.intensity      += (0.22 - cloudLight.intensity) * 0.018
        sandcastleLight.intensity += (0 - sandcastleLight.intensity) * 0.02
        booksLight.intensity      += (0 - booksLight.intensity) * 0.02

        // Eerie lights are the baseline — settle in after 3s, boost when grabbed or charging
        const chargePct = chargePctRef.current
        if (chargePct > 0) {
          const sinePulse = Math.sin(tick * 0.038)
          const gTarget = THREE.MathUtils.lerp(3.6 + sinePulse * 0.7, 8.0 + sinePulse * 1.5, chargePct)
          eerieGreen.intensity += (gTarget - eerieGreen.intensity) * 0.06
          eerieDeep.intensity  += (THREE.MathUtils.lerp(2.2, 5.0, chargePct) - eerieDeep.intensity) * 0.05
        } else if (grabbed) {
          const gTarget = 3.6 + Math.sin(tick * 0.038) * 0.7
          eerieGreen.intensity += (gTarget - eerieGreen.intensity) * 0.04
          eerieDeep.intensity  += (2.2 - eerieDeep.intensity) * 0.03
        } else if (baselineActive) {
          const gTarget = 1.4 + Math.sin(tick * 0.038) * 0.3
          eerieGreen.intensity += (gTarget - eerieGreen.intensity) * 0.018
          eerieDeep.intensity  += (0.8 - eerieDeep.intensity) * 0.014
        } else {
          eerieGreen.intensity += (0 - eerieGreen.intensity) * 0.025
          eerieDeep.intensity  += (0 - eerieDeep.intensity) * 0.02
        }

        for (const obj of [carpet, sandcastle, books]) {
          if (!obj) continue
          obj.traverse((child) => {
            const mesh = child as THREE.Mesh
            if (!mesh.isMesh) return
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const m of mats) {
              const mat = m as THREE.Material
              if (!mat || mat.opacity <= 0) continue
              if (!mat.transparent) {
                mat.transparent = true
                mat.needsUpdate = true
              }
              mat.opacity = Math.max(0, mat.opacity - 0.008)
            }
          })
        }
      }

      if (carpet && !reached) {
        if (isDragging) {
          holdFrames++
          // Smooth follow
          currX += (targetX - currX) * 0.16
          currY += (targetY - currY) * 0.16

          // Erratic shake that grows the longer you hold
          const amp = Math.min(0.025 + holdFrames * 0.0006, 0.11)
          carpet.position.x = currX + (Math.random() - 0.5) * amp * 2
          carpet.position.y = currY + (Math.random() - 0.5) * amp

          // Bank roll toward movement direction
          carpet.rotation.z = THREE.MathUtils.lerp(
            carpet.rotation.z,
            -(targetX - currX) * 0.25,
            0.1,
          )
          carpet.rotation.x = THREE.MathUtils.lerp(
            carpet.rotation.x,
            (targetY - currY) * 0.15,
            0.1,
          )
        } else {
          holdFrames = 0
          // Slowly drift back to center
          targetX *= 0.93
          targetY *= 0.93
          currX += (targetX - currX) * 0.07
          currY += (targetY - currY) * 0.07

          // Idle float animation
          carpet.position.x = currX
          carpet.position.y = currY + Math.sin(t) * 0.07
          carpet.rotation.x = Math.sin(t * 0.75 + 0.5) * 0.035
          carpet.rotation.z = Math.sin(t * 0.55 + 1.2) * 0.025
        }

        const cPos = new THREE.Vector3(carpet.position.x, carpet.position.y, 0)

        // Shrink as it moves from center, then tuck smaller into the sandcastle target.
        const currentStageScale = stageScale()
        const { width: visW, height: visH } = visibleWorldSize()
        const reachScale = isPortrait() ? visW * 0.20 : currentStageScale
        const dist = cPos.length()
        const mobileEdgeProgress = THREE.MathUtils.clamp(
          dist / Math.hypot(visW * 0.5, visH * 0.5),
          0,
          1,
        )
        const worldShrink = isPortrait()
          ? THREE.MathUtils.lerp(1, MOBILE_CARPET_MIN_SCALE, mobileEdgeProgress ** 1.18)
          : Math.max(0.42, 1 - (dist / Math.max(currentStageScale, 0.001)) * 0.09)
        const sandcastleDist = cPos.distanceTo(sandcastlePos)
        const sandcastlePull = isPortrait()
          ? 0
          : 1 - THREE.MathUtils.clamp(sandcastleDist / (SANDCASTLE_PULL_DIST * currentStageScale), 0, 1)
        const sandcastleShrink = THREE.MathUtils.lerp(worldShrink, 0.2, sandcastlePull * sandcastlePull)
        carpet.scale.setScalar(carpetBaseScale * sandcastleShrink)

        // Proximity check
        if (cPos.distanceTo(cloudPos) < REACH_DIST * reachScale) {
          reached = true
          onReachRef.current()
        } else if (sandcastleDist < SANDCASTLE_REACH_DIST * reachScale && !sandcastleActivated) {
          sandcastleActivated = true
          onReachSandcastleRef.current()
        } else if (sandcastleDist > SANDCASTLE_REACH_DIST * reachScale * 1.7) {
          sandcastleActivated = false
        }

        const booksDist = cPos.distanceTo(booksPos)
        if (booksDist < BOOKS_REACH_DIST * reachScale && !booksActivated) {
          booksActivated = true
          onReachBooksRef.current()
        } else if (booksDist > BOOKS_REACH_DIST * reachScale * 1.7) {
          booksActivated = false
        }
      }

      // Clouds: gentle independent bob
      if (clouds) {
        clouds.position.y = cloudPos.y + Math.sin(t * 0.8) * 0.055
        clouds.position.x = cloudPos.x + Math.sin(t * 0.4) * 0.02
        clouds.rotation.y = Math.sin(t * 0.3) * 0.04
      }

      if (sandcastle) {
        sandcastle.position.y = sandcastlePos.y + Math.sin(t * 0.55) * 0.035
        sandcastle.position.x = sandcastlePos.x + Math.sin(t * 0.28) * 0.015
        sandcastle.rotation.y = -Math.PI / 7 + Math.sin(t * 0.24) * 0.035
      }

      if (books) {
        books.position.y = booksPos.y + Math.sin(t * 0.62 + 1.1) * 0.03
        books.position.x = booksPos.x + Math.sin(t * 0.33 + 0.7) * 0.012
        books.rotation.y = Math.PI / 5 + Math.sin(t * 0.27 + 0.4) * 0.03
      }

      renderer.render(scene, camera)
    }

    animate()

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId)
      } else {
        animId = requestAnimationFrame(animate)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && showBfgRef.current && !shotsFiredRef.current) enterHeldRef.current = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        enterHeldRef.current = false
        if (!shotsFiredRef.current) { chargeFramesRef.current = 0; chargePctRef.current = 0 }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      cancelAnimationFrame(animId)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      dracoLoader.dispose()
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    if (!showBfg) return
    const scene = sceneRef.current
    if (!scene) return

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/gltf/')
    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    type ShotBlob = { geo: THREE.BufferGeometry; basePos: Float32Array; drifts: Float32Array; points: THREE.Points; vel: THREE.Vector3; age: number }
    const activeShots: ShotBlob[] = []

    let bfg: THREE.Group | null = null
    let animId: number
    let t = 0
    let rotY = 0

    loader.load('/models/bfg.glb', (gltf) => {
      bfg = gltf.scene
      const box = new THREE.Box3().setFromObject(bfg)
      bfg.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      bfg.scale.setScalar(2.4 / maxDim)
      bfg.position.set(0, 0.1, 0)

      // Start fully invisible — revealed by darkness progress
      bfg.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          const mat = m as THREE.Material
          mat.transparent = true
          mat.opacity = 0
        }
      })

      // Collect emissive materials (for pulsing) and their meshes (for world-position tracking)
      const emissiveMats: THREE.MeshStandardMaterial[] = []
      const emissiveMeshes: THREE.Mesh[] = []
      const wp = new THREE.Vector3()
      console.group('[BFG] mesh nodes')
      bfg.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.getWorldPosition(wp)
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        const hasEmissive = mats.some(m => (m as THREE.MeshStandardMaterial).emissiveMap)
        console.log(
          `name="${mesh.name || '(unnamed)'}"`
          + ` pos=(${wp.x.toFixed(3)}, ${wp.y.toFixed(3)}, ${wp.z.toFixed(3)})`
          + (hasEmissive ? ' *** EMISSIVE ***' : '')
        )
        for (const m of mats) {
          const mat = m as THREE.MeshStandardMaterial
          if (mat.emissiveMap) {
            emissiveMats.push(mat)
            if (!emissiveMeshes.includes(mesh)) emissiveMeshes.push(mesh)
          }
        }
      })
      console.groupEnd()

      scene.add(bfg)

      const REVEAL_START = 0.88  // darkness threshold before BFG begins to show
      const REVEAL_RANGE = 1 - REVEAL_START

      const spin = () => {
        animId = requestAnimationFrame(spin)
        t += 0.006
        if (!bfg) return

        if (bfgGrabbedRef.current || enterHeldRef.current || shotsFiredRef.current) {
          rotY += (bfgManualRotYRef.current - rotY) * 0.1
        } else {
          rotY += 0.008
          bfgManualRotYRef.current = rotY
        }

        // Smooth tilt toward drag target, ease back to 0 when released
        bfg.rotation.x += (bfgTiltTargetRef.current - bfg.rotation.x) * 0.1
        bfg.rotation.y = rotY
        // Turbulence grows quadratically as charge builds, settles gracefully as chargePct decays
        const cp = chargePctRef.current
        const turbAmp = cp * cp * 0.055
        bfg.position.x = Math.sin(t * (12 + cp * 28)) * turbAmp + Math.sin(t * (7 + cp * 19) * 1.7) * turbAmp * 0.5
        bfg.position.y = 0.1 + Math.sin(t * 1.2) * 0.08 + Math.cos(t * (9 + cp * 22)) * turbAmp * 0.7
        bfg.position.z = Math.sin(t * (8 + cp * 24) * 1.3) * turbAmp * 0.4

        // Charge accumulation
        const CHARGE_FRAMES = 180
        if (enterHeldRef.current && !shotsFiredRef.current) {
          chargeFramesRef.current = Math.min(CHARGE_FRAMES, chargeFramesRef.current + 1)
        }
        chargePctRef.current = chargeFramesRef.current / CHARGE_FRAMES

        // Fire point-cloud blobs at full charge
        if (chargePctRef.current >= 1 && !shotsFiredRef.current) {
          shotsFiredRef.current = true
          bfg.updateMatrixWorld()
          const barrelDir = new THREE.Vector3(-1, 0, 0).transformDirection(bfg.matrixWorld).multiplyScalar(0.016)
          for (const [lx, ly, lz] of [[-0.95, 0.25, -0.37], [-0.95, 0.25, 0.37]] as [number, number, number][]) {
            const worldTip = new THREE.Vector3(lx, ly, lz).applyMatrix4(bfg.matrixWorld)
            const N = 1800
            const positions = new Float32Array(N * 3)
            const colors = new Float32Array(N * 3)
            const drifts = new Float32Array(N * 3)
            for (let i = 0; i < N; i++) {
              const onShell = Math.random() > 0.18
              const theta = Math.random() * Math.PI * 2
              const phi = Math.acos(2 * Math.random() - 1)
              const r = onShell ? 0.13 + Math.random() * 0.05 : Math.random() * 0.13
              positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
              positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
              positions[i * 3 + 2] = r * Math.cos(phi)
              const bright = onShell ? 0.6 + Math.random() * 0.4 : 0.15 + Math.random() * 0.25
              colors[i * 3] = bright * 0.62; colors[i * 3 + 1] = bright; colors[i * 3 + 2] = bright * 0.04
              drifts[i * 3]     = (Math.random() - 0.5) * 0.0009
              drifts[i * 3 + 1] = (Math.random() - 0.5) * 0.0009
              drifts[i * 3 + 2] = (Math.random() - 0.5) * 0.0009
            }
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
            const mat = new THREE.PointsMaterial({ vertexColors: true, size: 0.014, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
            const points = new THREE.Points(geo, mat)
            points.position.copy(worldTip)
            scene.add(points)
            activeShots.push({ geo, basePos: new Float32Array(positions), drifts, points, vel: barrelDir.clone(), age: 0 })
          }
          // Fixed cooldown — resets spin and allows next charge after 2.8s
          setTimeout(() => {
            shotsFiredRef.current = false
            chargeFramesRef.current = 0
            chargePctRef.current = 0
          }, 2800)
        }

        // Decay chargePct after firing so turbulence settles gracefully (visual only)
        if (shotsFiredRef.current && chargePctRef.current > 0) {
          chargePctRef.current = Math.max(0, chargePctRef.current - 0.011)
          chargeFramesRef.current = Math.max(0, chargeFramesRef.current - 2)
        }

        // Update point-cloud shots — particles drift outward slowly
        const SHOT_LIFETIME = 900
        for (let i = activeShots.length - 1; i >= 0; i--) {
          const s = activeShots[i]
          s.age++
          s.points.position.add(s.vel)
          const pos = s.geo.attributes.position as THREE.BufferAttribute
          for (let j = 0; j < pos.count; j++) {
            s.basePos[j * 3]     += s.drifts[j * 3]
            s.basePos[j * 3 + 1] += s.drifts[j * 3 + 1]
            s.basePos[j * 3 + 2] += s.drifts[j * 3 + 2]
            pos.setXYZ(j, s.basePos[j * 3], s.basePos[j * 3 + 1], s.basePos[j * 3 + 2])
          }
          pos.needsUpdate = true
          // Fade only when leaving the viewport
          const shotCam = cameraRef.current
          if (shotCam) {
            const ndc = s.points.position.clone().project(shotCam)
            const edgeX = Math.max(0, Math.abs(ndc.x) - 1)
            const edgeY = Math.max(0, Math.abs(ndc.y) - 1)
            const outside = Math.max(edgeX, edgeY)
            ;(s.points.material as THREE.PointsMaterial).opacity = Math.max(0, 0.92 * (1 - Math.min(1, outside * 5)))
          }
          if (s.age > SHOT_LIFETIME) {
            scene.remove(s.points)
            s.geo.dispose()
            ;(s.points.material as THREE.PointsMaterial).dispose()
            activeShots.splice(i, 1)
          }
        }

        const dp = darknessProgressRef.current
        const targetOpacity = dp < REVEAL_START
          ? 0
          : Math.min(1, (dp - REVEAL_START) / REVEAL_RANGE)

        bfg.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (!mesh.isMesh) return
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const m of mats) {
            const mat = m as THREE.Material
            mat.opacity += (targetOpacity - mat.opacity) * 0.028
          }
        })

        // Pulse emissive glow — compound sine for organic plasma feel
        const pulse = Math.max(0.15, 2.0 + Math.sin(t * 5) * 1.4 + Math.sin(t * 13) * 0.6)
        for (const mat of emissiveMats) {
          mat.emissiveIntensity = pulse
        }
      }
      spin()
    })

    return () => {
      cancelAnimationFrame(animId)
      if (bfg) scene.remove(bfg)
      for (const s of activeShots) {
        scene.remove(s.points)
        s.geo.dispose()
        ;(s.points.material as THREE.PointsMaterial).dispose()
      }
      dracoLoader.dispose()
    }
  }, [showBfg])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}

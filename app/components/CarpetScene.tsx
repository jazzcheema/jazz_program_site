'use client'

import React, { useEffect, useRef } from 'react'
import { initAudioAnalyser, getAudioFreqs } from '../lib/audioAnalyser'
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { REFERENCE_ASPECT } from '../lib/responsiveScene'

interface CarpetSceneProps {
  onReachClouds: () => void
  onReachSandcastle: () => void
  onReachBooks: () => void
  showBfg?: boolean
  bfgExiting?: boolean
  onBfgReturnStart?: () => void
  onBfgExitComplete?: () => void
  audioRef?: React.RefObject<HTMLAudioElement | null>
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
const TWO_PI = Math.PI * 2
const JAZZ_MODEL_SIZE = 3.2
const JAZZ_MIRROR_X = true
const JAZZ_POSITION = { x: 0, y: 0, z: 0 }
const JAZZ_ROTATION_DEG = {
  x: 105,
  y: 0,
  z: 150,
}

const nearestEquivalentAngle = (from: number, target: number) => {
  const delta = THREE.MathUtils.euclideanModulo(target - from + Math.PI, TWO_PI) - Math.PI
  return from + delta
}

const phaseRand = (phase: number, salt: number) => {
  const n = Math.sin(phase * 12.9898 + salt * 78.233) * 43758.5453
  return n - Math.floor(n)
}

const applyJazzTransform = (jazz: THREE.Group, scale: number) => {
  jazz.scale.set(JAZZ_MIRROR_X ? -scale : scale, scale, scale)
  jazz.position.set(JAZZ_POSITION.x, JAZZ_POSITION.y, JAZZ_POSITION.z)
  jazz.rotation.set(
    THREE.MathUtils.degToRad(JAZZ_ROTATION_DEG.x),
    THREE.MathUtils.degToRad(JAZZ_ROTATION_DEG.y),
    THREE.MathUtils.degToRad(JAZZ_ROTATION_DEG.z),
  )
}

export default function CarpetScene({ onReachClouds, onReachSandcastle, onReachBooks, showBfg, bfgExiting, onBfgReturnStart, onBfgExitComplete, audioRef }: CarpetSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const onReachRef = useRef(onReachClouds)
  const onReachSandcastleRef = useRef(onReachSandcastle)
  const onReachBooksRef = useRef(onReachBooks)
  const showBfgRef = useRef(showBfg)
  const bfgExitingRef = useRef(bfgExiting)
  const onBfgReturnStartRef = useRef(onBfgReturnStart)
  const onBfgExitCompleteRef = useRef(onBfgExitComplete)
  const darknessProgressRef = useRef(0)
  const bfgDrainProgressRef = useRef(0)
  const bfgDropProgressRef = useRef(0)
  const bfgReturnProgressRef = useRef(0)
  const bfgGrabbedRef = useRef(false)
  const bfgManualRotYRef = useRef(0)
  const bfgDragStartXRef = useRef(0)
  const bfgDragStartYRef = useRef(0)
  const bfgTiltTargetRef = useRef(0)
  const enterHeldRef = useRef(false)
  const chargeFramesRef = useRef(0)
  const shotsFiredRef = useRef(false)
  const chargePctRef = useRef(0)
  const frontalTargetRef = useRef(Math.PI / 2)
  const cloudsCloudRef = useRef<THREE.Points | null>(null)
  const cloudsCloudGeoRef = useRef<THREE.BufferGeometry | null>(null)
  const cloudsCloudBaseRef = useRef<Float32Array | null>(null)
  const cloudsCloudPhasesRef = useRef<Float32Array | null>(null)
  const cloudsCloudMatRef = useRef<THREE.PointsMaterial | null>(null)

  useEffect(() => {
    onReachRef.current = onReachClouds
    onReachSandcastleRef.current = onReachSandcastle
    onReachBooksRef.current = onReachBooks
  }, [onReachClouds, onReachSandcastle, onReachBooks])

  useEffect(() => { showBfgRef.current = showBfg }, [showBfg])
  useEffect(() => { bfgExitingRef.current = bfgExiting }, [bfgExiting])
  useEffect(() => { onBfgReturnStartRef.current = onBfgReturnStart }, [onBfgReturnStart])
  useEffect(() => { onBfgExitCompleteRef.current = onBfgExitComplete }, [onBfgExitComplete])

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

    const fadeModelOpacity = (obj: THREE.Object3D | null, target: number, speed: number) => {
      if (!obj) return
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          const mat = m as THREE.Material
          if (!mat) continue
          if (!mat.transparent) {
            mat.transparent = true
            mat.needsUpdate = true
          }
          mat.opacity += (target - mat.opacity) * speed
          if (target >= 1 && mat.opacity > 0.995) mat.opacity = 1
          if (target <= 0 && mat.opacity < 0.005) mat.opacity = 0
        }
      })
    }

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

      // Sample mesh vertices for point cloud overlay (in clouds local space)
      clouds.updateMatrixWorld(true)
      const inv = new THREE.Matrix4().copy(clouds.matrixWorld).invert()
      const cVerts: number[] = []
      clouds.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        const posAttr = mesh.geometry.attributes.position
        if (!posAttr) return
        mesh.updateWorldMatrix(true, false)
        const toLocal = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld)
        for (let i = 0; i < posAttr.count; i += 2) {
          const v = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(toLocal)
          cVerts.push(v.x, v.y, v.z)
        }
      })
      const cBase = new Float32Array(cVerts)
      const cPos = new Float32Array(cVerts)
      const cPhases = new Float32Array(cBase.length / 3).map(() => Math.random() * Math.PI * 2)
      const cGeo = new THREE.BufferGeometry()
      cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3))
      const cMat = new THREE.PointsMaterial({ color: 0x44ffaa, size: 0.018, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      const cPoints = new THREE.Points(cGeo, cMat)
      cPoints.visible = false
      clouds.add(cPoints)
      cloudsCloudRef.current = cPoints
      cloudsCloudGeoRef.current = cGeo
      cloudsCloudBaseRef.current = cBase
      cloudsCloudPhasesRef.current = cPhases
      cloudsCloudMatRef.current = cMat
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
      if (bfgExitingRef.current) return
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
    let cloudPointLevel = 0

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
      if (showBfgRef.current && !bfgExitingRef.current) {
        bfgDrainProgressRef.current = 0
        bfgDropProgressRef.current = 0
        bfgReturnProgressRef.current = 0
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

        for (const obj of [carpet, sandcastle, books]) fadeModelOpacity(obj, 0, 0.05)
      } else if (bfgExitingRef.current) {
        const returnProgress = bfgReturnProgressRef.current
        darknessProgressRef.current = Math.max(0, darknessProgressRef.current - 0.0045 * returnProgress)
        bfgDarkSettledAtTick = -1

        if (returnProgress > 0) {
          const returnEase = 0.006 + returnProgress * 0.022
          ambient.intensity         += (LIGHT_TARGETS.ambient - ambient.intensity) * returnEase
          key.intensity             += (LIGHT_TARGETS.key - key.intensity) * returnEase
          rim.intensity             += (LIGHT_TARGETS.rim - rim.intensity) * returnEase
          cloudLight.intensity      += (LIGHT_TARGETS.cloud - cloudLight.intensity) * returnEase
          sandcastleLight.intensity += (LIGHT_TARGETS.sandcastle - sandcastleLight.intensity) * returnEase
          booksLight.intensity      += (LIGHT_TARGETS.books - booksLight.intensity) * returnEase
          for (const obj of [carpet, sandcastle, books]) fadeModelOpacity(obj, 1, 0.012 + returnProgress * 0.024)
        } else {
          ambient.intensity         += (0.003 - ambient.intensity) * 0.015
          key.intensity             += (0 - key.intensity) * 0.015
          rim.intensity             += (0 - rim.intensity) * 0.015
          cloudLight.intensity      += (0.2 - cloudLight.intensity) * 0.012
          sandcastleLight.intensity += (0 - sandcastleLight.intensity) * 0.015
          booksLight.intensity      += (0 - booksLight.intensity) * 0.015
        }
        eerieGreen.intensity      += (0 - eerieGreen.intensity) * (returnProgress > 0 ? 0.035 : 0.012)
        eerieDeep.intensity       += (0 - eerieDeep.intensity) * (returnProgress > 0 ? 0.035 : 0.012)
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

        // BFG mode: swap mesh for point cloud, react to audio
        const returnProgress = bfgReturnProgressRef.current
        const bfgOnTarget = !!showBfgRef.current && (!bfgExitingRef.current || returnProgress < 0.96)
        const cloudTarget = bfgOnTarget ? Math.max(0, 1 - returnProgress) : 0
        cloudPointLevel += (cloudTarget - cloudPointLevel) * (cloudTarget > cloudPointLevel ? 0.16 : 0.028)
        const cCloud = cloudsCloudRef.current
        const cGeo = cloudsCloudGeoRef.current
        const cBase = cloudsCloudBaseRef.current
        const cPhases = cloudsCloudPhasesRef.current
        const cMat = cloudsCloudMatRef.current
        clouds.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (!mesh.isMesh) return
          mesh.visible = cloudPointLevel < 0.98
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const m of mats) {
            const mat = m as THREE.Material
            if (!mat) continue
            if (!mat.transparent) {
              mat.transparent = true
              mat.needsUpdate = true
            }
            mat.opacity = Math.max(0, Math.min(1, 1 - cloudPointLevel))
          }
        })
        if (cCloud) cCloud.visible = cloudPointLevel > 0.01
        if (cloudPointLevel > 0.01 && cGeo && cBase && cPhases && cMat) {
          const { bass, mid, snare } = getAudioFreqs()
          const cpos = cGeo.attributes.position as THREE.BufferAttribute
          const scatter = Math.min(0.16, bass * 0.1 + snare * 0.12)
          for (let i = 0; i < cpos.count; i++) {
            const bx = cBase[i * 3], by = cBase[i * 3 + 1], bz = cBase[i * 3 + 2]
            const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1
            const hitShape = snare > 0.01 ? 0.65 + 0.35 * Math.sin(cPhases[i] * 1.7) : 0.5 + 0.5 * Math.sin(t * 80 + cPhases[i])
            const s = scatter * hitShape
            cpos.setXYZ(i, bx + bx / len * s, by + by / len * s, bz + bz / len * s)
          }
          cpos.needsUpdate = true
          cMat.opacity = cloudPointLevel * Math.min(0.8, 0.3 + bass * 0.55 + mid * 0.3 + snare * 0.35)
        }
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
      if (e.key === 'Enter' && showBfgRef.current && !bfgExitingRef.current && !shotsFiredRef.current) {
        e.preventDefault()
        enterHeldRef.current = true
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (showBfgRef.current) e.preventDefault()
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

    type ShotBlob = {
      geo: THREE.BufferGeometry
      spikeGeo: THREE.BufferGeometry
      basePos: Float32Array
      drifts: Float32Array
      phases: Float32Array
      points: THREE.Points
      spikeLines: THREE.LineSegments
      vel: THREE.Vector3
      age: number
    }
    const activeShots: ShotBlob[] = []

    let bfg: THREE.Group | null = null
    let animId: number
    let t = 0
    let rotY = 0
    let grabbedCloudLevel = 0
    let envPoints: THREE.Points | null = null
    let envGeo: THREE.BufferGeometry | null = null
    let envMat: THREE.PointsMaterial | null = null
    let bfgCloudGeo: THREE.BufferGeometry | null = null
    let bfgCloudMat: THREE.PointsMaterial | null = null
    let bfgCloudBase: Float32Array | null = null
    let bfgCloudPhases: Float32Array | null = null
    let jazz: THREE.Group | null = null
    let jazzCloud: THREE.Points | null = null
    let jazzCloudGeo: THREE.BufferGeometry | null = null
    let jazzCloudMat: THREE.PointsMaterial | null = null
    let jazzCloudBase: Float32Array | null = null
    let jazzCloudPhases: Float32Array | null = null
    let jazzLoaded = false
    let exitStarted = false
    let exitFrames = 0
    let returnStarted = false
    let exitComplete = false

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

      // Collect emissive materials for pulsing.
      const emissiveMats: THREE.MeshStandardMaterial[] = []
      bfg.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          const mat = m as THREE.MeshStandardMaterial
          if (mat.emissiveMap) {
            emissiveMats.push(mat)
          }
        }
      })

      scene.add(bfg)

      // --- Audio analysis via singleton ---
      if (audioRef?.current) initAudioAnalyser(audioRef.current)

      // --- BFG point cloud (charge-up only) ---
      bfg.updateMatrixWorld(true)
      const bfgWorldInv = new THREE.Matrix4().copy(bfg.matrixWorld).invert()
      const bfgVerts: number[] = []
      bfg.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        const posAttr = mesh.geometry.attributes.position
        if (!posAttr) return
        mesh.updateWorldMatrix(true, false)
        const toLocal = new THREE.Matrix4().multiplyMatrices(bfgWorldInv, mesh.matrixWorld)
        for (let i = 0; i < posAttr.count; i += 2) {
          const v = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(toLocal)
          bfgVerts.push(v.x, v.y, v.z)
        }
      })
      bfgCloudBase = new Float32Array(bfgVerts)
      bfgCloudPhases = new Float32Array(bfgCloudBase.length / 3).map(() => Math.random() * Math.PI * 2)
      bfgCloudGeo = new THREE.BufferGeometry()
      bfgCloudGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bfgVerts), 3))
      bfgCloudMat = new THREE.PointsMaterial({ color: 0x44ff88, size: 0.007, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      bfg.add(new THREE.Points(bfgCloudGeo, bfgCloudMat))

      // --- Environmental particles (sphere field, react to mids) ---
      const ENV_N = 2200
      const envBase = new Float32Array(ENV_N * 3)
      const envPos = new Float32Array(ENV_N * 3)
      const envPhases = new Float32Array(ENV_N)
      for (let i = 0; i < ENV_N; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const r = 1.8 + Math.random() * 2.8
        envBase[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
        envBase[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
        envBase[i * 3 + 2] = r * Math.cos(phi)
        envPos[i * 3] = envBase[i * 3]; envPos[i * 3 + 1] = envBase[i * 3 + 1]; envPos[i * 3 + 2] = envBase[i * 3 + 2]
        envPhases[i] = Math.random() * Math.PI * 2
      }
      envGeo = new THREE.BufferGeometry()
      envGeo.setAttribute('position', new THREE.BufferAttribute(envPos, 3))
      envMat = new THREE.PointsMaterial({ color: 0x1aff66, size: 0.013, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      envPoints = new THREE.Points(envGeo, envMat)
      scene.add(envPoints)

      loader.load('/models/jazz.glb', (jazzGltf) => {
        jazz = jazzGltf.scene
        const box = new THREE.Box3().setFromObject(jazz)
        jazz.position.sub(box.getCenter(new THREE.Vector3()))
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        applyJazzTransform(jazz, JAZZ_MODEL_SIZE / maxDim)
        jazz.visible = false

        jazz.updateMatrixWorld(true)
        const inv = new THREE.Matrix4().copy(jazz.matrixWorld).invert()
        const verts: number[] = []
        jazz.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (!mesh.isMesh) return
          mesh.visible = false
          const posAttr = mesh.geometry.attributes.position
          if (!posAttr) return
          mesh.updateWorldMatrix(true, false)
          const toLocal = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld)
          for (let i = 0; i < posAttr.count; i += 2) {
            const v = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(toLocal)
            verts.push(v.x, v.y, v.z)
          }
        })

        jazzCloudBase = new Float32Array(verts)
        jazzCloudPhases = new Float32Array(jazzCloudBase.length / 3).map(() => Math.random() * Math.PI * 2)
        jazzCloudGeo = new THREE.BufferGeometry()
        jazzCloudGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
        jazzCloudMat = new THREE.PointsMaterial({ color: 0xb7ff2a, size: 0.0065, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
        jazzCloud = new THREE.Points(jazzCloudGeo, jazzCloudMat)
        jazzCloud.visible = false
        jazz.add(jazzCloud)
        scene.add(jazz)
        jazzLoaded = true
      })

      const REVEAL_START = 0.88  // darkness threshold before BFG begins to show
      const REVEAL_RANGE = 1 - REVEAL_START
      const EXIT_CLOUD_FRAMES = 170
      const EXIT_DROP_FRAMES = 95
      const EXIT_JAZZ_IN_FRAMES = 85
      const EXIT_JAZZ_HOLD_FRAMES = 180
      const EXIT_RETURN_FRAMES = 190
      const EXIT_DROP_START = EXIT_CLOUD_FRAMES
      const EXIT_JAZZ_START = EXIT_DROP_START + EXIT_DROP_FRAMES
      const EXIT_RETURN_START = EXIT_JAZZ_START + EXIT_JAZZ_IN_FRAMES + EXIT_JAZZ_HOLD_FRAMES
      const EXIT_TOTAL_FRAMES = EXIT_RETURN_START + EXIT_RETURN_FRAMES

      const spin = () => {
        animId = requestAnimationFrame(spin)
        t += 0.006
        if (!bfg) return
        const exiting = !!bfgExitingRef.current

        if (exiting && !exitStarted) {
          exitStarted = true
          exitFrames = 0
          bfgGrabbedRef.current = false
          bfgTiltTargetRef.current = 0
          enterHeldRef.current = false
          chargeFramesRef.current = 0
          chargePctRef.current = 0
        }
        if (exiting) {
          exitFrames++
          const drainProgress = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(exitFrames / EXIT_CLOUD_FRAMES, 0, 1), 0, 1)
          const dropProgress = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((exitFrames - EXIT_DROP_START) / EXIT_DROP_FRAMES, 0, 1), 0, 1)
          const returnProgress = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((exitFrames - EXIT_RETURN_START) / EXIT_RETURN_FRAMES, 0, 1), 0, 1)
          bfgDrainProgressRef.current = drainProgress
          bfgDropProgressRef.current = dropProgress
          bfgReturnProgressRef.current = returnProgress
          if (returnProgress > 0 && !returnStarted) {
            returnStarted = true
            onBfgReturnStartRef.current?.()
          }
        }

        if (!exiting && enterHeldRef.current) {
          // Pick a frontal target once per charge session (±5° of dead-front)
          if (chargeFramesRef.current === 0) {
            const frontalTarget = Math.PI / 2 + (Math.random() - 0.5) * (36 * Math.PI / 180)
            frontalTargetRef.current = nearestEquivalentAngle(rotY, frontalTarget)
            bfgManualRotYRef.current = rotY
          }
          bfgManualRotYRef.current += (frontalTargetRef.current - bfgManualRotYRef.current) * 0.04
          rotY += (bfgManualRotYRef.current - rotY) * 0.1
        } else if (!exiting && (bfgGrabbedRef.current || shotsFiredRef.current)) {
          rotY += (bfgManualRotYRef.current - rotY) * 0.1
        } else if (!exiting) {
          rotY += 0.008
          bfgManualRotYRef.current = rotY
        } else {
          rotY += (bfgManualRotYRef.current - rotY) * 0.045
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

        // --- Audio frequency data ---
        const cloudDp = darknessProgressRef.current
        const { bass, mid, treble, highSpike, snare } = getAudioFreqs()

        // BFG point cloud — fades in with charge, disappears on fire
        if (bfgCloudGeo && bfgCloudMat && bfgCloudBase && bfgCloudPhases) {
          const cp2 = chargePctRef.current
          const drainProgress = bfgDrainProgressRef.current
          const dropProgress = bfgDropProgressRef.current
          const returnProgress = bfgReturnProgressRef.current
          const grabbedCloudTarget = bfgGrabbedRef.current && !shotsFiredRef.current && !exiting ? 1 : 0
          const grabbedCloudEase = grabbedCloudTarget > grabbedCloudLevel ? 0.12 : 0.055
          grabbedCloudLevel += (grabbedCloudTarget - grabbedCloudLevel) * grabbedCloudEase
          if (grabbedCloudLevel < 0.001) grabbedCloudLevel = 0
          const grabbedCloud = grabbedCloudLevel
          const chargeBloom = cp2 * cp2
          const grabbedTreble = grabbedCloud * Math.min(1, treble * 2.4)
          const drainCloud = exiting ? drainProgress * Math.max(0, 1 - returnProgress) : 0
          const scatter = cp2 * 0.035
            + chargeBloom * 0.085
            + grabbedCloud * (0.018 + grabbedTreble * 0.065)
            + drainCloud * (0.035 + Math.sin(t * 9) * 0.008)
          const cpos = bfgCloudGeo.attributes.position as THREE.BufferAttribute
          const dropY = dropProgress * dropProgress * 8.8
          for (let i = 0; i < cpos.count; i++) {
            const bx = bfgCloudBase[i * 3], by = bfgCloudBase[i * 3 + 1], bz = bfgCloudBase[i * 3 + 2]
            const phase = bfgCloudPhases[i]
            const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1
            const chargeShape = 0.42 + 0.58 * Math.sin(t * 6 + phase)
            const highShape = 0.35 + 0.65 * Math.sin(t * 34 + phase * 2.1)
            const drainShape = 0.35 + 0.65 * Math.sin(t * 11 + phase * 1.4)
            const shape = drainCloud > 0.01 ? drainShape : grabbedCloud > 0 && cp2 <= 0 ? highShape : chargeShape
            const s = scatter * shape
            const fall = dropY * (0.35 + phaseRand(phase, 1) * 1.85)
            const drift = dropProgress * dropProgress
            const sideX = (phaseRand(phase, 2) - 0.5) * drift * 0.7
            const sideZ = (phaseRand(phase, 3) - 0.5) * drift * 0.55
            cpos.setXYZ(i, bx + bx / len * s + sideX, by + by / len * s - fall, bz + bz / len * s + sideZ)
          }
          cpos.needsUpdate = true
          bfgCloudMat.size = 0.007 + chargeBloom * 0.002 + grabbedTreble * 0.0025 + drainCloud * 0.002
          const activeOpacity = Math.min(0.82, cp2 * 0.8 + grabbedCloud * (0.2 + grabbedTreble * 0.42))
          const drainOpacity = drainCloud * 0.84
          bfgCloudMat.opacity = Math.max(activeOpacity, drainOpacity) * Math.max(0, 1 - returnProgress)
        }

        if (envGeo && envMat) {
          const ep = envGeo.attributes.position as THREE.BufferAttribute
          const motionCap = 0.37
          const sway = Math.min(0.28, mid * 0.21 + bass * 0.08)
          const spike = Math.min(motionCap - sway, snare * 0.28)
          const dropProgress = bfgDropProgressRef.current
          const returnProgress = bfgReturnProgressRef.current
          const dropY = dropProgress * dropProgress * 9.5
          for (let i = 0; i < ENV_N; i++) {
            const ph = envPhases[i]
            const bx = envBase[i * 3]
            const by = envBase[i * 3 + 1]
            const bz = envBase[i * 3 + 2]
            const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1
            const hit = spike * (0.45 + 0.55 * Math.abs(Math.sin(ph * 1.9)))
            const fall = dropY * (0.25 + phaseRand(ph, 4) * 2.15)
            const dropDrift = dropProgress * dropProgress
            const driftX = (phaseRand(ph, 5) - 0.5) * dropDrift * 1.15
            const driftZ = (phaseRand(ph, 6) - 0.5) * dropDrift * 0.9
            ep.setXYZ(i,
              bx + bx / len * hit + Math.sin(t * 1.4 + ph) * sway + driftX,
              by + by / len * hit + Math.sin(t * 1.1 + ph * 1.3) * sway - fall,
              bz + bz / len * hit + Math.sin(t * 1.7 + ph * 0.7) * sway + driftZ,
            )
          }
          ep.needsUpdate = true
          envMat.size = Math.min(0.017, 0.013 + snare * 0.006)
          envMat.opacity = exiting
            ? Math.min(0.55, Math.max(0.24, cloudDp * 0.42) * Math.max(0, 1 - returnProgress))
            : Math.min(0.55, cloudDp * (mid * 0.72 + bass * 0.25 + snare * 0.45))
        }

        // Charge accumulation
        const CHARGE_FRAMES = 180
        if (!exiting && enterHeldRef.current && !shotsFiredRef.current) {
          chargeFramesRef.current = Math.min(CHARGE_FRAMES, chargeFramesRef.current + 1)
        }
        chargePctRef.current = chargeFramesRef.current / CHARGE_FRAMES

        // Fire point-cloud blobs at full charge
        if (!exiting && chargePctRef.current >= 1 && !shotsFiredRef.current) {
          shotsFiredRef.current = true
          bfg.updateMatrixWorld()
          const barrelDir = new THREE.Vector3(-1, 0, 0).transformDirection(bfg.matrixWorld).multiplyScalar(0.016)
          for (const [lx, ly, lz] of [[-0.95, 0.25, -0.37], [-0.95, 0.25, 0.37]] as [number, number, number][]) {
            const worldTip = new THREE.Vector3(lx, ly, lz).applyMatrix4(bfg.matrixWorld)
            const N = 1800
            const positions = new Float32Array(N * 3)
            const spikePositions = new Float32Array(N * 6)
            const colors = new Float32Array(N * 3)
            const drifts = new Float32Array(N * 3)
            const phases = new Float32Array(N)
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
              phases[i] = Math.random() * Math.PI * 2
            }
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
            const mat = new THREE.PointsMaterial({ vertexColors: true, size: 0.014, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
            const points = new THREE.Points(geo, mat)
            points.position.copy(worldTip)
            scene.add(points)
            const spikeGeo = new THREE.BufferGeometry()
            spikeGeo.setAttribute('position', new THREE.BufferAttribute(spikePositions, 3))
            const spikeMat = new THREE.LineBasicMaterial({ color: 0xb7ff2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
            const spikeLines = new THREE.LineSegments(spikeGeo, spikeMat)
            spikeLines.position.copy(worldTip)
            scene.add(spikeLines)
            activeShots.push({ geo, spikeGeo, basePos: new Float32Array(positions), drifts, phases, points, spikeLines, vel: barrelDir.clone(), age: 0 })
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
        const shotBass = Math.min(0.065, bass * 0.13)
        const shotHighSpike = Math.min(0.13, highSpike * 0.17)
        for (let i = activeShots.length - 1; i >= 0; i--) {
          const s = activeShots[i]
          s.age++
          s.points.position.add(s.vel)
          s.spikeLines.position.add(s.vel)
          const pos = s.geo.attributes.position as THREE.BufferAttribute
          const spikePos = s.spikeGeo.attributes.position as THREE.BufferAttribute
          const bassRamp = Math.min(1, s.age / 18)
          const highRamp = Math.min(1, s.age / 6)
          const shotAudio = shotBass * bassRamp + shotHighSpike * highRamp
          const shotDropY = bfgDropProgressRef.current * 8.2
          for (let j = 0; j < pos.count; j++) {
            s.basePos[j * 3]     += s.drifts[j * 3]
            s.basePos[j * 3 + 1] += s.drifts[j * 3 + 1]
            s.basePos[j * 3 + 2] += s.drifts[j * 3 + 2]
            const bx = s.basePos[j * 3]
            const by = s.basePos[j * 3 + 1]
            const bz = s.basePos[j * 3 + 2]
            const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1
            const bassPulse = shotBass * (0.45 + 0.55 * Math.sin(t * 14 + s.phases[j]) ** 2)
            const highPulse = shotHighSpike * (0.18 + 0.82 * Math.sin(t * 74 + s.phases[j] * 2.7) ** 2)
            const pulse = bassPulse * bassRamp + highPulse * highRamp
            pos.setXYZ(j, bx + bx / len * pulse, by + by / len * pulse - shotDropY, bz + bz / len * pulse)
            const spikeBase = pulse + highPulse * highRamp * 0.16
            const spikeTip = pulse + highPulse * highRamp * (0.72 + 0.38 * Math.sin(t * 31 + s.phases[j]) ** 2)
            spikePos.setXYZ(j * 2, bx + bx / len * spikeBase, by + by / len * spikeBase - shotDropY, bz + bz / len * spikeBase)
            spikePos.setXYZ(j * 2 + 1, bx + bx / len * spikeTip, by + by / len * spikeTip - shotDropY, bz + bz / len * spikeTip)
          }
          pos.needsUpdate = true
          spikePos.needsUpdate = true
          ;(s.points.material as THREE.PointsMaterial).size = Math.min(0.021, 0.014 + shotAudio * 0.055 + shotHighSpike * 0.11)
          ;(s.spikeLines.material as THREE.LineBasicMaterial).opacity = Math.min(0.38, shotHighSpike * 3.2)
          // Fade only when leaving the viewport
          const shotCam = cameraRef.current
          if (shotCam) {
            const ndc = s.points.position.clone().project(shotCam)
            const edgeX = Math.max(0, Math.abs(ndc.x) - 1)
            const edgeY = Math.max(0, Math.abs(ndc.y) - 1)
            const outside = Math.max(edgeX, edgeY)
            const viewportFade = Math.max(0, 1 - Math.min(1, outside * 5))
            ;(s.points.material as THREE.PointsMaterial).opacity = 0.92 * viewportFade
            ;(s.spikeLines.material as THREE.LineBasicMaterial).opacity = Math.min(0.38, shotHighSpike * 3.2) * viewportFade
          }
          if (exiting) {
            const shotDrain = Math.max(0, 1 - bfgReturnProgressRef.current)
            ;(s.points.material as THREE.PointsMaterial).opacity *= shotDrain
            ;(s.spikeLines.material as THREE.LineBasicMaterial).opacity *= shotDrain
          }
          if (s.age > SHOT_LIFETIME) {
            scene.remove(s.points)
            scene.remove(s.spikeLines)
            s.geo.dispose()
            s.spikeGeo.dispose()
            ;(s.points.material as THREE.PointsMaterial).dispose()
            ;(s.spikeLines.material as THREE.LineBasicMaterial).dispose()
            activeShots.splice(i, 1)
          }
        }

        if (exiting) {
          if (jazz && jazzCloud && jazzCloudGeo && jazzCloudBase && jazzCloudPhases && jazzCloudMat) {
            const intro = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((exitFrames - EXIT_JAZZ_START) / EXIT_JAZZ_IN_FRAMES, 0, 1), 0, 1)
            const returnProgress = bfgReturnProgressRef.current
            const visibleAmount = intro * Math.max(0, 1 - returnProgress)
            jazz.visible = visibleAmount > 0.01
            jazzCloud.visible = visibleAmount > 0.01
            jazz.position.y = Math.sin(t * 1.25) * 0.035 - returnProgress * 0.25

            const cpos = jazzCloudGeo.attributes.position as THREE.BufferAttribute
            const jazzBody = Math.min(0.18, bass * 0.06 + mid * 0.11 + treble * 0.035)
            const jazzHit = Math.min(0.22, snare * 0.12 + highSpike * 0.16)
            const scatter = intro * (0.008 + jazzBody + jazzHit + returnProgress * 0.34)
            for (let i = 0; i < cpos.count; i++) {
              const bx = jazzCloudBase[i * 3]
              const by = jazzCloudBase[i * 3 + 1]
              const bz = jazzCloudBase[i * 3 + 2]
              const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1
              const phase = jazzCloudPhases[i]
              const bodyShape = 0.55 + 0.45 * Math.sin(phase * 1.3)
              const transientShape = 0.35 + 0.65 * Math.abs(Math.sin(phase * 2.7 + t * 36))
              const jitter = jazzHit * 0.16
              const s = scatter * (bodyShape + transientShape * jazzHit * 2.4)
              cpos.setXYZ(
                i,
                bx + bx / len * s + Math.sin(t * 30 + phase) * jitter,
                by + by / len * s + Math.cos(t * 28 + phase * 1.4) * jitter,
                bz + bz / len * s + Math.sin(t * 34 + phase * 0.8) * jitter,
              )
            }
            cpos.needsUpdate = true
            jazzCloudMat.size = Math.min(0.014, 0.0065 + treble * 0.004 + snare * 0.003 + highSpike * 0.006 + returnProgress * 0.004)
            jazzCloudMat.opacity = Math.min(0.95, visibleAmount * (0.68 + bass * 0.2 + mid * 0.22 + snare * 0.18 + highSpike * 0.16))
          }

          if (!exitComplete && exitFrames > (jazzLoaded ? EXIT_TOTAL_FRAMES : EXIT_TOTAL_FRAMES + 180)) {
            exitComplete = true
            onBfgExitCompleteRef.current?.()
          }
        }



        const dp = darknessProgressRef.current
        const targetOpacity = exiting
          ? Math.max(0, 1 - bfgDrainProgressRef.current * 2.4)
          : dp < REVEAL_START
          ? 0
          : Math.min(1, (dp - REVEAL_START) / REVEAL_RANGE)

        bfg.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (!mesh.isMesh) return
          mesh.visible = !exiting || bfgDrainProgressRef.current < 0.48
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const m of mats) {
            const mat = m as THREE.Material
            mat.opacity += (targetOpacity - mat.opacity) * (exiting ? 0.08 : 0.028)
            if (exiting) mat.opacity = Math.min(mat.opacity, targetOpacity)
          }
        })

        // Pulse emissive glow — compound sine for organic plasma feel
        const pulse = exiting ? 0 : Math.max(0.15, 2.0 + Math.sin(t * 5) * 1.4 + Math.sin(t * 13) * 0.6)
        for (const mat of emissiveMats) {
          mat.emissiveIntensity = pulse
        }
      }
      spin()
    })

    return () => {
      cancelAnimationFrame(animId)
      if (bfg) scene.remove(bfg)
      if (envPoints) scene.remove(envPoints)
      if (jazz) scene.remove(jazz)
      envGeo?.dispose()
      envMat?.dispose()
      bfgCloudGeo?.dispose()
      bfgCloudMat?.dispose()
      jazzCloudGeo?.dispose()
      jazzCloudMat?.dispose()
      for (const s of activeShots) {
        scene.remove(s.points)
        scene.remove(s.spikeLines)
        s.geo.dispose()
        s.spikeGeo.dispose()
        ;(s.points.material as THREE.PointsMaterial).dispose()
        ;(s.spikeLines.material as THREE.LineBasicMaterial).dispose()
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

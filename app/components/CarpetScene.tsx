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

export default function CarpetScene({ onReachClouds, onReachSandcastle, onReachBooks }: CarpetSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onReachRef = useRef(onReachClouds)
  const onReachSandcastleRef = useRef(onReachSandcastle)
  const onReachBooksRef = useRef(onReachBooks)

  useEffect(() => {
    onReachRef.current = onReachClouds
    onReachSandcastleRef.current = onReachSandcastle
    onReachBooksRef.current = onReachBooks
  }, [onReachClouds, onReachSandcastle, onReachBooks])

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
    scene.fog = new THREE.Fog('#e9e5e0', 16, 34)

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, CAMERA_Z)
    camera.updateProjectionMatrix()

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
      if (!isDragging) return
      const w = toWorld(e.clientX, e.clientY)
      targetX = w.x
      targetY = w.y
    }

    const onPointerUp = (e: PointerEvent) => {
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

    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick++
      const t = tick * 0.01

      // Cinematic light fade-in — smoothstep easing
      if (lightT < 1) {
        lightT = Math.min(1, lightT + 1 / LIGHT_DURATION)
        const e = lightT * lightT * (3 - 2 * lightT)
        ambient.intensity   = LIGHT_TARGETS.ambient * e
        key.intensity       = LIGHT_TARGETS.key     * e
        rim.intensity       = LIGHT_TARGETS.rim     * e
        cloudLight.intensity = LIGHT_TARGETS.cloud  * e
        sandcastleLight.intensity = LIGHT_TARGETS.sandcastle * e
        booksLight.intensity = LIGHT_TARGETS.books * e
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

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('resize', onResize)
      dracoLoader.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    />
  )
}

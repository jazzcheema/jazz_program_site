'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  fitOffsetFromTarget,
  narrowAspectScale,
} from '../lib/responsiveScene'
import VortexBackground from './VortexBackground'

const SAND_VORTEX_HUES = [30, 38, 47]
const GENIE_BASE_X = -1.18
const GENIE_BASE_Z = 2.05
const BASE_CAMERA_Z = 9.35
const CINEMATIC_DURATION = 5200
const BASE_CAMERA_POSITION = new THREE.Vector3(0, 3.55, BASE_CAMERA_Z)
const BASE_LOOK_TARGET = new THREE.Vector3(0, -1.72, -1.85)
const SAND_FLOOR_SIZE = 17.5
const GENIE_WORLD_SIZE = 0.74
const REFERENCE_ASPECT = 16 / 10

const easeInOutCubic = (value: number) => {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
}

const cubicBezier = (
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
) => {
  const inverse = 1 - t
  return new THREE.Vector3()
    .addScaledVector(p0, inverse * inverse * inverse)
    .addScaledVector(p1, 3 * inverse * inverse * t)
    .addScaledVector(p2, 3 * inverse * t * t)
    .addScaledVector(p3, t * t * t)
}

export default function SandPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = 'ontouchstart' in window
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.setClearColor(0x0c0c0c, 0)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#0c0c0c', 10, 28)

    const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 100)
    const activeLookTarget = BASE_LOOK_TARGET.clone()

    const portraitAmount = () => {
      return THREE.MathUtils.clamp((REFERENCE_ASPECT - camera.aspect) / (REFERENCE_ASPECT - 0.56), 0, 1)
    }

    const fitInitialCamera = () => {
      const portrait = portraitAmount()
      const fittedDistance = BASE_CAMERA_Z * THREE.MathUtils.lerp(1, 1.24, portrait)
      camera.fov = THREE.MathUtils.lerp(44, 52, portrait)
      const offset = fitOffsetFromTarget(
        BASE_CAMERA_POSITION.clone().sub(BASE_LOOK_TARGET),
        BASE_CAMERA_Z,
        fittedDistance,
      )
      const portraitLookTarget = BASE_LOOK_TARGET.clone().add(new THREE.Vector3(-0.25 * portrait, -0.18 * portrait, 0.78 * portrait))
      camera.position.copy(portraitLookTarget.clone().add(offset))
      activeLookTarget.copy(portraitLookTarget)
      camera.updateProjectionMatrix()
      camera.lookAt(activeLookTarget)
    }

    fitInitialCamera()

    const responsiveFloorSize = () => SAND_FLOOR_SIZE

    const responsiveGenieSize = () => GENIE_WORLD_SIZE

    const skyFill = new THREE.HemisphereLight('#ffd08a', '#8a501c', 0.82)
    scene.add(skyFill)
    const sun = new THREE.DirectionalLight('#ffc36f', 3.8)
    sun.position.set(-0.85, 9.5, 1.25)
    scene.add(sun)
    const bounce = new THREE.PointLight('#c87820', 1.25, 13)
    bounce.position.set(-2.5, -0.55, 2.4)
    scene.add(bounce)
    const genieLight = new THREE.PointLight('#ffb45a', 1.35, 5)
    genieLight.position.set(0.15, -0.8, 0.85)
    scene.add(genieLight)

    let sandFloor: THREE.Group | null = null
    let genie: THREE.Group | null = null
    let sandFloorMaxDim = 1
    let genieMaxDim = 1
    let genieModelHeight = 1
    const floorY = -2.18
    const genieRideHeight = 1.68
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let cinematicStart = 0
    let cinematicActive = false
    let cinematicComplete = false
    let cameraBezier: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] | null = null
    let lookBezier: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] | null = null

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/gltf/')

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    loader.load('/models/sand.glb', (gltf) => {
      sandFloor = gltf.scene
      const box = new THREE.Box3().setFromObject(sandFloor)
      sandFloor.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      sandFloorMaxDim = Math.max(size.x, size.y, size.z)
      sandFloor.scale.setScalar(responsiveFloorSize() / sandFloorMaxDim)
      sandFloor.position.set(0, floorY, -2.05)
      sandFloor.rotation.y = -Math.PI / 10
      sandFloor.rotation.x = -0.13
      scene.add(sandFloor)
    })

    loader.load('/models/genie1.glb', (gltf) => {
      genie = gltf.scene
      const box = new THREE.Box3().setFromObject(genie)
      genie.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      genieModelHeight = size.y
      genieMaxDim = Math.max(size.x, size.y, size.z)
      const scale = responsiveGenieSize() / genieMaxDim
      genie.scale.setScalar(scale)
      genie.position.set(GENIE_BASE_X, floorY + genieModelHeight * scale * 0.5 + genieRideHeight, GENIE_BASE_Z)
      genie.rotation.y = Math.PI / 5
      scene.add(genie)
    })

    const currentGenieScale = () => responsiveGenieSize() / genieMaxDim

    const getGenieHeadTarget = () => {
      if (!genie) return new THREE.Vector3(GENIE_BASE_X, floorY + 2.2, GENIE_BASE_Z)
      const scale = currentGenieScale()
      return new THREE.Vector3(
        genie.position.x + 0.02,
        genie.position.y + genieModelHeight * scale * 0.34,
        genie.position.z + 0.08,
      )
    }

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    }

    const isPointerOnGenie = (event: PointerEvent) => {
      if (!genie || cinematicActive || cinematicComplete) return false
      updatePointer(event)
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObject(genie, true).length > 0
    }

    const beginCinematic = () => {
      if (!genie || cinematicActive || cinematicComplete) return

      const headTarget = getGenieHeadTarget()
      const bodyTarget = new THREE.Vector3(genie.position.x, genie.position.y, genie.position.z)
      const closeFrameScale = narrowAspectScale(camera.aspect, 1.65)
      const finalLookTarget = headTarget.clone().add(new THREE.Vector3(0.03, 0.14, 0))
      const finalCameraPosition = new THREE.Vector3(
        headTarget.x + 0.18 * closeFrameScale,
        headTarget.y - 0.22 * closeFrameScale,
        headTarget.z + 1.02 * closeFrameScale,
      )
      cinematicActive = true
      cinematicStart = performance.now()
      canvas.style.cursor = 'default'

      cameraBezier = [
        camera.position.clone(),
        new THREE.Vector3(
          genie.position.x - 4.1 * closeFrameScale,
          4.95 * Math.min(closeFrameScale, 1.28),
          genie.position.z + 5.3 * closeFrameScale,
        ),
        new THREE.Vector3(
          genie.position.x - 2.25 * closeFrameScale,
          genie.position.y + 0.75 * Math.min(closeFrameScale, 1.2),
          genie.position.z + 2.85 * closeFrameScale,
        ),
        finalCameraPosition,
      ]

      lookBezier = [
        activeLookTarget.clone(),
        new THREE.Vector3(bodyTarget.x - 0.55, floorY + 0.82, bodyTarget.z - 1.05),
        bodyTarget.clone().add(new THREE.Vector3(0.12, 0.42, 0.05)),
        finalLookTarget,
      ]
    }

    const onPointerMove = (event: PointerEvent) => {
      canvas.style.cursor = isPointerOnGenie(event) ? 'pointer' : 'default'
    }

    const onPointerLeave = () => {
      canvas.style.cursor = 'default'
    }

    const onPointerDown = (event: PointerEvent) => {
      if (isPointerOnGenie(event)) beginCinematic()
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('pointerdown', onPointerDown)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      if (!cinematicActive && !cinematicComplete) fitInitialCamera()
      if (sandFloor) sandFloor.scale.setScalar(responsiveFloorSize() / sandFloorMaxDim)
      if (genie) {
        const scale = responsiveGenieSize() / genieMaxDim
        genie.scale.setScalar(scale)
        genie.position.y = floorY + genieModelHeight * scale * 0.5 + genieRideHeight
      }
    }
    window.addEventListener('resize', onResize)

    let tick = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick++
      const t = tick * 0.01

      if (sandFloor) {
        sandFloor.rotation.y = -Math.PI / 10 + Math.sin(t * 0.08) * 0.018
      }

      if (genie) {
        const scale = currentGenieScale()
        genie.position.x = GENIE_BASE_X + Math.sin(t * 0.14) * 0.045
        genie.position.z = GENIE_BASE_Z + Math.sin(t * 0.1 + 1.3) * 0.035
        genie.position.y = floorY + genieModelHeight * scale * 0.5 + genieRideHeight + Math.sin(t * 0.48) * 0.018
        genie.rotation.y = Math.PI / 5 + Math.sin(t * 0.18) * 0.035
        genie.rotation.z = Math.sin(t * 0.16) * 0.008
        genieLight.position.set(genie.position.x, genie.position.y + 0.45, genie.position.z + 1.25)
      }

      if (cinematicActive && cameraBezier && lookBezier) {
        const progress = THREE.MathUtils.clamp((performance.now() - cinematicStart) / CINEMATIC_DURATION, 0, 1)
        const eased = easeInOutCubic(progress)
        camera.position.copy(cubicBezier(...cameraBezier, eased))
        activeLookTarget.copy(cubicBezier(...lookBezier, eased))
        camera.lookAt(activeLookTarget)

        if (progress >= 1) {
          cinematicActive = false
          cinematicComplete = true
        }
      } else if (cinematicComplete) {
        activeLookTarget.lerp(getGenieHeadTarget(), 0.045)
        camera.lookAt(activeLookTarget)
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('pointerdown', onPointerDown)
      dracoLoader.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      className="w-dvw h-dvh relative overflow-hidden transition-opacity duration-700"
      style={{ width: '100dvw', height: '100dvh', background: '#0c0c0c', opacity: show ? 1 : 0 }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <VortexBackground
          className="w-full h-full"
          hues={SAND_VORTEX_HUES}
          particleMultiplier={1.9}
          speedMultiplier={1.55}
          alphaMultiplier={1.45}
          saturation={48}
          lightness={54}
          backgroundFill="rgba(12, 12, 12, 0.28)"
          wind={92}
        />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />

      <div
        className="absolute left-1/2 -translate-x-1/2 text-center text-[0.6rem] sm:text-xs tracking-widest pointer-events-none"
        style={{
          bottom: 'max(22px, 6dvh)',
          width: 'min(38rem, calc(100vw - 32px))',
          color: '#303030',
          fontFamily: 'var(--font-geist-mono)',
          zIndex: 9,
        }}
      >
        → CLICK_GENIE // CINEMATIC_FACE_SCAN
      </div>
    </div>
  )
}

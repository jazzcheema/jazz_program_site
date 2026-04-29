'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

interface CarpetSceneProps {
  onCarpetClick?: () => void
  onReachClouds: () => void
}

// Desktop target; the live position is clamped to the camera's visible area.
const DESKTOP_CLOUD_POS = new THREE.Vector3(3.0, 1.6, 0)
const REACH_DIST = 1.3

export default function CarpetScene({ onCarpetClick, onReachClouds }: CarpetSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onReachRef = useRef(onReachClouds)
  const onClickRef = useRef(onCarpetClick)

  useEffect(() => {
    onReachRef.current = onReachClouds
    onClickRef.current = onCarpetClick
  }, [onCarpetClick, onReachClouds])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0c0c0c')
    scene.fog = new THREE.Fog('#0c0c0c', 14, 32)

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 6)

    const visibleWorldSize = () => {
      const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * camera.position.z
      return { width: height * camera.aspect, height }
    }

    const responsiveCloudPos = () => {
      const visible = visibleWorldSize()
      return new THREE.Vector3(
        THREE.MathUtils.clamp(visible.width / 2 - 0.55, 0.85, DESKTOP_CLOUD_POS.x),
        THREE.MathUtils.clamp(visible.height / 2 - 0.85, 0.95, DESKTOP_CLOUD_POS.y),
        0,
      )
    }

    const responsiveModelSize = (desktopSize: number, mobileWidthFactor: number) => {
      const visible = visibleWorldSize()
      return Math.min(desktopSize, Math.max(desktopSize * 0.58, visible.width * mobileWidthFactor))
    }

    let cloudPos = responsiveCloudPos()

    // All lights start at 0 and ramp up cinematically
    const ambient = new THREE.AmbientLight('#ffffff', 0)
    scene.add(ambient)
    const key = new THREE.DirectionalLight('#ffffff', 0)
    key.position.set(2, 4, 3)
    scene.add(key)
    const rim = new THREE.PointLight('#0055ff', 0, 15)
    rim.position.set(-3, 2, -2)
    scene.add(rim)
    const cloudLight = new THREE.PointLight('#8899ff', 0, 8)
    cloudLight.position.copy(cloudPos).add(new THREE.Vector3(0, 1, 2))
    scene.add(cloudLight)

    const LIGHT_TARGETS = { ambient: 0.4, key: 1.5, rim: 2.5, cloud: 2.0 }
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
    let carpetBaseScale = 1
    let carpetMaxDim = 1
    let cloudsMaxDim = 1
    let reached = false

    const loader = new GLTFLoader()

    loader.load('/models/carpet.glb', (gltf) => {
      carpet = gltf.scene
      const box = new THREE.Box3().setFromObject(carpet)
      carpet.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      carpetMaxDim = Math.max(size.x, size.y, size.z)
      carpetBaseScale = responsiveModelSize(2.2, 0.62) / carpetMaxDim
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
      clouds.scale.setScalar(responsiveModelSize(1.6, 0.44) / cloudsMaxDim)
      clouds.position.copy(cloudPos)
      scene.add(clouds)
    })

    // Drag state
    let isDragging = false
    let downX = 0, downY = 0
    let holdFrames = 0

    // Carpet world position (smoothed)
    let currX = 0, currY = 0
    let targetX = 0, targetY = 0

    const raycaster = new THREE.Raycaster()

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
      if (moved < 6 && carpet) {
        const ndc = new THREE.Vector2(
          (e.clientX / window.innerWidth) * 2 - 1,
          -(e.clientY / window.innerHeight) * 2 + 1,
        )
        raycaster.setFromCamera(ndc, camera)
        if (raycaster.intersectObject(carpet, true).length > 0) {
          onClickRef.current?.()
        }
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      cloudPos = responsiveCloudPos()
      cloudLight.position.copy(cloudPos).add(new THREE.Vector3(0, 1, 2))
      if (carpet) carpetBaseScale = responsiveModelSize(2.2, 0.62) / carpetMaxDim
      if (clouds) clouds.scale.setScalar(responsiveModelSize(1.6, 0.44) / cloudsMaxDim)
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

        // Shrink as it moves from center — feels like it's flying into distance
        const dist = Math.hypot(currX, currY)
        carpet.scale.setScalar(carpetBaseScale * Math.max(0.42, 1 - dist * 0.09))

        // Proximity check
        const cPos = new THREE.Vector3(carpet.position.x, carpet.position.y, 0)
        if (cPos.distanceTo(cloudPos) < REACH_DIST) {
          reached = true
          onReachRef.current()
        }
      }

      // Clouds: gentle independent bob
      if (clouds) {
        clouds.position.y = cloudPos.y + Math.sin(t * 0.8) * 0.055
        clouds.position.x = cloudPos.x + Math.sin(t * 0.4) * 0.02
        clouds.rotation.y = Math.sin(t * 0.3) * 0.04
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

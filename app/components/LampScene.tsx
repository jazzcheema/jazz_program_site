'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

interface LampSceneProps {
  modelPath: string
  onLampClick?: () => void
}

export default function LampScene({ modelPath, onLampClick }: LampSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const onLampClickRef = useRef(onLampClick)

  useEffect(() => {
    onLampClickRef.current = onLampClick
  }, [onLampClick])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.shadowMap.enabled = true

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#050510')
    scene.fog = new THREE.Fog('#050510', 12, 30)

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 6)

    const ambient = new THREE.AmbientLight('#ffffff', 0.4)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.5)
    keyLight.position.set(2, 4, 3)
    scene.add(keyLight)

    const rimLight = new THREE.PointLight('#0055ff', 2.5, 15)
    rimLight.position.set(-3, 2, -2)
    scene.add(rimLight)

    let model: THREE.Group | null = null
    const loader = new GLTFLoader()

    loader.load(modelPath, (gltf) => {
      model = gltf.scene

      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      model.position.sub(center)

      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      model.scale.setScalar(2.5 / maxDim)

      scene.add(model)
    })

    const raycaster = new THREE.Raycaster()

    // Drag-to-spin
    let isDragging = false
    let prevX = 0
    let prevY = 0
    let downX = 0
    let downY = 0
    let velX = 0
    let velY = 0
    let rotY = Math.PI / 4
    let dragRotX = 0

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true
      prevX = e.clientX
      prevY = e.clientY
      downX = e.clientX
      downY = e.clientY
      velX = 0
      velY = 0
      canvas.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevX
      const dy = e.clientY - prevY
      velX = dx * 0.008
      velY = dy * 0.004
      rotY += velX
      dragRotX = Math.max(-0.35, Math.min(0.35, dragRotX + velY))
      prevX = e.clientX
      prevY = e.clientY
    }

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false
      const totalDist = Math.hypot(e.clientX - downX, e.clientY - downY)
      if (totalDist < 6 && model) {
        const ndc = new THREE.Vector2(
          (e.clientX / window.innerWidth) * 2 - 1,
          -(e.clientY / window.innerHeight) * 2 + 1,
        )
        raycaster.setFromCamera(ndc, camera)
        if (raycaster.intersectObject(model, true).length > 0) {
          onLampClickRef.current?.()
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
    }
    window.addEventListener('resize', onResize)

    let tick = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick++

      if (model) {
        const t = tick * 0.012
        model.position.y = Math.sin(t) * 0.12

        if (!isDragging) {
          velX *= 0.94
          velY *= 0.94
          dragRotX *= 0.97
        }
        rotY += isDragging ? 0 : velX
        model.rotation.y = rotY
        model.rotation.x = Math.sin(t * 0.7 + 0.5) * 0.04 + dragRotX
        model.rotation.z = Math.sin(t * 0.5 + 1.2) * 0.03
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
  }, [modelPath])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    />
  )
}

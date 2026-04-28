'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const SIZE = 92

export default function LampCorner() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(SIZE, SIZE)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(0, 0, 4.2)

    scene.add(new THREE.AmbientLight('#ffffff', 0.45))
    const key = new THREE.DirectionalLight('#ffffff', 1.6)
    key.position.set(2, 4, 3)
    scene.add(key)
    const rim = new THREE.PointLight('#3a3a3a', 1.8, 15)
    rim.position.set(-3, 2, -2)
    scene.add(rim)

    let lamp: THREE.Group | null = null

    new GLTFLoader().load('/models/lamp2.glb', (gltf) => {
      lamp = gltf.scene
      const box = new THREE.Box3().setFromObject(lamp)
      lamp.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      lamp.scale.setScalar(2.45 / Math.max(size.x, size.y, size.z))
      lamp.rotation.y = Math.PI / 4
      scene.add(lamp)
    })

    let tick = 0
    let animId: number
    let randY = 0
    let randYTarget = 0
    let randTimer = 0

    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick++
      const t = tick * 0.01

      if (lamp) {
        randTimer++
        if (randTimer > 140) {
          randYTarget = (Math.random() - 0.5) * 0.09
          randTimer = 0
        }
        randY += (randYTarget - randY) * 0.018

        lamp.position.y = Math.sin(t * 0.35) * 0.09 + randY
        lamp.rotation.y = Math.PI / 4 + Math.sin(t * 0.18) * 0.1
        lamp.rotation.z = Math.sin(t * 0.13) * 0.025
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
    }
  }, [])

  return (
    <button
      type="button"
      aria-label="Reload site"
      title="RELOAD_SITE"
      onClick={() => window.location.reload()}
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        width: SIZE,
        height: SIZE,
        zIndex: 200,
        cursor: 'pointer',
        padding: 0,
        border: 0,
        background: 'transparent',
        outlineOffset: 4,
        touchAction: 'manipulation',
      }}
    >
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        aria-hidden="true"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </button>
  )
}

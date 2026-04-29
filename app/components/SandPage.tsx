'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import VortexBackground from './VortexBackground'

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

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.setClearColor(0x0c0c0c, 0)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#0c0c0c', 10, 28)

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0.2, 6)

    const visibleWorldSize = () => {
      const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * camera.position.z
      return { width: height * camera.aspect, height }
    }

    const responsiveModelSize = () => {
      const visible = visibleWorldSize()
      return Math.min(3.0, Math.max(1.55, visible.width * 0.48))
    }

    scene.add(new THREE.AmbientLight('#ffffff', 0.34))
    const key = new THREE.DirectionalLight('#ffffff', 1.45)
    key.position.set(2, 4, 3)
    scene.add(key)
    const warm = new THREE.PointLight('#c87820', 1.65, 12)
    warm.position.set(-2.2, 1.2, 2.2)
    scene.add(warm)
    const field = new THREE.PointLight('#249958', 0.42, 9)
    field.position.set(2.5, -1.2, 2.5)
    scene.add(field)

    let sandcastle: THREE.Group | null = null
    let sandcastleMaxDim = 1

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/gltf/')

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    loader.load('/models/sandcastle.glb', (gltf) => {
      sandcastle = gltf.scene
      const box = new THREE.Box3().setFromObject(sandcastle)
      sandcastle.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      sandcastleMaxDim = Math.max(size.x, size.y, size.z)
      sandcastle.scale.setScalar(responsiveModelSize() / sandcastleMaxDim)
      sandcastle.rotation.y = -Math.PI / 6
      sandcastle.position.y = -0.16
      scene.add(sandcastle)
    })

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      if (sandcastle) sandcastle.scale.setScalar(responsiveModelSize() / sandcastleMaxDim)
    }
    window.addEventListener('resize', onResize)

    let tick = 0
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick++
      const t = tick * 0.01

      if (sandcastle) {
        sandcastle.position.y = -0.16 + Math.sin(t * 0.55) * 0.045
        sandcastle.rotation.y = -Math.PI / 6 + Math.sin(t * 0.22) * 0.055
        sandcastle.rotation.z = Math.sin(t * 0.18) * 0.012
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
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
        <VortexBackground className="w-full h-full" />
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
        → SANDCASTLE_NODE // ABOUT_CONTACT_PAGE_PENDING
      </div>
    </div>
  )
}

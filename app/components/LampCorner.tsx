'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getAudioFreqs } from '../lib/audioAnalyser'

const SIZE = 92
const CSS_SIZE = 'clamp(64px, 17vw, 92px)'

export default function LampCorner() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hiddenForCV, setHiddenForCV] = useState(false)
  const bfgActiveRef = useRef(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handler = (e: Event) => setHiddenForCV((e as CustomEvent<boolean>).detail)
    window.addEventListener('cv-page-active', handler)
    return () => window.removeEventListener('cv-page-active', handler)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => { bfgActiveRef.current = (e as CustomEvent<boolean>).detail }
    window.addEventListener('bfg-active', handler)
    return () => window.removeEventListener('bfg-active', handler)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = 'ontouchstart' in window
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
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
    let lampCloudGeo: THREE.BufferGeometry | null = null
    let lampCloudMat: THREE.PointsMaterial | null = null
    let lampCloudBase: Float32Array | null = null
    let lampCloudPhases: Float32Array | null = null
    let lampCloud: THREE.Points | null = null

    new GLTFLoader().load('/models/lamp2.glb', (gltf) => {
      lamp = gltf.scene
      const box = new THREE.Box3().setFromObject(lamp)
      lamp.position.sub(box.getCenter(new THREE.Vector3()))
      const size = box.getSize(new THREE.Vector3())
      lamp.scale.setScalar(2.45 / Math.max(size.x, size.y, size.z))
      lamp.rotation.y = Math.PI / 4
      scene.add(lamp)

      // Sample vertices for point cloud overlay
      lamp.updateMatrixWorld(true)
      const inv = new THREE.Matrix4().copy(lamp.matrixWorld).invert()
      const verts: number[] = []
      lamp.traverse((child) => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        const posAttr = mesh.geometry.attributes.position
        if (!posAttr) return
        mesh.updateWorldMatrix(true, false)
        const toLocal = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld)
        for (let i = 0; i < posAttr.count; i += 2) {
          const v = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(toLocal)
          verts.push(v.x, v.y, v.z)
        }
      })
      lampCloudBase = new Float32Array(verts)
      lampCloudPhases = new Float32Array(lampCloudBase.length / 3).map(() => Math.random() * Math.PI * 2)
      lampCloudGeo = new THREE.BufferGeometry()
      lampCloudGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
      lampCloudMat = new THREE.PointsMaterial({ color: 0x44ffaa, size: 0.05, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      lampCloud = new THREE.Points(lampCloudGeo, lampCloudMat)
      lampCloud.visible = false
      lamp.add(lampCloud)
    })

    let tick = 0
    let animId: number
    let randY = 0
    let randYTarget = 0
    let randTimer = 0
    let bfgLevel = 0

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

        // BFG mode: swap mesh for point cloud, react to audio
        const bfgTarget = bfgActiveRef.current ? 1 : 0
        bfgLevel += (bfgTarget - bfgLevel) * (bfgTarget > bfgLevel ? 0.14 : 0.045)
        if (bfgLevel < 0.001) bfgLevel = 0
        lamp.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (!mesh.isMesh) return
          mesh.visible = bfgLevel < 0.98
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const m of mats) {
            const mat = m as THREE.Material
            if (!mat) continue
            if (!mat.transparent) {
              mat.transparent = true
              mat.needsUpdate = true
            }
            mat.opacity = Math.max(0, Math.min(1, 1 - bfgLevel))
          }
        })
        if (lampCloud) lampCloud.visible = bfgLevel > 0.01
        if (bfgLevel > 0.01 && lampCloudGeo && lampCloudBase && lampCloudPhases && lampCloudMat) {
          const { bass, mid } = getAudioFreqs()
          const cpos = lampCloudGeo.attributes.position as THREE.BufferAttribute
          const scatter = bass * 0.12
          for (let i = 0; i < cpos.count; i++) {
            const bx = lampCloudBase[i * 3], by = lampCloudBase[i * 3 + 1], bz = lampCloudBase[i * 3 + 2]
            const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1
            const s = scatter * (0.5 + 0.5 * Math.sin(t * 80 + lampCloudPhases[i]))
            cpos.setXYZ(i, bx + bx / len * s, by + by / len * s, bz + bz / len * s)
          }
          cpos.needsUpdate = true
          lampCloudMat.opacity = bfgLevel * Math.min(0.85, 0.3 + bass * 0.7 + mid * 0.4)
        }
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
      className="lamp-corner"
      aria-label="Reload site"
      title="RELOAD_SITE"
      onClick={() => pathname === '/' ? window.location.reload() : router.push('/')}
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        width: CSS_SIZE,
        height: CSS_SIZE,
        zIndex: 1100,
        opacity: hiddenForCV ? 0 : 1,
        pointerEvents: hiddenForCV ? 'none' : 'auto',
        transition: 'opacity 180ms ease, transform 160ms ease',
        transformOrigin: 'center',
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
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </button>
  )
}

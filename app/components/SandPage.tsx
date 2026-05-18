"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import GridMouseTrail from "./GridMouseTrail";

const RUBS_NEEDED = 10;
const RUB_STROKE_PX = 180;
const TOTAL_RUB_PX = RUBS_NEEDED * RUB_STROKE_PX;

export default function SandPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [depleted, setDepleted] = useState(false);
  const revealedRef = useRef(false);
  const rubDistRef = useRef(0);
  const rubsRef = useRef(0);
  const shakeProgressRef = useRef(0);
  // 0 = alive, 1 = fully drooped/drained (drives lamp settle animation)
  const depletedProgressRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = "ontouchstart" in window;
    let W = window.innerWidth;
    let H = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.1, 5);

    scene.add(new THREE.AmbientLight("#e9e5e0", 0.55));
    const key = new THREE.DirectionalLight("#ffffff", 1.9);
    key.position.set(2, 5, 3);
    scene.add(key);
    // Warm glow — will drain to 0 after depletion
    const warm = new THREE.PointLight("#c87820", 0.55, 14);
    warm.position.set(-2, -0.4, 2);
    scene.add(warm);

    let lamp: THREE.Group | null = null;

    new GLTFLoader().load("/models/lamp1.glb", (gltf) => {
      lamp = gltf.scene;
      const box = new THREE.Box3().setFromObject(lamp);
      lamp.position.sub(box.getCenter(new THREE.Vector3()));
      const size = box.getSize(new THREE.Vector3());
      lamp.scale.setScalar(2.0 / Math.max(size.x, size.y, size.z));
      scene.add(lamp);
    });

    let mouseX = 0;
    let mouseY = 0;
    let leanX = 0;
    let leanY = 0;
    let lastPX = W / 2;
    let lastPY = H / 2;
    let targetGridX = 0;
    let targetGridY = 0;
    let currentGridX = 0;
    let currentGridY = 0;

    const onPointerMove = (e: PointerEvent) => {
      mouseX = (e.clientX / W - 0.5) * 2;
      mouseY = (e.clientY / H - 0.5) * 2;
      targetGridX = (e.clientX / W - 0.5) * 2;
      targetGridY = (e.clientY / H - 0.5) * 2;

      if (!revealedRef.current) {
        const radius = Math.min(W, H) * 0.22;
        const distFromCenter = Math.hypot(e.clientX - W / 2, e.clientY - H / 2);
        canvas.style.cursor = distFromCenter < radius ? "grab" : "pointer";
        const travel = Math.hypot(e.clientX - lastPX, e.clientY - lastPY);

        if (distFromCenter < radius) {
          rubDistRef.current += travel;
          const totalDist = rubsRef.current * RUB_STROKE_PX + rubDistRef.current;
          shakeProgressRef.current = Math.min(1, totalDist / TOTAL_RUB_PX);

          if (rubDistRef.current >= RUB_STROKE_PX) {
            rubDistRef.current = 0;
            rubsRef.current += 1;
            if (rubsRef.current >= RUBS_NEEDED) {
              revealedRef.current = true;
              setDepleted(true);
              window.location.href = "mailto:thecyberfoolz@gmail.com";
            }
          }
        }
      }

      lastPX = e.clientX;
      lastPY = e.clientY;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let tick = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      tick++;
      const t = tick * 0.012;

      // Grid parallax
      currentGridX += (targetGridX - currentGridX) * 0.04;
      currentGridY += (targetGridY - currentGridY) * 0.04;
      roomRef.current?.style.setProperty("--grid-x", (currentGridX * 24).toFixed(2));
      roomRef.current?.style.setProperty("--grid-y", (currentGridY * 24).toFixed(2));

      // Shake decays after email fires
      if (revealedRef.current && shakeProgressRef.current > 0) {
        shakeProgressRef.current = Math.max(0, shakeProgressRef.current - 0.016);
      }

      // Deplete progress drives the droop & warm light drain
      if (revealedRef.current && depletedProgressRef.current < 1) {
        depletedProgressRef.current = Math.min(1, depletedProgressRef.current + 0.004);
      }

      // Drain warm light
      warm.intensity = 0.55 * (1 - depletedProgressRef.current);

      if (lamp) {
        const d = depletedProgressRef.current;
        // Once depleted, mouse lean fades out
        const leanWeight = 1 - d;
        leanX += (mouseX * 0.15 * leanWeight - leanX) * 0.034;
        leanY += (-mouseY * 0.08 * leanWeight - leanY) * 0.034;

        const p = shakeProgressRef.current;
        const shakeAmp = p * p * 0.26;
        const shakeFreq = 8 + p * 28;
        const shakeY = Math.sin(t * shakeFreq) * shakeAmp;
        const shakeZ = Math.sin(t * shakeFreq * 1.3 + 1.1) * shakeAmp * 0.65;

        // Idle bob fades out as lamp depletes
        const bobAmp = 1 - d;
        const targetRestY = -0.18 * d; // sinks slightly when depleted
        lamp.position.y =
          Math.sin(t * 0.38) * 0.1 * bobAmp +
          Math.sin(t * 0.17) * 0.04 * bobAmp +
          shakeY * 0.3 +
          targetRestY;

        // Lamp tilts onto its side as magic drains
        const restTilt = d * 0.32;
        lamp.rotation.y = Math.PI / 4 + leanX * 0.55 + shakeY;
        lamp.rotation.x = leanY * 0.18 + shakeY * 0.4;
        lamp.rotation.z = -leanX * 0.06 + shakeZ + restTilt;
      }

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, []);

  return (
    <main
      ref={roomRef}
      className="sand-kingdom-room"
      style={{ opacity: show ? 1 : 0 }}
    >
      <div className="sand-kingdom-grid" aria-hidden="true" />
      <GridMouseTrail />
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          touchAction: "none",
          cursor: "pointer",
          filter: depleted ? "grayscale(1) brightness(0.8)" : "none",
          transition: "filter 3s ease",
        }}
      />
    </main>
  );
}

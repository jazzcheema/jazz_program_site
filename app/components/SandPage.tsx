"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import GridMouseTrail from "./GridMouseTrail";

const RUBS_NEEDED = 8;
const RUB_STROKE_PX = 180;
const TOTAL_RUB_PX = RUBS_NEEDED * RUB_STROKE_PX;
const DRIVE_DURATION_SECONDS = 60;
const DRIVE_START_X = -3.4;
const DRIVE_END_X = -1.9;
const DRIVE_END_Z = 15.5;
const LAMP_X = 4.45;
const LAMP_Z = 17.15;
const CLOUD_LIME = "#c6ff00";
type DriveIntroCue = {
  id: number;
  text: string;
  kind: "lock" | "hint" | "count" | "wish";
};

export default function SandPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [show, setShow] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [driveComplete, setDriveComplete] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.58);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [driveIntroCue, setDriveIntroCue] = useState<DriveIntroCue | null>(null);
  const [audioControlOpen, setAudioControlOpen] = useState(false);
  const revealedRef = useRef(false);
  const rubDistRef = useRef(0);
  const rubsRef = useRef(0);
  const shakeProgressRef = useRef(0);
  // 0 = alive, 1 = fully drooped/drained (drives lamp settle animation)
  const depletedProgressRef = useRef(0);
  const driveCompleteRef = useRef(false);
  const driveIntroReadyRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const syncDesktopMode = () => {
      setDesktopMode(!("ontouchstart" in window) && window.innerWidth >= 768);
    };

    syncDesktopMode();
    window.addEventListener("resize", syncDesktopMode);
    return () => window.removeEventListener("resize", syncDesktopMode);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = audioVolume;
  }, [audioVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!desktopMode || !audio) return;

    audio.play()
      .then(() => setAudioPlaying(true))
      .catch(() => setAudioPlaying(false));
  }, [desktopMode]);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play()
        .then(() => setAudioPlaying(true))
        .catch(() => setAudioPlaying(false));
    } else {
      audio.pause();
      setAudioPlaying(false);
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
  };

  const seekAudio = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !audioDuration) return;
    audio.currentTime = value;
    setAudioTime(value);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isDesktop = !("ontouchstart" in window) && window.innerWidth >= 768;
    setDriveComplete(!isDesktop);
    driveCompleteRef.current = !isDesktop;
    driveIntroReadyRef.current = !isDesktop;
    const driveIntroTimers: number[] = [];

    const showDriveIntroCue = (text: string, kind: DriveIntroCue["kind"], id: number) => {
      setDriveIntroCue({ id, text, kind });
    };

    if (isDesktop) {
      driveIntroTimers.push(
        window.setTimeout(() => showDriveIntroCue("driving unlocks in 15", "lock", 0), 0),
        window.setTimeout(() => showDriveIntroCue("driving unlocks in 14", "lock", 0), 1000),
        window.setTimeout(() => showDriveIntroCue("driving unlocks in 13", "lock", 0), 2000),
        window.setTimeout(() => showDriveIntroCue("driving unlocks in 12", "lock", 0), 3000),
        window.setTimeout(() => showDriveIntroCue("drive with W or ↑", "hint", 3), 5000),
        window.setTimeout(() => showDriveIntroCue("get ready", "count", 4), 9000),
        window.setTimeout(() => showDriveIntroCue("set", "count", 5), 12000),
        window.setTimeout(() => {
          driveIntroReadyRef.current = true;
          setAudioControlOpen(true);
          showDriveIntroCue("go!!", "count", 6);
        }, 15000),
        window.setTimeout(() => {
          setDriveIntroCue(null);
        }, 17800),
      );
    }

    const tryStartAudio = () => {
      if (!isDesktop) return;
      const audio = audioRef.current;
      if (!audio || !audio.paused) return;
      audio.play()
        .then(() => setAudioPlaying(true))
        .catch(() => {});
    };

    const isMobile = !isDesktop;
    let W = window.innerWidth;
    let H = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDesktop ? 1.18 : 1.1;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(isDesktop ? DRIVE_START_X - 4.7 : 0, isDesktop ? 1.15 : 0.1, isDesktop ? -0.3 : 5);

    const ambient = new THREE.AmbientLight("#e9e5e0", isDesktop ? 0.4 : 0.55);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(isDesktop ? "#ffd7a0" : "#ffffff", isDesktop ? 1.45 : 1.9);
    key.position.set(2, 5, 3);
    scene.add(key);
    const sunsetRear = new THREE.DirectionalLight("#ff9a3d", isDesktop ? 0.95 : 0);
    sunsetRear.position.set(-4.5, 2.8, -5.5);
    scene.add(sunsetRear);
    // Warm glow — will drain to 0 after depletion
    const warm = new THREE.PointLight("#c87820", 0.55, 14);
    warm.position.set(-2, -0.4, 2);
    scene.add(warm);
    // Lamp approach glow — brightens as car nears the lamp, positioned AT the lamp
    const lampGlowLight = new THREE.PointLight("#ffb84a", 0, 9);
    lampGlowLight.position.set(LAMP_X, 1.4, LAMP_Z);
    scene.add(lampGlowLight);
    const carRim = new THREE.PointLight(CLOUD_LIME, isDesktop ? 0.36 : 0, 16);
    carRim.position.set(2.4, 2.2, -2.4);
    scene.add(carRim);
    const streetWarm = new THREE.PointLight("#ffb24a", isDesktop ? 1.8 : 0, 12);
    streetWarm.position.set(-2.4, 4.8, 0);
    scene.add(streetWarm);
    const streetAmber = new THREE.PointLight("#ffd36b", isDesktop ? 1.25 : 0, 10);
    streetAmber.position.set(1.8, 4.2, 3);
    scene.add(streetAmber);
    const streetRose = new THREE.PointLight("#ff7a42", isDesktop ? 0.75 : 0, 12);
    streetRose.position.set(4, 3.2, 7);
    scene.add(streetRose);
    const overheadA = new THREE.SpotLight("#fff0b8", isDesktop ? 0 : 0, 7.5, 0.62, 0.84, 1.35);
    overheadA.position.set(-1.5, 5.2, 0);
    scene.add(overheadA);
    scene.add(overheadA.target);
    const overheadB = new THREE.SpotLight("#ffd06a", isDesktop ? 0 : 0, 7, 0.54, 0.86, 1.35);
    overheadB.position.set(1.4, 4.8, 2);
    scene.add(overheadB);
    scene.add(overheadB.target);
    const overheadC = new THREE.SpotLight("#ffe6a4", isDesktop ? 0 : 0, 6.6, 0.5, 0.9, 1.2);
    overheadC.position.set(0.2, 4.5, -2);
    scene.add(overheadC);
    scene.add(overheadC.target);
    const overheadD = new THREE.SpotLight("#ffc870", isDesktop ? 0 : 0, 7.2, 0.52, 0.88, 1.25);
    overheadD.position.set(-0.5, 5.0, 1);
    scene.add(overheadD);
    scene.add(overheadD.target);
    const passingCabin = new THREE.PointLight("#ffd18a", 0, 9);
    passingCabin.position.set(DRIVE_START_X - 0.8, 1.2, 0);
    scene.add(passingCabin);
    const passingBlue = new THREE.PointLight("#9fbfff", 0, 10);
    passingBlue.position.set(DRIVE_START_X + 1.4, 1.5, -1);
    scene.add(passingBlue);
    const passingRose = new THREE.PointLight("#ff6a3d", 0, 8);
    passingRose.position.set(DRIVE_START_X - 2.0, 1.0, 1.2);
    scene.add(passingRose);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/gltf/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    let lamp: THREE.Group | null = null;
    let car: THREE.Group | null = null;
    let carBaseY = 0;
    let carMaxDim = 1;
    let lampBaseY = 0;
    let lampRadiusPx = Math.min(W, H) * 0.22;
    const driveKeys = new Set<string>();
    let hasDriven = false;
    let driveMood = 0;
    let driveProgress = 0;
    let driveVelocity = 0;
    let lastTime = performance.now();
    const tmpTarget = new THREE.Vector3();
    const tmpCamera = new THREE.Vector3();
    const tmpLampScreen = new THREE.Vector3();
    const tmpLampWorld = new THREE.Vector3();

    const fitModel = (model: THREE.Group, targetSize: number) => {
      const box = new THREE.Box3().setFromObject(model);
      model.position.sub(box.getCenter(new THREE.Vector3()));
      const size = box.getSize(new THREE.Vector3());
      return targetSize / Math.max(size.x, size.y, size.z);
    };

    loader.load("/models/lamp1.glb", (gltf) => {
      lamp = gltf.scene;
      lamp.scale.setScalar(fitModel(lamp, isDesktop ? 5.75 : 2.0));
      lamp.position.set(isDesktop ? LAMP_X : 0, isDesktop ? 0.18 : 0, isDesktop ? LAMP_Z : 0);
      lampBaseY = lamp.position.y;
      scene.add(lamp);
    });

    if (isDesktop) {
      loader.load("/models/yellow_fat.glb", (gltf) => {
        car = gltf.scene;
        carMaxDim = fitModel(car, 2.45);
        car.scale.setScalar(carMaxDim);
        car.rotation.y = Math.PI / 2;
        car.position.set(DRIVE_START_X, -0.18, 0);
        carBaseY = car.position.y;
        scene.add(car);
      });
    }

    let grayscaleProgress = 0;

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

    const updateLampRub = (clientX: number, clientY: number, travel: number) => {
      if (!lamp || revealedRef.current || (isDesktop && !driveCompleteRef.current)) return;

      let centerX = W / 2;
      let centerY = H / 2;
      let radius = Math.min(W, H) * 0.22;

      if (isDesktop) {
        lamp.getWorldPosition(tmpLampWorld);
        tmpLampScreen.copy(tmpLampWorld).project(camera);
        centerX = (tmpLampScreen.x * 0.5 + 0.5) * W;
        centerY = (-tmpLampScreen.y * 0.5 + 0.5) * H;
        radius = lampRadiusPx;
      }

      const distFromLamp = Math.hypot(clientX - centerX, clientY - centerY);
      canvas.style.cursor = distFromLamp < radius ? "grab" : isDesktop ? "default" : "pointer";

      if (distFromLamp < radius) {
        rubDistRef.current += travel;
        const totalDist = rubsRef.current * RUB_STROKE_PX + rubDistRef.current;
        shakeProgressRef.current = Math.min(1, totalDist / TOTAL_RUB_PX);

        if (rubDistRef.current >= RUB_STROKE_PX) {
          rubDistRef.current = 0;
          rubsRef.current += 1;
          if (rubsRef.current >= RUBS_NEEDED) {
            revealedRef.current = true;
            window.location.href = "mailto:thecyberfoolz@gmail.com";
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      mouseX = (e.clientX / W - 0.5) * 2;
      mouseY = (e.clientY / H - 0.5) * 2;
      targetGridX = (e.clientX / W - 0.5) * 2;
      targetGridY = (e.clientY / H - 0.5) * 2;
      const travel = Math.hypot(e.clientX - lastPX, e.clientY - lastPY);

      updateLampRub(e.clientX, e.clientY, travel);

      lastPX = e.clientX;
      lastPY = e.clientY;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        driveKeys.add("forward");
        if (driveIntroReadyRef.current) {
          hasDriven = true;
        }
        tryStartAudio();
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        driveKeys.delete("forward");
        e.preventDefault();
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let tick = 0;
    let animId: number;
    let dollyActive = false;
    let dollyProgress = 0;
    const dollyDir = new THREE.Vector3();
    let wishTriggered = false;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      tick++;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
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

      if (isDesktop) {
        const driving = driveIntroReadyRef.current && driveKeys.has("forward") && driveProgress < 1 && !revealedRef.current;
        if (driving) {
          hasDriven = true;
        }
        driveMood += ((hasDriven ? 1 : 0) - driveMood) * 0.018;
        const nightPulse = (Math.sin(t * 0.15 + driveProgress * 1.2) + 1) * 0.5;
        const windDrag = Math.sin(t * 1.1 + driveProgress * 18) * 0.07 + Math.sin(t * 0.37 + 2.1) * 0.035;
        const targetVelocity = driving ? (1 / DRIVE_DURATION_SECONDS) * (1 + windDrag) : 0;
        driveVelocity += (targetVelocity - driveVelocity) * (driving ? 0.025 : 0.04);
        driveProgress = Math.min(1, driveProgress + driveVelocity * dt);

        if (driveProgress >= 1 && !driveCompleteRef.current) {
          driveCompleteRef.current = true;
          driveVelocity = 0;
          setDriveComplete(true);
        }

        const p = driveProgress;
        const roadSway =
          Math.sin(t * 0.72 + p * 16) * 0.32 +
          Math.sin(t * 1.37 + p * 7.4) * 0.12;
        const driveZ = THREE.MathUtils.lerp(0, DRIVE_END_Z, p);
        const driveX = THREE.MathUtils.lerp(DRIVE_START_X, DRIVE_END_X, p);
        const speedBlend = THREE.MathUtils.clamp(driveVelocity * DRIVE_DURATION_SECONDS, 0, 1);
        const topBlend = THREE.MathUtils.smoothstep(p, 0.08, 0.36);
        const finalBlend = THREE.MathUtils.smoothstep(p, 0.52, 1);

        const topDrive = topBlend * (1 - finalBlend);
        const lateLightBlend = THREE.MathUtils.smoothstep(p, 0.20, 0.42);
        const earlyLightTravel = p * 44 + t * (0.38 + speedBlend * 0.24);
        const lateLightTravel = p * 22 + t * (0.16 + speedBlend * 0.08);
        const lateLightPulse = (phase: number, sharpness = 3.8) =>
          Math.pow(Math.max(0, Math.sin((lateLightTravel + phase) * Math.PI)), sharpness);
        const earlyPassA = Math.max(0, Math.sin(earlyLightTravel * Math.PI));
        const earlyPassB = Math.max(0, Math.sin((earlyLightTravel + 0.26) * Math.PI));
        const earlyPassC = Math.max(0, Math.sin((earlyLightTravel + 0.52) * Math.PI));
        const earlyPassD = Math.max(0, Math.sin((earlyLightTravel + 0.78) * Math.PI));
        const passA = THREE.MathUtils.lerp(earlyPassA, lateLightPulse(0.04, 4.4), lateLightBlend);
        const passB = THREE.MathUtils.lerp(earlyPassB, lateLightPulse(0.34, 3.8), lateLightBlend);
        const passC = THREE.MathUtils.lerp(earlyPassC, lateLightPulse(0.62, 4.1), lateLightBlend);
        const passD = THREE.MathUtils.lerp(earlyPassD, lateLightPulse(0.88, 4.8), lateLightBlend);
        const broadPass = Math.max(passA, passB * 0.72, passC * 0.58, passD * 0.46) * topDrive * driveMood * lateLightBlend;
        const warmFlash = (passA * 0.95 + passD * 0.45) * topDrive * driveMood * lateLightBlend;
        const coolFlash = passB * topDrive * driveMood * lateLightBlend;
        const roseFlash = passC * topDrive * driveMood * lateLightBlend;

        const lampBright = THREE.MathUtils.smoothstep(p, 0.40, 0.95) * driveMood;
        roomRef.current?.style.setProperty("--sand-night-opacity", (driveMood * (0.52 + nightPulse * 0.10) * (1 - lampBright * 0.90)).toFixed(3));
        roomRef.current?.style.setProperty("--sand-night-glow", (driveMood * (0.10 + nightPulse * 0.16) * (1 - lampBright * 0.55) + lampBright * 0.26).toFixed(3));
        roomRef.current?.style.setProperty("--sand-drive-light-opacity", Math.min(0.22, broadPass * 0.32).toFixed(3));
        roomRef.current?.style.setProperty("--sand-drive-light-hot", Math.min(0.14, warmFlash * 0.12).toFixed(3));
        roomRef.current?.style.setProperty("--sand-drive-light-cool", Math.min(0.08, coolFlash * 0.07).toFixed(3));
        roomRef.current?.style.setProperty("--sand-drive-light-rose", Math.min(0.10, roseFlash * 0.08).toFixed(3));
        roomRef.current?.style.setProperty("--sand-drive-light-shift", (Math.sin((lateLightTravel + 0.18) * Math.PI) * 12 * lateLightBlend).toFixed(3));

        ambient.intensity = THREE.MathUtils.lerp(0.4, 0.06, driveMood) + lampBright * 0.38 + broadPass * 0.015;
        key.intensity = THREE.MathUtils.lerp(1.45, 0.22, driveMood) + lampBright * 0.80 + broadPass * 0.07;
        warm.intensity = 0.55 * (1 - depletedProgressRef.current) * THREE.MathUtils.lerp(1, 0.24, driveMood);
        lampGlowLight.intensity = lampBright * 1.8 * (1 - depletedProgressRef.current);
        sunsetRear.intensity = 0.95 * (1 - driveMood) + lampBright * 0.38;

        if (p >= 0.85 && !wishTriggered) {
          wishTriggered = true;
          driveCompleteRef.current = true;
          setDriveComplete(true);
          setDriveIntroCue({ id: 5, text: "make a wish", kind: "wish" });
          dollyActive = true;
          driveIntroTimers.push(window.setTimeout(() => setDriveIntroCue(null), 8500));
        }

        if (car) {
          const settle = 1 - finalBlend;
          car.position.x = driveX + roadSway * (0.26 + speedBlend * 0.45) * settle;
          car.position.y = carBaseY + Math.sin(t * 2.4 + p * 12) * 0.035 * speedBlend * settle;
          car.position.z = driveZ;
          car.rotation.y = Math.PI / 2 + finalBlend * (Math.PI * 0.42) + Math.sin(t * 0.84 + p * 10) * 0.07 * speedBlend * settle;
          car.rotation.x = Math.sin(t * 1.5 + p * 8) * 0.018 * speedBlend * settle;
          car.rotation.z = -Math.sin(t * 1.9 + p * 12) * 0.06 * speedBlend * settle;
        }

        if (lamp) {
          const lampApproach = THREE.MathUtils.smoothstep(p, 0.72, 1);
          const lampBob = Math.sin(t * 0.3) * 0.035 * (1 - depletedProgressRef.current);
          lamp.position.x = LAMP_X + Math.sin(t * 0.2) * 0.08;
          lamp.position.y = lampBaseY + lampBob;
          lamp.position.z = LAMP_Z;
          lamp.rotation.y = -Math.PI / 36 + Math.sin(t * 0.14) * 0.03;
          lamp.rotation.x = -0.03 + lampApproach * 0.08;
        }

        const carX = car?.position.x ?? driveX;
        const carY = car?.position.y ?? carBaseY;

        const startOffset = new THREE.Vector3(-4.7, 1.15, -0.3);
        const topOffset = new THREE.Vector3(-0.2, 7.6, -0.55);
        const finalOffset = new THREE.Vector3(-2.8, 0.2, 3.2);
        tmpCamera.copy(startOffset).lerp(topOffset, topBlend).lerp(finalOffset, finalBlend);
        tmpCamera.x += Math.sin(t * 0.42 + p * 4) * 0.16;
        tmpCamera.z += Math.sin(t * 0.31 + p * 6) * 0.2;

        const targetZ = THREE.MathUtils.lerp(driveZ, LAMP_Z - 0.55, finalBlend * 0.76);
        tmpTarget.set(
          THREE.MathUtils.lerp(carX + 0.35, LAMP_X - 1.8, finalBlend * 0.92),
          THREE.MathUtils.lerp(carY + 0.28, -0.25, finalBlend),
          THREE.MathUtils.lerp(targetZ, LAMP_Z - 0.5, finalBlend * 0.80),
        );
        const desiredCamera = new THREE.Vector3(carX + tmpCamera.x, carY + tmpCamera.y, driveZ + tmpCamera.z);
        if (dollyActive && !revealedRef.current) {
          dollyProgress = Math.min(1.0, dollyProgress + dt * 0.10);
        }
        if (dollyActive) {
          const eased = THREE.MathUtils.smoothstep(dollyProgress, 0, 1);
          // LookAt transitions slowly over first 60% of dolly — no snap
          const dollyLook = THREE.MathUtils.smoothstep(dollyProgress, 0, 0.6);
          tmpTarget.x = THREE.MathUtils.lerp(tmpTarget.x, LAMP_X - 0.3 + Math.sin(t * 0.41) * 0.03 * eased, dollyLook);
          tmpTarget.y = THREE.MathUtils.lerp(tmpTarget.y, 0.75 + Math.sin(t * 0.29 + 1.5) * 0.02 * eased, dollyLook);
          tmpTarget.z = THREE.MathUtils.lerp(tmpTarget.z, LAMP_Z - 0.4, dollyLook);

          if (!revealedRef.current) {
            dollyDir.set(LAMP_X - desiredCamera.x, 0.35, LAMP_Z - desiredCamera.z).normalize();
            desiredCamera.addScaledVector(dollyDir, eased * 2.5);
            // Organic float — layered slow wobble grows in with eased so it doesn't snap at joint
            desiredCamera.x += Math.sin(t * 0.53 + 1.2) * 0.13 * eased;
            desiredCamera.y += Math.sin(t * 0.37 + 2.6) * 0.08 * eased;
            desiredCamera.z += Math.sin(t * 0.28 + 0.7) * 0.07 * eased;
          }
        }
        // LerpRate transitions smoothly from drive rate → float rate over first 25% of dolly
        const lerpRate = dollyActive
          ? THREE.MathUtils.lerp(0.034, 0.012, THREE.MathUtils.smoothstep(dollyProgress, 0, 0.25))
          : 0.034;
        camera.position.lerp(desiredCamera, lerpRate);
        camera.lookAt(tmpTarget);
        // Subtle roll after lookAt — handheld/mounted feel, fades out at lamp
        camera.rotateZ(driveMood * 0.007 * Math.sin(t * 0.11 + driveProgress * 1.4) * (1 - finalBlend));
        camera.fov = THREE.MathUtils.lerp(camera.fov, THREE.MathUtils.lerp(39, 47, topBlend * (1 - finalBlend)) + finalBlend * 8, 0.02);
        camera.updateProjectionMatrix();

        const sweep = (phase: number, length: number) => ((p * length + phase) % 1 - 0.5) * 8;
        const streetWarmSweep = THREE.MathUtils.lerp(sweep(0.08, 9), sweep(0.08, 6), lateLightBlend);
        const streetAmberSweep = THREE.MathUtils.lerp(sweep(0.42, 7), sweep(0.42, 5), lateLightBlend);
        const streetRoseSweep = THREE.MathUtils.lerp(sweep(0.72, 5), sweep(0.72, 4), lateLightBlend);
        streetWarm.position.set(carX + streetWarmSweep, THREE.MathUtils.lerp(4.8, 4.9, lateLightBlend), THREE.MathUtils.lerp(driveZ + 0.2, driveZ + 0.15, lateLightBlend));
        streetAmber.position.set(carX + streetAmberSweep, THREE.MathUtils.lerp(4.25, 4.35, lateLightBlend), driveZ + 1.7);
        streetRose.position.set(carX + streetRoseSweep, THREE.MathUtils.lerp(3.65, 3.75, lateLightBlend), driveZ - 1.8);
        streetWarm.intensity = THREE.MathUtils.lerp(
          driveMood * (0.14 + earlyPassA * (2.6 + topDrive * 2.4)),
          driveMood * topDrive * (0.04 + passA * (2.0 + speedBlend * 0.8)),
          lateLightBlend,
        );
        streetAmber.intensity = THREE.MathUtils.lerp(
          driveMood * (0.10 + earlyPassB * (2.0 + topDrive * 2.1)),
          driveMood * topDrive * (0.03 + passB * (1.6 + speedBlend * 0.65)),
          lateLightBlend,
        );
        streetRose.intensity = THREE.MathUtils.lerp(
          driveMood * (0.06 + earlyPassC * (1.4 + topDrive * 1.6)),
          driveMood * topDrive * (0.02 + passC * (1.25 + speedBlend * 0.5)),
          lateLightBlend,
        );
        overheadA.position.set(carX + sweep(0.02, 10), 5.15, driveZ + 0.1);
        overheadA.target.position.set(carX, carY + 0.06, driveZ);
        overheadA.intensity = THREE.MathUtils.lerp(
          driveMood * topDrive * (0.5 + earlyPassA * 6.2),
          driveMood * topDrive * (0.05 + passA * 4.2),
          lateLightBlend,
        );
        overheadB.position.set(carX + sweep(0.36, 9), 4.8, driveZ + 0.65);
        overheadB.target.position.set(carX + 0.08, carY + 0.04, driveZ);
        overheadB.intensity = THREE.MathUtils.lerp(
          driveMood * topDrive * (0.38 + earlyPassB * 5.4),
          driveMood * topDrive * (0.04 + passB * 3.4),
          lateLightBlend,
        );
        overheadC.position.set(carX + sweep(0.7, 7), 4.55, driveZ - 0.65);
        overheadC.target.position.set(carX - 0.06, carY + 0.04, driveZ);
        overheadC.intensity = THREE.MathUtils.lerp(
          driveMood * topDrive * (0.28 + earlyPassC * 4.6),
          driveMood * topDrive * (0.035 + passC * 2.8),
          lateLightBlend,
        );
        overheadD.position.set(carX + sweep(0.14, 8), 4.9, driveZ + 1.8);
        overheadD.target.position.set(carX + 0.04, carY + 0.05, driveZ);
        overheadD.intensity = THREE.MathUtils.lerp(
          driveMood * topDrive * (0.22 + earlyPassD * 3.8),
          driveMood * topDrive * (0.025 + passD * 2.35),
          lateLightBlend,
        );
        passingCabin.position.set(carX - 0.5 + sweep(0.2, 5) * 0.18, carY + 1.15, driveZ - 0.35);
        passingCabin.intensity = warmFlash * (0.75 + speedBlend * 0.35);
        passingBlue.position.set(carX + 1.35 + sweep(0.52, 4) * 0.12, carY + 1.45, driveZ - 0.9);
        passingBlue.intensity = coolFlash * (0.42 + speedBlend * 0.22);
        passingRose.position.set(carX - 1.8 + sweep(0.82, 4) * 0.16, carY + 0.9, driveZ + 1.1);
        passingRose.intensity = roseFlash * (0.46 + speedBlend * 0.25);
        carRim.position.set(carX - 1.3, 1.8, driveZ - 1.4);
        carRim.intensity = driveMood * (0.12 + 0.22 * (1 - finalBlend)) + broadPass * 0.12;

        if (lamp) {
          lamp.getWorldPosition(tmpLampWorld);
          tmpLampScreen.copy(tmpLampWorld).project(camera);
          const lampScale = THREE.MathUtils.clamp(1 - tmpLampScreen.z, 0.35, 1);
          lampRadiusPx = Math.max(88, Math.min(W, H) * 0.18 * lampScale);
        }

        // Color grade — twilight purple-magenta shift while driving, warm amber burst near lamp
        if (!revealedRef.current && canvasRef.current) {
          const hue = THREE.MathUtils.lerp(0, -22, driveMood) + lampBright * 30;
          const sat = THREE.MathUtils.lerp(1, 1.12, driveMood) + lampBright * 0.35;
          const bri = THREE.MathUtils.lerp(1, 0.84, driveMood) + lampBright * 0.32;
          canvasRef.current.style.filter = driveMood > 0.02
            ? `hue-rotate(${hue.toFixed(1)}deg) saturate(${sat.toFixed(2)}) brightness(${bri.toFixed(2)})`
            : "none";
        }

      }

      if (lamp) {
        const d = depletedProgressRef.current;
        // Once depleted, mouse lean fades out.
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
        if (isDesktop) {
          lamp.position.y += shakeY * 0.3 + targetRestY;
          lamp.rotation.y += leanX * 0.55 + shakeY;
          lamp.rotation.x += leanY * 0.18 + shakeY * 0.4;
          lamp.rotation.z = -leanX * 0.06 + shakeZ + d * 0.32;
        } else {
          lamp.position.y =
            Math.sin(t * 0.38) * 0.1 * bobAmp +
            Math.sin(t * 0.17) * 0.04 * bobAmp +
            shakeY * 0.3 +
            targetRestY;

          // Lamp tilts onto its side as magic drains.
          const restTilt = d * 0.32;
          lamp.rotation.y = Math.PI / 4 + leanX * 0.55 + shakeY;
          lamp.rotation.x = leanY * 0.18 + shakeY * 0.4;
          lamp.rotation.z = -leanX * 0.06 + shakeZ + restTilt;
        }
      }

      renderer.render(scene, camera);

      // Grayscale depletion — lerps in over ~3s after reveal
      if (revealedRef.current && grayscaleProgress < 1 && canvasRef.current) {
        grayscaleProgress = Math.min(1, grayscaleProgress + dt * 0.33);
        canvasRef.current.style.filter = `grayscale(${grayscaleProgress.toFixed(3)}) brightness(${(1 - grayscaleProgress * 0.2).toFixed(3)})`;
      }
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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      driveIntroTimers.forEach((timer) => window.clearTimeout(timer));
      cancelAnimationFrame(animId);
      dracoLoader.dispose();
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
      <div className="sand-night-pulse" aria-hidden="true" />
      <div className="sand-drive-light" aria-hidden="true" />

      <GridMouseTrail />
      {desktopMode && driveIntroCue && (
        <div
          key={driveIntroCue.id}
          className="sand-drive-cue"
          data-kind={driveIntroCue.kind}
          aria-live="polite"
        >
          {driveIntroCue.text}
        </div>
      )}
      {desktopMode && (
        <div
          className="sand-audio-control"
          data-expanded={audioControlOpen ? "true" : "false"}
          data-ready={driveComplete ? "true" : "false"}
        >
          <audio
            ref={audioRef}
            src="/audio/nina.mp3"
            loop
            autoPlay
            onPlay={() => setAudioPlaying(true)}
            onPause={() => setAudioPlaying(false)}
            onTimeUpdate={(event) => setAudioTime(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration)}
          />
          <span className="sand-audio-seal" aria-hidden="true">×</span>
          <div className="sand-audio-strip">
            <button
              className="sand-audio-toggle"
              type="button"
              aria-label={audioPlaying ? "Pause audio" : "Play audio"}
              onClick={toggleAudio}
            >
              <span className={audioPlaying ? "sand-audio-pause-icon" : "sand-audio-play-icon"} aria-hidden="true" />
            </button>
            <span className="sand-audio-time">
              {formatAudioTime(audioTime)} / {formatAudioTime(audioDuration)}
            </span>
            <input
              className="sand-audio-progress"
              type="range"
              min="0"
              max={audioDuration || 0}
              step="0.1"
              value={audioDuration ? Math.min(audioTime, audioDuration) : 0}
              aria-label="Audio position"
              onChange={(event) => seekAudio(Number(event.target.value))}
            />
            <span className="sand-audio-speaker" aria-hidden="true" />
            <input
              className="sand-audio-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audioVolume}
              aria-label="Audio volume"
              onChange={(event) => setAudioVolume(Number(event.target.value))}
            />
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          touchAction: "none",
        }}
      />
    </main>
  );
}

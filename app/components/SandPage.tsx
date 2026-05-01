"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fitOffsetFromTarget, narrowAspectScale } from "../lib/responsiveScene";
import VortexBackground from "./VortexBackground";
import WebcamPixelGrid from "./WebcamPixelGrid";
import WindTextChars from "./WindTextChars";

const SAND_VORTEX_HUES = [30, 38, 47];
const GENIE_BASE_X = -1.18;
const GENIE_BASE_Z = 2.05;
const BASE_CAMERA_Z = 9.35;
const CINEMATIC_DURATION = 5200;
const BASE_CAMERA_POSITION = new THREE.Vector3(0, 3.55, BASE_CAMERA_Z);
const BASE_LOOK_TARGET = new THREE.Vector3(0, -1.72, -1.85);
const SAND_FLOOR_SIZE = 17.5;
const GENIE_WORLD_SIZE = 0.74;
const REFERENCE_ASPECT = 16 / 10;
const FINAL_LOOK_OFFSET = new THREE.Vector3(0.01, -0.06, 0.02);
const MOBILE_FINAL_LOOK_OFFSET = new THREE.Vector3(0, -0.1, 0.02);
const BIO_REVEAL_PROGRESS = 0.68;
const GENIE_CLICK_PULSE_DURATION = 620;
const RESET_DURATION = 1800;
const GOAL_MODE_DURATION = 3900;
const SUNRISE_DURATION = 7600;
const TUMBLEWEED_WORLD_SIZE = 0.48;
const GOAL_WORLD_SIZE = 1.1;
const CAMERA_WORLD_SIZE = 1.12;
const CAMERA_MODEL_LIFT = 1.25;
const GAMEPLAY_MOVE_SPEED = 0.055;
const GENIE_GAMEPLAY_LIFT = 0.16;
const TUMBLEWEED_GAMEPLAY_LIFT = -0.14;
const GOAL_GAMEPLAY_LIFT = -0.44;
const GOAL_FACE_ROTATION = 0;
const TUMBLEWEED_START_OFFSET = new THREE.Vector3(0, 0, 2.2);
const GOAL_START_OFFSET = new THREE.Vector3(1.9, 0, 5.55);
const CAMERA_BASE_POSITION = new THREE.Vector3(-2.72, 0, 4.15);
const CAMERA_BASE_ROTATION_Y = Math.PI;
const GAMEPLAY_BOUNDS = {
  minX: -9,
  maxX: 9,
  minZ: -4,
  maxZ: 11,
};
const SUN_SETTLED_POSITION = new THREE.Vector3(-1.63, 3.8, 2.85);
const SUN_START_POSITION = new THREE.Vector3(-2.6, -3.2, 4.8);
const BOUNCE_FINAL_POSITION = new THREE.Vector3(-4.8, 2.15, 4.4);
const SKY_FINAL_INTENSITY = 0.76;
const SUN_FINAL_INTENSITY = 2.05;
const BOUNCE_FINAL_INTENSITY = 0.32;
const GENIE_LIGHT_FINAL_INTENSITY = 0.98;
const FINAL_EXPOSURE = 0.9;
const GENIE_SIGNAL_LIGHT_OFFSET = new THREE.Vector3(0.32, 0.28, 0.32);

const SKY_BIO_COLUMNS = [
  {
    label: "WHO_AM_I",
    title: "southern california-born full-stack engineer",
    body: "video producer / director / editor background. visual storytelling applied to interactive systems.",
  },
  {
    label: "BUILD_SIGNAL",
    title: "interactive web + mobile systems",
    body: "react, next.js, three.js, react native, expo, firebase. tactile interfaces and mobile product work for a 15k user base.",
  },
  {
    label: "LOOKING_FOR",
    title: "meaningful work with sharp teams",
    body: "projects where people push the experience beyond the expected result.",
  },
];

const easeInOutCubic = (value: number) => {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
};

const cubicBezier = (
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
) => {
  const inverse = 1 - t;
  return new THREE.Vector3()
    .addScaledVector(p0, inverse * inverse * inverse)
    .addScaledVector(p1, 3 * inverse * inverse * t)
    .addScaledVector(p2, 3 * inverse * t * t)
    .addScaledVector(p3, t * t * t);
};

const tuneSandMaterial = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => {
      if (!material) return;
      if ("roughness" in material && typeof material.roughness === "number") {
        material.roughness = Math.max(material.roughness, 0.96);
      }
      if ("metalness" in material && typeof material.metalness === "number") {
        material.metalness = 0;
      }
      material.needsUpdate = true;
    });
  });
};

export default function SandPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const goalModeRequestedRef = useRef(false);
  const webcamSkyActiveRef = useRef(false);
  const webcamSkyStatusRef = useRef<"idle" | "requesting" | "ready" | "error">(
    "idle",
  );
  const moveInputRef = useRef({ x: 0, z: 0 });
  const joystickPointerIdRef = useRef<number | null>(null);
  const [show, setShow] = useState(false);
  const [bioVisible, setBioVisible] = useState(false);
  const [goalModeActive, setGoalModeActive] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [webcamSkyActive, setWebcamSkyActive] = useState(false);
  const [webcamSkyStatus, setWebcamSkyStatus] = useState<
    "idle" | "requesting" | "ready" | "error"
  >("idle");
  const [webcamSkyAttempt, setWebcamSkyAttempt] = useState(0);

  const retryWebcamSky = () => {
    setWebcamSkyStatus("requesting");
    webcamSkyStatusRef.current = "requesting";
    setWebcamSkyAttempt((attempt) => attempt + 1);
    setWebcamSkyActive(true);
    webcamSkyActiveRef.current = true;
  };

  const dismissWebcamError = () => {
    if (webcamSkyStatusRef.current !== "error") return;
    webcamSkyStatusRef.current = "idle";
    webcamSkyActiveRef.current = false;
    setWebcamSkyStatus("idle");
    setWebcamSkyActive(false);
  };

  const updateJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = Math.max(rect.width, rect.height) * 0.36;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    const clamp = length > radius ? radius / length : 1;
    const x = (dx * clamp) / radius;
    const y = (dy * clamp) / radius;
    setJoystickPosition({ x, y });
    moveInputRef.current = { x: -x, z: -y };
  };

  const releaseJoystick = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event && joystickPointerIdRef.current !== null) {
      event.currentTarget.releasePointerCapture(joystickPointerIdRef.current);
    }
    joystickPointerIdRef.current = null;
    setJoystickPosition({ x: 0, y: 0 });
    moveInputRef.current = { x: 0, z: 0 };
  };

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    webcamSkyActiveRef.current = webcamSkyActive;
  }, [webcamSkyActive]);

  useEffect(() => {
    webcamSkyStatusRef.current = webcamSkyStatus;
  }, [webcamSkyStatus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = "ontouchstart" in window;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2),
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.74;
    renderer.setClearColor(0x0c0c0c, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#0c0c0c", 10, 28);

    const camera = new THREE.PerspectiveCamera(
      44,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    const activeLookTarget = BASE_LOOK_TARGET.clone();

    const portraitAmount = () => {
      return THREE.MathUtils.clamp(
        (REFERENCE_ASPECT - camera.aspect) / (REFERENCE_ASPECT - 0.56),
        0,
        1,
      );
    };

    const getInitialFrame = () => {
      const portrait = portraitAmount();
      const fittedDistance =
        BASE_CAMERA_Z * THREE.MathUtils.lerp(1, 1.24, portrait);
      const offset = fitOffsetFromTarget(
        BASE_CAMERA_POSITION.clone().sub(BASE_LOOK_TARGET),
        BASE_CAMERA_Z,
        fittedDistance,
      );
      const portraitLookTarget = BASE_LOOK_TARGET.clone().add(
        new THREE.Vector3(-0.55 * portrait, -0.18 * portrait, 0.78 * portrait),
      );
      return {
        fov: THREE.MathUtils.lerp(44, 52, portrait),
        position: portraitLookTarget.clone().add(offset),
        target: portraitLookTarget,
      };
    };

    const fitInitialCamera = () => {
      const frame = getInitialFrame();
      camera.fov = frame.fov;
      camera.position.copy(frame.position);
      activeLookTarget.copy(frame.target);
      camera.updateProjectionMatrix();
      camera.lookAt(activeLookTarget);
    };

    fitInitialCamera();

    const responsiveFloorSize = () => SAND_FLOOR_SIZE;

    const responsiveGenieSize = () => GENIE_WORLD_SIZE;

    const sceneStart = performance.now();
    const skyFill = new THREE.HemisphereLight("#ffd08a", "#8a501c", 0.08);
    scene.add(skyFill);
    const sun = new THREE.DirectionalLight("#ffc36f", 0.05);
    sun.position.copy(SUN_START_POSITION);
    scene.add(sun);
    const bounce = new THREE.PointLight("#c87820", 0, 18);
    bounce.position.copy(BOUNCE_FINAL_POSITION);
    scene.add(bounce);
    const genieLight = new THREE.PointLight("#ffb45a", 0.12, 5);
    genieLight.position.set(0.15, -0.8, 0.85);
    scene.add(genieLight);
    const genieSignalLight = new THREE.PointLight("#ffc36f", 0.36, 4.2);
    scene.add(genieSignalLight);
    const cameraSignalLight = new THREE.PointLight("#ffc36f", 0.52, 3.4);
    scene.add(cameraSignalLight);

    let sandFloor: THREE.Group | null = null;
    let genie: THREE.Group | null = null;
    let tumbleweed: THREE.Group | null = null;
    let goal: THREE.Group | null = null;
    let cameraModel: THREE.Group | null = null;
    let sandFloorMaxDim = 1;
    let genieMaxDim = 1;
    let genieModelHeight = 1;
    let tumbleweedModelHeight = 1;
    let tumbleweedScale = 1;
    let goalModelHeight = 1;
    let goalScale = 1;
    let cameraModelHeight = 1;
    let cameraModelScale = 1;
    type EyeRigMesh = {
      mesh: THREE.Mesh;
      basePosition: THREE.Vector3;
      baseRotation: THREE.Euler;
    };
    const genieEyeMeshes: EyeRigMesh[] = [];
    const floorY = -2.18;
    const genieRideHeight = 1.68;
    const tumbleweedGameplayPosition = new THREE.Vector3(
      GENIE_BASE_X + TUMBLEWEED_START_OFFSET.x,
      0,
      GENIE_BASE_Z + TUMBLEWEED_START_OFFSET.z,
    );
    const goalGameplayPosition = new THREE.Vector3(
      GENIE_BASE_X + GOAL_START_OFFSET.x,
      0,
      GENIE_BASE_Z + GOAL_START_OFFSET.z,
    );
    const keyboardInput = { x: 0, z: 0 };
    const genieGameplayPos = new THREE.Vector3(GENIE_BASE_X, 0, GENIE_BASE_Z);
    const tumbleweedVel = { x: 0, z: 0 };
    let gameWonLocal = false;
    const goalWorldBox = new THREE.Box3();
    const goalWorldCenter = new THREE.Vector3();
    const goalWorldSize = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    const pointerCurrent = new THREE.Vector2();
    let cinematicStart = 0;
    let cinematicActive = false;
    let cinematicComplete = false;
    let cameraBezier:
      | [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3]
      | null = null;
    let lookBezier:
      | [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3]
      | null = null;
    let lockedFinalLookTarget: THREE.Vector3 | null = null;
    let resetActive = false;
    let resetStart = 0;
    let resetStartFov = camera.fov;
    let resetEndFov = camera.fov;
    const resetStartPosition = new THREE.Vector3();
    const resetEndPosition = new THREE.Vector3();
    const resetStartLookTarget = new THREE.Vector3();
    const resetEndLookTarget = new THREE.Vector3();
    let goalModeTransitionActive = false;
    let goalModeSceneActive = false;
    let goalModeStaged = false;
    let goalModeTransitionStart = 0;
    let goalModeStartFov = camera.fov;
    let goalModeEndFov = camera.fov;
    const goalModeStartPosition = new THREE.Vector3();
    const goalModeEndPosition = new THREE.Vector3();
    const goalModeStartLookTarget = new THREE.Vector3();
    const goalModeEndLookTarget = new THREE.Vector3();
    let bioTriggered = false;
    let pointerOnGenie = false;
    let pointerOnCamera = false;
    let geniePulseStart = -Infinity;
    let cameraPulseStart = -Infinity;

    const tuneCameraMaterial = (object: THREE.Object3D) => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = false;
        child.receiveShadow = false;
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((material) => {
          if (!material) return;
          if (
            "roughness" in material &&
            typeof material.roughness === "number"
          ) {
            material.roughness = Math.min(material.roughness, 0.72);
          }
          if (
            "emissive" in material &&
            material.emissive instanceof THREE.Color
          ) {
            material.emissive.set("#3a2308");
          }
          if (
            "emissiveIntensity" in material &&
            typeof material.emissiveIntensity === "number"
          ) {
            material.emissiveIntensity = 0.42;
          }
          if ("side" in material) {
            material.side = THREE.DoubleSide;
          }
          material.needsUpdate = true;
        });
      });
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/gltf/");

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const setGroundedObjectPosition = (
      object: THREE.Object3D,
      position: THREE.Vector3,
      modelHeight: number,
      scale: number,
      lift = 0,
    ) => {
      object.position.set(
        position.x,
        floorY + modelHeight * scale * 0.5 + lift,
        position.z,
      );
    };

    const prepGameplayObject = (
      object: THREE.Group,
      targetWorldSize: number,
    ) => {
      const box = new THREE.Box3().setFromObject(object);
      object.position.sub(box.getCenter(new THREE.Vector3()));
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = targetWorldSize / maxDim;
      object.scale.setScalar(scale);
      object.visible = false;
      return { height: size.y, scale };
    };

    const placeGameplayObjects = () => {
      if (!genie) return;
      // Reset positions centred in front of genie's starting spot
      const scale = currentGenieScale();
      genieGameplayPos.set(GENIE_BASE_X, 0, GENIE_BASE_Z);
      genie.position.set(
        genieGameplayPos.x,
        floorY + genieModelHeight * scale * 0.5 + GENIE_GAMEPLAY_LIFT,
        genieGameplayPos.z,
      );
      genie.rotation.y = 0;
      genie.rotation.z = 0;
      tumbleweedGameplayPosition.set(
        GENIE_BASE_X + TUMBLEWEED_START_OFFSET.x,
        0,
        GENIE_BASE_Z + TUMBLEWEED_START_OFFSET.z,
      );
      goalGameplayPosition.set(
        GENIE_BASE_X + GOAL_START_OFFSET.x,
        0,
        GENIE_BASE_Z + GOAL_START_OFFSET.z,
      );

      if (tumbleweed) {
        setGroundedObjectPosition(
          tumbleweed,
          tumbleweedGameplayPosition,
          tumbleweedModelHeight,
          tumbleweedScale,
          TUMBLEWEED_GAMEPLAY_LIFT,
        );
        tumbleweed.visible = true;
      }

      if (goal) {
        setGroundedObjectPosition(
          goal,
          goalGameplayPosition,
          goalModelHeight,
          goalScale,
          GOAL_GAMEPLAY_LIFT,
        );
        goal.rotation.y = GOAL_FACE_ROTATION;
        goal.visible = true;
      }
    };

    loader.load("/models/sand.glb", (gltf) => {
      sandFloor = gltf.scene;
      tuneSandMaterial(sandFloor);
      const box = new THREE.Box3().setFromObject(sandFloor);
      sandFloor.position.sub(box.getCenter(new THREE.Vector3()));
      const size = box.getSize(new THREE.Vector3());
      sandFloorMaxDim = Math.max(size.x, size.y, size.z);
      sandFloor.scale.setScalar(responsiveFloorSize() / sandFloorMaxDim);
      sandFloor.position.set(0, floorY, -2.05);
      sandFloor.rotation.y = -Math.PI / 10;
      sandFloor.rotation.x = -0.13;
      scene.add(sandFloor);
    });

    loader.load("/models/genie1.glb", (gltf) => {
      genie = gltf.scene;
      genie.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        if (child.name.toLowerCase() !== "sphere") return;
        genieEyeMeshes.push({
          mesh: child,
          basePosition: child.position.clone(),
          baseRotation: child.rotation.clone(),
        });
      });
      const box = new THREE.Box3().setFromObject(genie);
      genie.position.sub(box.getCenter(new THREE.Vector3()));
      const size = box.getSize(new THREE.Vector3());
      genieModelHeight = size.y;
      genieMaxDim = Math.max(size.x, size.y, size.z);
      const scale = responsiveGenieSize() / genieMaxDim;
      genie.scale.setScalar(scale);
      genie.position.set(
        GENIE_BASE_X,
        floorY + genieModelHeight * scale * 0.5 + genieRideHeight,
        GENIE_BASE_Z,
      );
      genie.rotation.y = Math.PI / 5;
      scene.add(genie);
    });

    loader.load("/models/tumbleweed.glb", (gltf) => {
      tumbleweed = gltf.scene;
      const prepared = prepGameplayObject(tumbleweed, TUMBLEWEED_WORLD_SIZE);
      tumbleweedModelHeight = prepared.height;
      tumbleweedScale = prepared.scale;
      setGroundedObjectPosition(
        tumbleweed,
        tumbleweedGameplayPosition,
        tumbleweedModelHeight,
        tumbleweedScale,
        TUMBLEWEED_GAMEPLAY_LIFT,
      );
      scene.add(tumbleweed);
      if (goalModeSceneActive || goalModeTransitionActive)
        tumbleweed.visible = true;
    });

    loader.load("/models/goal.glb", (gltf) => {
      goal = gltf.scene;
      const prepared = prepGameplayObject(goal, GOAL_WORLD_SIZE);
      goalModelHeight = prepared.height;
      goalScale = prepared.scale;
      goal.rotation.y = GOAL_FACE_ROTATION;
      setGroundedObjectPosition(
        goal,
        goalGameplayPosition,
        goalModelHeight,
        goalScale,
        GOAL_GAMEPLAY_LIFT,
      );
      scene.add(goal);
      if (goalModeSceneActive || goalModeTransitionActive) goal.visible = true;
    });

    loader.load("/models/camera.glb", (gltf) => {
      cameraModel = gltf.scene;
      tuneCameraMaterial(cameraModel);
      const box = new THREE.Box3().setFromObject(cameraModel);
      cameraModel.position.sub(box.getCenter(new THREE.Vector3()));
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      cameraModelHeight = size.y;
      cameraModelScale = CAMERA_WORLD_SIZE / maxDim;
      cameraModel.scale.setScalar(cameraModelScale);
      cameraModel.position.set(
        CAMERA_BASE_POSITION.x,
        floorY + cameraModelHeight * cameraModelScale * 0.5 + CAMERA_MODEL_LIFT,
        CAMERA_BASE_POSITION.z,
      );
      cameraModel.rotation.set(-0.08, CAMERA_BASE_ROTATION_Y, 0.02);
      scene.add(cameraModel);
    });

    const currentGenieScale = () => responsiveGenieSize() / genieMaxDim;

    const getGenieHeadTarget = () => {
      if (!genie)
        return new THREE.Vector3(GENIE_BASE_X, floorY + 2.2, GENIE_BASE_Z);
      const scale = currentGenieScale();
      return new THREE.Vector3(
        genie.position.x + 0.02,
        genie.position.y + genieModelHeight * scale * 0.34,
        genie.position.z + 0.08,
      );
    };

    const getFinalLookTarget = (portrait = 0) => {
      return getGenieHeadTarget().add(
        FINAL_LOOK_OFFSET.clone().lerp(MOBILE_FINAL_LOOK_OFFSET, portrait),
      );
    };

    const getGoalModeFrame = () => {
      const portrait = portraitAmount();
      const frameScale = narrowAspectScale(camera.aspect, 1.32);
      const scale = currentGenieScale();
      const basePosition = new THREE.Vector3(
        genieGameplayPos.x,
        floorY + genieModelHeight * scale * 0.5 + GENIE_GAMEPLAY_LIFT,
        genieGameplayPos.z,
      );
      // Centered third-person gameplay frame so forward input reads as straight ahead.
      const cameraOffset = new THREE.Vector3(
        0,
        THREE.MathUtils.lerp(0.42, 0.72, portrait),
        -2.16 * frameScale,
      );
      const lookOffset = new THREE.Vector3(
        0,
        THREE.MathUtils.lerp(0.2, 0.34, portrait),
        1.35 * frameScale,
      );

      return {
        fov: THREE.MathUtils.lerp(52, 60, portrait),
        position: basePosition.clone().add(cameraOffset),
        target: basePosition.clone().add(lookOffset),
      };
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const updateGazePointer = (event: PointerEvent) => {
      pointerTarget.set(
        THREE.MathUtils.clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1),
        THREE.MathUtils.clamp((event.clientY / window.innerHeight) * -2 + 1, -1, 1),
      );
    };

    const getPointerHits = (event: PointerEvent) => {
      if (
        cinematicActive ||
        resetActive ||
        goalModeTransitionActive ||
        goalModeSceneActive
      ) {
        return { genie: false, camera: false };
      }
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      return {
        genie: genie
          ? raycaster.intersectObject(genie, true).length > 0
          : false,
        camera: cameraModel
          ? raycaster.intersectObject(cameraModel, true).length > 0
          : false,
      };
    };

    const beginCinematic = () => {
      if (!genie || cinematicActive || cinematicComplete || resetActive) return;

      const headTarget = getGenieHeadTarget();
      const bodyTarget = new THREE.Vector3(
        genie.position.x,
        genie.position.y,
        genie.position.z,
      );
      const portrait = portraitAmount();
      const closeFrameScale = narrowAspectScale(camera.aspect, 1.65);
      const finalLookTarget = getFinalLookTarget(portrait);
      const finalCameraPosition = new THREE.Vector3(
        headTarget.x +
          THREE.MathUtils.lerp(0.04, 0, portrait) * closeFrameScale,
        headTarget.y -
          THREE.MathUtils.lerp(0.48, 0.2, portrait) * closeFrameScale,
        headTarget.z +
          THREE.MathUtils.lerp(1.38, 0.45, portrait) * closeFrameScale,
      );
      cinematicActive = true;
      cinematicStart = performance.now();
      geniePulseStart = cinematicStart;
      bioTriggered = false;
      setBioVisible(false);
      lockedFinalLookTarget = finalLookTarget.clone();
      pointerOnCamera = false;
      pointerTarget.set(0, 0);
      canvas.style.cursor = "default";

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
      ];

      lookBezier = [
        activeLookTarget.clone(),
        new THREE.Vector3(
          bodyTarget.x - 0.55,
          floorY + 0.82,
          bodyTarget.z - 1.05,
        ),
        bodyTarget.clone().add(new THREE.Vector3(0.12, 0.42, 0.05)),
        finalLookTarget,
      ];
    };

    const beginReset = () => {
      if (!genie || cinematicActive || resetActive || !cinematicComplete)
        return;

      const initialFrame = getInitialFrame();
      resetActive = true;
      resetStart = performance.now();
      geniePulseStart = resetStart;
      resetStartFov = camera.fov;
      resetEndFov = initialFrame.fov;
      resetStartPosition.copy(camera.position);
      resetEndPosition.copy(initialFrame.position);
      resetStartLookTarget.copy(activeLookTarget);
      resetEndLookTarget.copy(initialFrame.target);
      cinematicComplete = false;
      bioTriggered = false;
      lockedFinalLookTarget = null;
      cameraBezier = null;
      lookBezier = null;
      pointerOnGenie = false;
      pointerOnCamera = false;
      pointerTarget.set(0, 0);
      setBioVisible(false);
      canvas.style.cursor = "default";
    };

    const beginGoalModeTransition = () => {
      if (!genie || goalModeTransitionActive || goalModeSceneActive) return;

      // Place objects and reset gameplay state before camera moves
      genieGameplayPos.set(GENIE_BASE_X, 0, GENIE_BASE_Z);
      tumbleweedVel.x = 0;
      tumbleweedVel.z = 0;
      gameWonLocal = false;
      setGameWon(false);
      goalModeStaged = false;
      if (sandFloor) sandFloor.visible = true;
      if (tumbleweed) tumbleweed.visible = false;
      if (goal) goal.visible = false;
      if (cameraModel) cameraModel.visible = false;

      const goalFrame = getGoalModeFrame();
      goalModeTransitionActive = true;
      goalModeTransitionStart = performance.now();
      goalModeStartFov = camera.fov;
      goalModeEndFov = goalFrame.fov;
      goalModeStartPosition.copy(camera.position);
      goalModeEndPosition.copy(goalFrame.position);
      goalModeStartLookTarget.copy(activeLookTarget);
      goalModeEndLookTarget.copy(goalFrame.target);
      cinematicActive = false;
      cinematicComplete = false;
      resetActive = false;
      pointerOnGenie = false;
      pointerOnCamera = false;
      pointerTarget.set(0, 0);
      goalModeRequestedRef.current = false;
      bioTriggered = false;
      setBioVisible(false);
      canvas.style.cursor = "default";
    };

    const beginWebcamSky = () => {
      if (!cameraModel || goalModeTransitionActive || goalModeSceneActive)
        return;
      cameraPulseStart = performance.now();
      if (!webcamSkyActiveRef.current) {
        webcamSkyActiveRef.current = true;
        setWebcamSkyStatus("requesting");
        webcamSkyStatusRef.current = "requesting";
        setWebcamSkyActive(true);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      updateGazePointer(event);
      const hits = getPointerHits(event);
      pointerOnGenie = hits.genie;
      pointerOnCamera = hits.camera;
      canvas.style.cursor =
        pointerOnGenie || pointerOnCamera ? "pointer" : "default";
    };

    const onPointerLeave = () => {
      pointerOnGenie = false;
      pointerOnCamera = false;
      pointerTarget.set(0, 0);
      canvas.style.cursor = "default";
    };

    const onPointerDown = (event: PointerEvent) => {
      updateGazePointer(event);
      const hits = getPointerHits(event);
      pointerOnGenie = hits.genie;
      pointerOnCamera = hits.camera;
      if (pointerOnCamera) {
        beginWebcamSky();
        return;
      }
      dismissWebcamError();
      if (!pointerOnGenie) return;
      if (cinematicComplete) beginReset();
      else beginCinematic();
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointerdown", onPointerDown);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W")
        keyboardInput.z = 1;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
        keyboardInput.z = -1;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
        keyboardInput.x = 1;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
        keyboardInput.x = -1;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W")
        keyboardInput.z = 0;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S")
        keyboardInput.z = 0;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
        keyboardInput.x = 0;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
        keyboardInput.x = 0;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (
        !cinematicActive &&
        !cinematicComplete &&
        !resetActive &&
        !goalModeTransitionActive &&
        !goalModeSceneActive
      )
        fitInitialCamera();
      if (sandFloor)
        sandFloor.scale.setScalar(responsiveFloorSize() / sandFloorMaxDim);
      if (genie) {
        const scale = responsiveGenieSize() / genieMaxDim;
        genie.scale.setScalar(scale);
        genie.position.y =
          floorY +
          genieModelHeight * scale * 0.5 +
          (goalModeTransitionActive || goalModeSceneActive
            ? GENIE_GAMEPLAY_LIFT
            : genieRideHeight);
      }
    };
    window.addEventListener("resize", onResize);

    let tick = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      tick++;
      const t = tick * 0.01;
      pointerCurrent.lerp(pointerTarget, 0.055);

      if (sandFloor) {
        sandFloor.rotation.y = -Math.PI / 10 + Math.sin(t * 0.08) * 0.018;
      }

      if (
        goalModeRequestedRef.current &&
        !goalModeTransitionActive &&
        !goalModeSceneActive
      ) {
        beginGoalModeTransition();
      }

      const sunriseProgress = THREE.MathUtils.clamp(
        (performance.now() - sceneStart) / SUNRISE_DURATION,
        0,
        1,
      );
      const sunrise = easeInOutCubic(sunriseProgress);
      skyFill.intensity = THREE.MathUtils.lerp(
        0.08,
        SKY_FINAL_INTENSITY,
        sunrise,
      );
      sun.intensity = THREE.MathUtils.lerp(0.05, SUN_FINAL_INTENSITY, sunrise);
      sun.position.lerpVectors(
        SUN_START_POSITION,
        SUN_SETTLED_POSITION,
        sunrise,
      );
      bounce.intensity = THREE.MathUtils.lerp(
        0,
        BOUNCE_FINAL_INTENSITY,
        sunrise,
      );
      genieLight.intensity = THREE.MathUtils.lerp(
        0.12,
        GENIE_LIGHT_FINAL_INTENSITY,
        sunrise,
      );
      renderer.toneMappingExposure = THREE.MathUtils.lerp(
        0.74,
        FINAL_EXPOSURE,
        sunrise,
      );

      if (genie) {
        const scale = currentGenieScale();
        const motionWeight =
          cinematicActive ||
          cinematicComplete ||
          resetActive ||
          goalModeTransitionActive ||
          goalModeSceneActive
            ? 0
            : 1;
        const pulseProgress = THREE.MathUtils.clamp(
          (performance.now() - geniePulseStart) / GENIE_CLICK_PULSE_DURATION,
          0,
          1,
        );
        const pulse = pulseProgress < 1 ? Math.sin(pulseProgress * Math.PI) : 0;
        const hoverPulse =
          pointerOnGenie &&
          !cinematicActive &&
          !resetActive &&
          !goalModeTransitionActive &&
          !goalModeSceneActive
            ? (Math.sin(t * 2.8) + 1) * 0.5
            : 0;
        const interactionScale = 1 + hoverPulse * 0.025 + pulse * 0.09;
        genie.scale.setScalar(scale * interactionScale);
        if (goalModeTransitionActive && goalModeStaged) {
          genie.position.x = genieGameplayPos.x;
          genie.position.z = genieGameplayPos.z;
          genie.position.y =
            floorY +
            genieModelHeight * scale * interactionScale * 0.5 +
            GENIE_GAMEPLAY_LIFT;
          genie.rotation.y = 0;
          genie.rotation.z = 0;
        } else if (!goalModeSceneActive) {
          genie.position.x =
            GENIE_BASE_X + Math.sin(t * 0.14) * 0.045 * motionWeight;
          genie.position.z =
            GENIE_BASE_Z + Math.sin(t * 0.1 + 1.3) * 0.035 * motionWeight;
          genie.position.y =
            floorY +
            genieModelHeight * scale * interactionScale * 0.5 +
            genieRideHeight +
            Math.sin(t * 0.48) * 0.018 * motionWeight;
          genie.rotation.y =
            Math.PI / 5 + Math.sin(t * 0.18) * 0.035 * motionWeight;
          genie.rotation.z = Math.sin(t * 0.16) * 0.008 * motionWeight;
        }
        genieLight.position.set(
          genie.position.x,
          genie.position.y + 0.45,
          genie.position.z + 1.25,
        );
        genieSignalLight.position
          .copy(genie.position)
          .add(GENIE_SIGNAL_LIGHT_OFFSET);
        genieSignalLight.intensity = 0.36 + hoverPulse * 0.42 + pulse * 2.35;

        const gazeActive =
          bioTriggered &&
          !resetActive &&
          !goalModeTransitionActive &&
          !goalModeSceneActive;
        const gazeX = pointerCurrent.x * (gazeActive ? 0.018 : 0);
        const gazeY = pointerCurrent.y * (gazeActive ? 0.014 : 0);
        genieEyeMeshes.forEach(({ mesh, basePosition, baseRotation }) => {
          mesh.position.x = THREE.MathUtils.lerp(
            mesh.position.x,
            basePosition.x + gazeX,
            0.18,
          );
          mesh.position.y = THREE.MathUtils.lerp(
            mesh.position.y,
            basePosition.y + gazeY,
            0.18,
          );
          mesh.rotation.y = THREE.MathUtils.lerp(
            mesh.rotation.y,
            baseRotation.y + pointerCurrent.x * (gazeActive ? 0.045 : 0),
            0.14,
          );
          mesh.rotation.x = THREE.MathUtils.lerp(
            mesh.rotation.x,
            baseRotation.x - pointerCurrent.y * (gazeActive ? 0.035 : 0),
            0.14,
          );
        });
      }

      if (cameraModel) {
        const motionWeight =
          cinematicActive ||
          resetActive ||
          goalModeTransitionActive ||
          goalModeSceneActive
            ? 0
            : 1;
        const pulseProgress = THREE.MathUtils.clamp(
          (performance.now() - cameraPulseStart) / GENIE_CLICK_PULSE_DURATION,
          0,
          1,
        );
        const pulse = pulseProgress < 1 ? Math.sin(pulseProgress * Math.PI) : 0;
        const hoverPulse =
          pointerOnCamera &&
          !cinematicActive &&
          !resetActive &&
          !goalModeTransitionActive &&
          !goalModeSceneActive
            ? (Math.sin(t * 3.2) + 1) * 0.5
            : 0;
        const interactionScale = 1 + hoverPulse * 0.035 + pulse * 0.12;
        cameraModel.scale.setScalar(cameraModelScale * interactionScale);
        cameraModel.position.x =
          CAMERA_BASE_POSITION.x +
          Math.sin(t * 0.13 + 0.8) * 0.025 * motionWeight;
        cameraModel.position.z =
          CAMERA_BASE_POSITION.z +
          Math.sin(t * 0.11 + 1.6) * 0.02 * motionWeight;
        cameraModel.position.y =
          floorY +
          cameraModelHeight * cameraModelScale * interactionScale * 0.5 +
          CAMERA_MODEL_LIFT +
          Math.sin(t * 0.4 + 0.2) * 0.01 * motionWeight;
        cameraModel.rotation.y =
          CAMERA_BASE_ROTATION_Y + Math.sin(t * 0.17) * 0.025 * motionWeight;
        cameraSignalLight.position.set(
          cameraModel.position.x,
          cameraModel.position.y + 0.62,
          cameraModel.position.z + 0.22,
        );
        cameraSignalLight.intensity = webcamSkyActiveRef.current
          ? 1.2
          : 0.52 + hoverPulse * 0.46 + pulse * 1.2;
      }

      // Gameplay: drive genie, push tumbleweed, detect goal
      if (goalModeSceneActive && genie && !gameWonLocal) {
        const scale = currentGenieScale();
        const jx = moveInputRef.current.x;
        const jz = moveInputRef.current.z; // positive = joystick up = forward
        const totalX = jx + keyboardInput.x;
        const totalZ = jz + keyboardInput.z;

        genieGameplayPos.x = THREE.MathUtils.clamp(
          genieGameplayPos.x + totalX * GAMEPLAY_MOVE_SPEED,
          GAMEPLAY_BOUNDS.minX,
          GAMEPLAY_BOUNDS.maxX,
        );
        genieGameplayPos.z = THREE.MathUtils.clamp(
          genieGameplayPos.z + totalZ * GAMEPLAY_MOVE_SPEED,
          GAMEPLAY_BOUNDS.minZ,
          GAMEPLAY_BOUNDS.maxZ,
        );

        genie.position.x = THREE.MathUtils.lerp(
          genie.position.x,
          genieGameplayPos.x,
          0.2,
        );
        genie.position.z = THREE.MathUtils.lerp(
          genie.position.z,
          genieGameplayPos.z,
          0.2,
        );
        genie.position.y =
          floorY + genieModelHeight * scale * 0.5 + GENIE_GAMEPLAY_LIFT;

        // Rotate to face direction of travel
        const moveLen = Math.hypot(totalX, totalZ);
        if (moveLen > 0.08) {
          const targetRot = Math.atan2(totalX, totalZ);
          const delta =
            ((((targetRot - genie.rotation.y) % (Math.PI * 2)) + Math.PI * 3) %
              (Math.PI * 2)) -
            Math.PI;
          genie.rotation.y += delta * 0.12;
        }

        genieLight.position.set(
          genie.position.x,
          genie.position.y + 0.45,
          genie.position.z + 1.25,
        );
        genieSignalLight.position
          .copy(genie.position)
          .add(GENIE_SIGNAL_LIGHT_OFFSET);
        genieSignalLight.intensity = 0.36;

        // Tumbleweed push physics
        if (tumbleweed) {
          const dx = tumbleweedGameplayPosition.x - genie.position.x;
          const dz = tumbleweedGameplayPosition.z - genie.position.z;
          const dist = Math.hypot(dx, dz);
          const pushRadius = 0.58;
          if (dist < pushRadius && dist > 0.01) {
            const strength = (1 - dist / pushRadius) * 0.034;
            tumbleweedVel.x += (dx / dist) * strength;
            tumbleweedVel.z += (dz / dist) * strength;
          }
          tumbleweedGameplayPosition.x = THREE.MathUtils.clamp(
            tumbleweedGameplayPosition.x + tumbleweedVel.x,
            GAMEPLAY_BOUNDS.minX,
            GAMEPLAY_BOUNDS.maxX,
          );
          tumbleweedGameplayPosition.z = THREE.MathUtils.clamp(
            tumbleweedGameplayPosition.z + tumbleweedVel.z,
            GAMEPLAY_BOUNDS.minZ,
            GAMEPLAY_BOUNDS.maxZ,
          );
          tumbleweedVel.x *= 0.86;
          tumbleweedVel.z *= 0.86;
          tumbleweed.rotation.x += tumbleweedVel.z * 6;
          tumbleweed.rotation.z -= tumbleweedVel.x * 6;

          if (goal) {
            goalWorldBox.setFromObject(goal);
            goalWorldBox.getCenter(goalWorldCenter);
            goalWorldBox.getSize(goalWorldSize);
            const gx = tumbleweedGameplayPosition.x - goalWorldCenter.x;
            const ballRadius = TUMBLEWEED_WORLD_SIZE * 0.42;
            const mouthHalfWidth = goalWorldSize.x * 0.42;
            const sideWallHalfWidth = goalWorldSize.x * 0.5 + ballRadius * 0.24;
            const goalFrontZ = goalWorldBox.min.z - ballRadius * 0.22;
            const goalBackMeshZ = goalWorldBox.max.z - ballRadius * 0.82;
            const scoreLineZ = goalWorldBox.min.z + ballRadius * 0.68;
            const insideGoalDepth =
              tumbleweedGameplayPosition.z > goalFrontZ &&
              tumbleweedGameplayPosition.z <
                goalWorldBox.max.z + ballRadius * 0.12;
            const insideGoalMouth =
              Math.abs(gx) < mouthHalfWidth &&
              tumbleweedGameplayPosition.z >= scoreLineZ;

            if (
              Math.abs(gx) > mouthHalfWidth &&
              Math.abs(gx) < sideWallHalfWidth &&
              insideGoalDepth
            ) {
              tumbleweedGameplayPosition.x =
                goalWorldCenter.x + Math.sign(gx) * sideWallHalfWidth;
              tumbleweedVel.x *= -0.22;
            }

            if (
              Math.abs(gx) < mouthHalfWidth &&
              tumbleweedGameplayPosition.z > goalBackMeshZ
            ) {
              tumbleweedGameplayPosition.z = goalBackMeshZ;
              tumbleweedVel.z = Math.min(0, tumbleweedVel.z * -0.18);
            }

            if (insideGoalMouth && !gameWonLocal) {
              gameWonLocal = true;
              setGameWon(true);
            }
          }

          setGroundedObjectPosition(
            tumbleweed,
            tumbleweedGameplayPosition,
            tumbleweedModelHeight,
            tumbleweedScale,
            TUMBLEWEED_GAMEPLAY_LIFT,
          );
        }

        if (goal) {
          goalWorldBox.setFromObject(goal);
          const goalFrontZ = goalWorldBox.min.z - 0.18;
          const insideGoalX =
            genieGameplayPos.x > goalWorldBox.min.x + 0.05 &&
            genieGameplayPos.x < goalWorldBox.max.x - 0.05;
          if (insideGoalX && genieGameplayPos.z > goalFrontZ) {
            genieGameplayPos.z = goalFrontZ;
            genie.position.z = THREE.MathUtils.lerp(
              genie.position.z,
              genieGameplayPos.z,
              0.55,
            );
          }
        }
      }

      if (goalModeTransitionActive) {
        const progress = THREE.MathUtils.clamp(
          (performance.now() - goalModeTransitionStart) / GOAL_MODE_DURATION,
          0,
          1,
        );
        const eased = easeInOutCubic(progress);
        const skyRise = easeInOutCubic(
          THREE.MathUtils.clamp(progress / 0.48, 0, 1),
        );
        const skyFall = easeInOutCubic(
          THREE.MathUtils.clamp((progress - 0.46) / 0.34, 0, 1),
        );
        const skyDetour = Math.max(0, skyRise - skyFall);
        const stagedPosition = new THREE.Vector3().lerpVectors(
          goalModeStartPosition,
          goalModeEndPosition,
          eased,
        );
        const stagedLook = new THREE.Vector3().lerpVectors(
          goalModeStartLookTarget,
          goalModeEndLookTarget,
          eased,
        );
        stagedPosition.y += skyDetour * 2.65;
        stagedLook.y += skyDetour * 3.75;

        if (progress >= 0.42 && !goalModeStaged) {
          goalModeStaged = true;
          if (sandFloor) sandFloor.visible = false;
          placeGameplayObjects();
        }

        camera.fov = THREE.MathUtils.lerp(
          goalModeStartFov,
          goalModeEndFov,
          eased,
        );
        camera.position.copy(stagedPosition);
        activeLookTarget.copy(stagedLook);
        camera.updateProjectionMatrix();
        camera.lookAt(activeLookTarget);

        if (progress >= 1) {
          camera.fov = goalModeEndFov;
          camera.position.copy(goalModeEndPosition);
          activeLookTarget.copy(goalModeEndLookTarget);
          camera.updateProjectionMatrix();
          camera.lookAt(activeLookTarget);
          goalModeTransitionActive = false;
          goalModeSceneActive = true;
        }
      } else if (goalModeSceneActive) {
        const goalFrame = getGoalModeFrame();
        camera.fov = goalFrame.fov;
        camera.position.lerp(goalFrame.position, 0.055);
        activeLookTarget.lerp(goalFrame.target, 0.065);
        camera.updateProjectionMatrix();
        camera.lookAt(activeLookTarget);
      } else if (resetActive) {
        const progress = THREE.MathUtils.clamp(
          (performance.now() - resetStart) / RESET_DURATION,
          0,
          1,
        );
        const eased = easeInOutCubic(progress);
        camera.fov = THREE.MathUtils.lerp(resetStartFov, resetEndFov, eased);
        camera.position.lerpVectors(
          resetStartPosition,
          resetEndPosition,
          eased,
        );
        activeLookTarget.lerpVectors(
          resetStartLookTarget,
          resetEndLookTarget,
          eased,
        );
        camera.updateProjectionMatrix();
        camera.lookAt(activeLookTarget);

        if (progress >= 1) {
          camera.fov = resetEndFov;
          camera.position.copy(resetEndPosition);
          activeLookTarget.copy(resetEndLookTarget);
          camera.updateProjectionMatrix();
          camera.lookAt(activeLookTarget);
          resetActive = false;
        }
      } else if (cinematicActive && cameraBezier && lookBezier) {
        const progress = THREE.MathUtils.clamp(
          (performance.now() - cinematicStart) / CINEMATIC_DURATION,
          0,
          1,
        );
        const eased = easeInOutCubic(progress);
        camera.position.copy(cubicBezier(...cameraBezier, eased));
        activeLookTarget.copy(cubicBezier(...lookBezier, eased));
        camera.lookAt(activeLookTarget);

        if (progress > BIO_REVEAL_PROGRESS && !bioTriggered) {
          bioTriggered = true;
          setBioVisible(true);
        }

        if (progress >= 1) {
          bioTriggered = true;
          setBioVisible(true);
          if (lockedFinalLookTarget)
            activeLookTarget.copy(lockedFinalLookTarget);
          camera.lookAt(activeLookTarget);
          cinematicActive = false;
          cinematicComplete = true;
        }
      } else if (cinematicComplete) {
        camera.lookAt(activeLookTarget);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
      dracoLoader.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className="w-dvw h-dvh relative overflow-hidden transition-opacity duration-700"
      style={{
        width: "100dvw",
        height: "100dvh",
        background: "#0c0c0c",
        opacity: show ? 1 : 0,
      }}
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

      {webcamSkyActive && (
        <div
          className="sand-webcam-sky"
          data-ready={webcamSkyStatus === "ready"}
        >
          <WebcamPixelGrid
            key={webcamSkyAttempt}
            className="w-full h-full"
            gridCols={76}
            gridRows={46}
            maxElevation={18}
            motionSensitivity={0.46}
            elevationSmoothing={0.18}
            colorMode="webcam"
            backgroundColor="#070707"
            gapRatio={0.16}
            darken={0.18}
            borderColor="#ffc36f"
            borderOpacity={0.09}
            onWebcamReady={() => {
              webcamSkyStatusRef.current = "ready";
              setWebcamSkyStatus("ready");
            }}
            onWebcamError={() => {
              webcamSkyStatusRef.current = "error";
              setWebcamSkyStatus("error");
            }}
          />
        </div>
      )}

      <section
        aria-hidden={!bioVisible}
        data-visible={bioVisible}
        className="sand-sky-bio pointer-events-none absolute"
        style={{
          zIndex: 6,
          color: "#c8c8c8",
          fontFamily: "var(--font-geist-mono)",
          textShadow: "0 0 20px rgba(12, 12, 12, 0.95)",
        }}
      >
        <div
          className="sand-sky-stack relative"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {SKY_BIO_COLUMNS.map((column, index) => {
            const rowOffset = 0;

            return (
              <article
                key={column.label}
                className="sand-sky-row min-w-0"
                style={{
                  width: `calc(100% - min(${rowOffset}rem, 18vw))`,
                  marginLeft: `min(${rowOffset}rem, 18vw)`,
                  marginTop: index === 0 ? 0 : "0.25rem",
                  paddingTop: "0.58rem",
                  paddingBottom: "0.55rem",
                  transform: `translateZ(${index * 18}px)`,
                  opacity: 1 - index * 0.08,
                }}
              >
                <div
                  className="sand-sky-label"
                  style={{
                    color: "#c87820",
                    fontSize: "clamp(0.5rem, 0.54vw, 0.62rem)",
                    letterSpacing: "0.16em",
                    marginBottom: "0.34rem",
                  }}
                >
                  <WindTextChars
                    active={bioVisible}
                    baseDelay={120 + index * 210}
                    stagger={36}
                    mode="chars"
                    text={`→ ${column.label}`}
                  />
                </div>
                <h2
                  className="sand-sky-title"
                  style={{
                    color: "#ededed",
                    fontFamily: "var(--font-geist-sans)",
                    fontSize: "clamp(1.08rem, 1.55vw, 1.78rem)",
                    fontWeight: 400,
                    lineHeight: 1.04,
                    margin: 0,
                    marginBottom: "0.36rem",
                    letterSpacing: 0,
                  }}
                >
                  <WindTextChars
                    active={bioVisible}
                    baseDelay={210 + index * 210}
                    stagger={58}
                    mode="words"
                    text={column.title}
                  />
                </h2>
                <p
                  className="sand-sky-copy"
                  style={{
                    color: "#9c9c9c",
                    fontSize: "clamp(0.62rem, 0.72vw, 0.84rem)",
                    lineHeight: 1.55,
                    margin: 0,
                    maxWidth: "30rem",
                  }}
                >
                  <WindTextChars
                    active={bioVisible}
                    baseDelay={340 + index * 210}
                    stagger={72}
                    mode="words"
                    text={column.body}
                  />
                </p>
              </article>
            );
          })}
          {bioVisible && !goalModeActive && (
            <button
              type="button"
              className="sand-goal-cta sand-goal-cta-inline"
              onClick={() => {
                dismissWebcamError();
                goalModeRequestedRef.current = true;
                setGoalModeActive(true);
                setBioVisible(false);
              }}
            >
              <span className="sand-goal-cta-default">→ MAKE_CONTACT</span>
              <span className="sand-goal-cta-reveal">→ SCORE_A_GOAL</span>
            </button>
          )}
        </div>
      </section>

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%", zIndex: 2 }}
      />

      {bioVisible && !goalModeActive && (
        <div className="sand-goal-cta-wrap sand-goal-cta-wrap-mobile">
          <button
            type="button"
            className="sand-goal-cta"
            onClick={() => {
              dismissWebcamError();
              goalModeRequestedRef.current = true;
              setGoalModeActive(true);
              setBioVisible(false);
            }}
          >
            <span className="sand-goal-cta-default">→ MAKE_CONTACT</span>
            <span className="sand-goal-cta-reveal">→ SCORE_A_GOAL</span>
          </button>
        </div>
      )}

      {!goalModeActive && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center text-[0.6rem] sm:text-xs tracking-widest pointer-events-none"
          style={{
            bottom: "max(22px, 6dvh)",
            width: "min(38rem, calc(100vw - 32px))",
            color: "#303030",
            fontFamily: "var(--font-geist-mono)",
            zIndex: 9,
          }}
        >
          → CLICK_GENIE // ABOUT_CONTACT <br></br>→ CLICK_CAMERA_FOR_SKY_FEED
        </div>
      )}

      {webcamSkyStatus === "ready" && !goalModeActive && (
        <div className="sand-webcam-status sand-webcam-live" role="status" aria-live="polite">
          <span className="sand-webcam-live-dot" aria-hidden="true" />
          <span>SKY_FEED_ACTIVE</span>
        </div>
      )}

      {webcamSkyStatus === "error" && !goalModeActive && (
        <div className="sand-webcam-status" role="status">
          <span>CAMERA_BLOCKED // SKY_FEED_OFFLINE</span>
          <button type="button" onClick={retryWebcamSky}>
            RETRY_CAMERA
          </button>
        </div>
      )}

      {/* Joystick — shown in gameplay mode */}
      {goalModeActive && !gameWon && (
        <div
          style={{
            position: "fixed",
            bottom: "max(28px, 5dvh)",
            right: "max(24px, 4vw)",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.38rem",
            fontFamily: "var(--font-geist-mono)",
            userSelect: "none",
          }}
        >
          <div
            style={{
              color: "#303030",
              fontSize: "0.46rem",
              letterSpacing: "0.16em",
            }}
          >
            MOVE_AXIS
          </div>
          <div
            onPointerDown={(e) => {
              joystickPointerIdRef.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              updateJoystick(e);
            }}
            onPointerMove={(e) => {
              if (joystickPointerIdRef.current === e.pointerId)
                updateJoystick(e);
            }}
            onPointerUp={releaseJoystick}
            onPointerCancel={releaseJoystick}
            style={{
              width: 124,
              height: 124,
              borderRadius: "50%",
              border: "1px solid rgba(200, 200, 200, 0.13)",
              background: "rgba(12, 12, 12, 0.54)",
              backdropFilter: "blur(18px) saturate(118%)",
              WebkitBackdropFilter: "blur(18px) saturate(118%)",
              position: "relative",
              cursor: "grab",
              touchAction: "none",
            }}
          >
            {/* inner guide ring */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px solid rgba(200, 200, 200, 0.06)",
                transform: "scale(0.58)",
                pointerEvents: "none",
              }}
            />
            {/* crosshair lines */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "12%",
                right: "12%",
                height: 1,
                background: "rgba(200,200,200,0.04)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "12%",
                bottom: "12%",
                width: 1,
                background: "rgba(200,200,200,0.04)",
                pointerEvents: "none",
              }}
            />
            {/* thumb */}
            <div
              style={{
                position: "absolute",
                width: 38,
                height: 38,
                borderRadius: "50%",
                background:
                  joystickPosition.x !== 0 || joystickPosition.y !== 0
                    ? "rgba(200, 120, 32, 0.38)"
                    : "rgba(200, 200, 200, 0.16)",
                border: "1px solid rgba(200, 200, 200, 0.24)",
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% + ${joystickPosition.x * 40}px), calc(-50% + ${joystickPosition.y * 40}px))`,
                transition:
                  joystickPosition.x === 0 && joystickPosition.y === 0
                    ? "transform 200ms ease, background 140ms ease"
                    : "background 140ms ease",
                pointerEvents: "none",
              }}
            />
          </div>
          <div
            style={{
              color: "#242424",
              fontSize: "0.42rem",
              letterSpacing: "0.12em",
            }}
          >
            W·A·S·D / ARROWS
          </div>
        </div>
      )}

      {/* Goal scored */}
      {gameWon && (
        <div
          className="sand-score-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 25,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            fontFamily: "var(--font-geist-mono)",
          }}
        >
          <a
            className="sand-score-card"
            href="mailto:thecyberfoolz@gmail.com"
            aria-label="Email thecyberfoolz@gmail.com"
          >
            <div className="sand-score-kicker">
              → GOAL_SCORED // SIGNAL_CONFIRMED
            </div>
            <div className="sand-score-title" aria-hidden="true">
              <span className="sand-score-title-default">MAKE_CONTACT</span>
              <span className="sand-score-title-hover">EMAIL</span>
            </div>
            <div className="sand-score-meta">FIELD: #249958 / STATUS: LIVE</div>
          </a>
        </div>
      )}
    </div>
  );
}

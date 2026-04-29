import * as THREE from 'three'

export const REFERENCE_ASPECT = 16 / 10

export type DesignFrame = {
  width: number
  height: number
}

export type ViewportMetrics = {
  width: number
  height: number
  aspect: number
}

export function viewportMetrics(): ViewportMetrics {
  const width = Math.max(1, window.innerWidth)
  const height = Math.max(1, window.innerHeight)
  return { width, height, aspect: width / height }
}

export function worldFrameAtDistance(
  fov: number,
  distance: number,
  aspect = REFERENCE_ASPECT,
): DesignFrame {
  const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) * 0.5) * distance
  return { width: height * aspect, height }
}

export function containDistanceForFrame(
  camera: THREE.PerspectiveCamera,
  frame: DesignFrame,
  aspect = viewportMetrics().aspect,
) {
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5)
  const distanceForHeight = frame.height / (2 * tan)
  const distanceForWidth = frame.width / (2 * tan * aspect)
  return Math.max(distanceForHeight, distanceForWidth)
}

export function fitPerspectiveCamera(
  camera: THREE.PerspectiveCamera,
  frame: DesignFrame,
  viewport = viewportMetrics(),
) {
  camera.aspect = viewport.aspect
  camera.position.z = containDistanceForFrame(camera, frame, viewport.aspect)
  camera.updateProjectionMatrix()
}

export function fitOffsetFromTarget(
  offset: THREE.Vector3,
  baseDistance: number,
  fittedDistance: number,
) {
  return offset.clone().multiplyScalar(fittedDistance / baseDistance)
}

export function narrowAspectScale(aspect = viewportMetrics().aspect, maxScale = 1.8) {
  return THREE.MathUtils.clamp(REFERENCE_ASPECT / aspect, 1, maxScale)
}

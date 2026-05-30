type AudioFreqs = { bass: number; mid: number; treble: number; highSpike: number; snare: number }

const SNARE_THRESHOLD = 0.018
const SNARE_FOLLOW = 0.22
const SNARE_DECAY = 0.84
const SNARE_GAIN = 8.5
const HIGH_SPIKE_THRESHOLD = 0.0018
const HIGH_SPIKE_FOLLOW = 0.48
const HIGH_SPIKE_DECAY = 0.42
const HIGH_SPIKE_GAIN = 32

// Singleton audio analyser — shared across components. Only one MediaElementSource per element.
const store: {
  node: AnalyserNode | null
  data: Uint8Array | null
  previousSnareBand: number
  previousTrebleBand: number
  snareEnv: number
  highSpikeEnv: number
  lastAnalysisAt: number
  cached: AudioFreqs
} = {
  node: null,
  data: null,
  previousSnareBand: 0,
  previousTrebleBand: 0,
  snareEnv: 0,
  highSpikeEnv: 0,
  lastAnalysisAt: -Infinity,
  cached: { bass: 0, mid: 0, treble: 0, highSpike: 0, snare: 0 },
}

export function initAudioAnalyser(audioEl: HTMLAudioElement): void {
  if (store.node) return
  try {
    const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const src = ctx.createMediaElementSource(audioEl)
    store.node = ctx.createAnalyser()
    store.node.fftSize = 256
    src.connect(store.node)
    store.node.connect(ctx.destination)
    store.data = new Uint8Array(store.node.frequencyBinCount)
  } catch (_) {}
}

export function getAudioFreqs(): AudioFreqs {
  if (!store.node || !store.data) return { bass: 0, mid: 0, treble: 0, highSpike: 0, snare: 0 }
  const now = performance.now()
  if (now - store.lastAnalysisAt < 12) return store.cached

  store.node.getByteFrequencyData(store.data as Uint8Array<ArrayBuffer>)
  const d = store.data
  const bass = (d[0] + d[1] + d[2] + d[3]) / (4 * 255)
  let mid = 0
  for (let i = 4; i < 24; i++) mid += d[i]
  let snareBand = 0
  const snareStart = Math.min(10, d.length - 1)
  const snareEnd = Math.min(48, d.length)
  for (let i = snareStart; i < snareEnd; i++) snareBand += d[i]
  snareBand /= Math.max(1, snareEnd - snareStart) * 255
  let treble = 0
  const trebleStart = Math.min(28, d.length - 1)
  const trebleEnd = Math.min(82, d.length)
  for (let i = trebleStart; i < trebleEnd; i++) treble += d[i]
  treble /= Math.max(1, trebleEnd - trebleStart) * 255

  const transient = Math.max(0, snareBand - store.previousSnareBand - SNARE_THRESHOLD)
  store.previousSnareBand += (snareBand - store.previousSnareBand) * SNARE_FOLLOW
  store.snareEnv = Math.max(store.snareEnv * SNARE_DECAY, Math.min(1, transient * SNARE_GAIN))
  const highTransient = Math.max(0, treble - store.previousTrebleBand - HIGH_SPIKE_THRESHOLD)
  store.previousTrebleBand += (treble - store.previousTrebleBand) * HIGH_SPIKE_FOLLOW
  store.highSpikeEnv = Math.max(store.highSpikeEnv * HIGH_SPIKE_DECAY, Math.min(1, highTransient * HIGH_SPIKE_GAIN))

  store.lastAnalysisAt = now
  store.cached = { bass, mid: mid / (20 * 255), treble, highSpike: store.highSpikeEnv, snare: store.snareEnv }
  return store.cached
}

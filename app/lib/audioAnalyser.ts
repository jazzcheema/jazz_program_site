// Singleton audio analyser — shared across components. Only one MediaElementSource per element.
const store: {
  node: AnalyserNode | null
  data: Uint8Array | null
} = { node: null, data: null }

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

export function getAudioFreqs(): { bass: number; mid: number } {
  if (!store.node || !store.data) return { bass: 0, mid: 0 }
  store.node.getByteFrequencyData(store.data as Uint8Array<ArrayBuffer>)
  const d = store.data
  const bass = (d[0] + d[1] + d[2] + d[3]) / (4 * 255)
  let mid = 0
  for (let i = 4; i < 24; i++) mid += d[i]
  return { bass, mid: mid / (20 * 255) }
}

/**
 * Signal generator. Every constant here is a TEACHING CHOICE, not a measurement.
 * None of these values are Meta's, and the output is in arbitrary model units.
 *
 * sourceActivation  ->  mixToElectrodes  ->  applyContactQuality  ->  addNoiseArtifact
 */
import type { Gesture, GeneratorOutput, TrialConfig } from './types'
import { seededRandom } from './random'

export const CHANNELS = 8
export const SOURCES = 6
export const TRIAL_SECONDS = 1.6
export const CONTACT_ANGLES = Array.from({ length: CHANNELS }, (_, i) => i * 45)
/** Where six generic source groups sit around the wrist, in degrees. */
export const SOURCE_ANGLES = [18, 84, 142, 198, 262, 324]
/** Spatial selectivity of a contact. Larger is narrower. */
const KAPPA = 8
export const ONSET = 0.34

export const DEFAULT_TRIAL: TrialConfig = {
  requestedGesture: 'rest', seed: 7, intensity: 1, placementAngle: 0,
  contactQuality: 1, noiseLevel: 1, userProfile: 0, sampleRate: 1000,
}

/** [amplitude, centre seconds after onset, width seconds] per source group. */
type Burst = [number, number, number]
const SCORE: Record<Gesture, Burst[][]> = {
  rest: [[], [], [], [], [], []],
  // Two neighbouring groups fire together, a third supports briefly.
  pinch: [[[0.3, 0.2, 0.12]], [[1.15, 0.26, 0.15]], [[1.0, 0.3, 0.17]], [[0.16, 0.36, 0.12]], [], []],
  // A wave that travels around one side of the wrist...
  left: [[], [], [[0.12, 0.3, 0.2]], [[1.0, 0.1, 0.085]], [[1.0, 0.3, 0.085]], [[1.0, 0.5, 0.085]]],
  // ...and the same wave travelling the other way. Total energy is alike; order is not.
  right: [[], [], [[0.12, 0.3, 0.2]], [[1.0, 0.5, 0.085]], [[1.0, 0.3, 0.085]], [[1.0, 0.1, 0.085]]],
}
const PROFILES = [
  { shift: [0, 0, 0, 0, 0, 0], gain: [1, 1, 1, 1, 1, 1] },
  { shift: [10, -12, 14, 8, -14, 10], gain: [1.1, 0.85, 1, 0.9, 1.15, 0.9] },
  { shift: [-16, 18, -10, 16, 12, -18], gain: [0.85, 1.1, 0.8, 1.15, 0.85, 1.1] },
]

/** Smooth drive per source, before any spiking. */
export function sourceDrive(cfg: TrialConfig, rnd: ReturnType<typeof seededRandom>) {
  const n = Math.round(TRIAL_SECONDS * cfg.sampleRate)
  const jitter = cfg.requestedGesture === 'rest' ? 0 : (rnd.next() - 0.5) * 0.06
  const tempo = 1 + (rnd.next() - 0.5) * 0.08
  const prof = PROFILES[cfg.userProfile] ?? PROFILES[0]
  const amp = Math.min(1.6, Math.max(0.15, cfg.intensity))
  return Array.from({ length: SOURCES }, (_, s) => {
    const d = new Float32Array(n)
    const g = (0.92 + rnd.next() * 0.16) * prof.gain[s] * amp
    for (let i = 0; i < n; i++) {
      const t = i / cfg.sampleRate - ONSET - jitter
      let v = 0
      for (const [a, c, w] of SCORE[cfg.requestedGesture][s]) {
        const x = (t - c * tempo) / w
        v += a * Math.exp(-0.5 * x * x)
      }
      d[i] = 0.045 + v * g // tonic floor: a resting body is never silent
    }
    return d
  })
}

/** Signed, spiky source activity: overlapping triphasic unit potentials plus a little broadband. */
export function sourceActivation(drive: Float32Array[], cfg: TrialConfig, rnd: ReturnType<typeof seededRandom>) {
  const sr = cfg.sampleRate
  return drive.map((d) => {
    const out = new Float32Array(d.length)
    for (let i = 0; i < d.length; i++) {
      // firing becomes denser with drive, potentials slightly larger
      const rate = (90 + 420 * d[i]) / sr
      if (rnd.next() < rate) {
        const w = 0.0016 + rnd.next() * 0.0012
        const a = (0.5 + rnd.next()) * Math.sqrt(d[i]) * (rnd.next() < 0.5 ? -1 : 1)
        const half = Math.ceil(w * 4 * sr)
        for (let k = -half; k <= half; k++) {
          const j = i + k
          if (j < 0 || j >= d.length) continue
          const x = k / sr / w
          out[j] += a * (1 - x * x) * Math.exp(-0.5 * x * x)
        }
      }
      out[i] += rnd.normal() * 0.22 * d[i]
    }
    return out
  })
}

/** Circular mixing weight from a source to a contact. Rotation moves the whole ring of contacts. */
export function mixWeight(channel: number, source: number, placementAngle: number, userProfile = 0) {
  const prof = PROFILES[userProfile] ?? PROFILES[0]
  const a = ((CONTACT_ANGLES[channel] + placementAngle - SOURCE_ANGLES[source] - prof.shift[source]) * Math.PI) / 180
  return Math.exp(KAPPA * (Math.cos(a) - 1))
}

export function mixToElectrodes(sources: Float32Array[], placementAngle: number, userProfile = 0) {
  const n = sources[0].length
  return Array.from({ length: CHANNELS }, (_, c) => {
    const out = new Float32Array(n)
    for (let s = 0; s < SOURCES; s++) {
      const w = mixWeight(c, s, placementAngle, userProfile)
      for (let i = 0; i < n; i++) out[i] += w * sources[s][i]
    }
    return out
  })
}

/** How exposed each contact is when the band is loose. The underside lifts first. */
const LIFT = [0.45, 0.9, 1, 0.95, 0.6, 0.3, 0.15, 0.2]
export const channelQuality = (c: number, contactQuality: number) => 1 - (1 - contactQuality) * LIFT[c]

export function applyContactQuality(mixed: Float32Array[], contactQuality: number) {
  return mixed.map((m, c) => {
    const g = Math.pow(channelQuality(c, contactQuality), 1.6)
    return m.map((v) => v * g)
  })
}

export function addNoiseArtifact(x: Float32Array[], cfg: TrialConfig, rnd: ReturnType<typeof seededRandom>) {
  const n = x[0].length
  const common = new Float32Array(n)
  const ph = rnd.next() * 6.28
  for (let i = 0; i < n; i++) common[i] = 0.02 * cfg.noiseLevel * Math.sin(2 * Math.PI * 50 * (i / cfg.sampleRate) + ph)
  return x.map((m, c) => {
    const q = channelQuality(c, cfg.contactQuality)
    const sd = 0.07 * cfg.noiseLevel * (1 + 2.2 * (1 - q))
    const f1 = 1.2 + rnd.next() * 2.5, p1 = rnd.next() * 6.28
    const at = 0.2 + rnd.next() * 1.1, aw = 0.03 + rnd.next() * 0.04
    const artifact = (1 - q) * (0.9 + rnd.next() * 0.6)
    return m.map((v, i) => {
      const t = i / cfg.sampleRate
      const bump = Math.exp(-0.5 * ((t - at) / aw) ** 2) * Math.sin(2 * Math.PI * 16 * (t - at))
      const drift = 0.06 * Math.sin(2 * Math.PI * f1 * t + p1) * (1 + 4 * (1 - q))
      return v + rnd.normal() * sd + common[i] + drift + artifact * bump
    })
  })
}

export function createRecording(cfg: TrialConfig): GeneratorOutput {
  const rnd = seededRandom(cfg.seed)
  const drive = sourceDrive(cfg, rnd)
  const sources = sourceActivation(drive, cfg, rnd)
  const mixed = mixToElectrodes(sources, cfg.placementAngle, cfg.userProfile)
  const contacted = applyContactQuality(mixed, cfg.contactQuality)
  const samples = addNoiseArtifact(contacted, cfg, rnd)
  return { samples, sampleRate: cfg.sampleRate, sources, sourceDrive: drive }
}

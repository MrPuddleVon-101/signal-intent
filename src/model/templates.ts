import { CHANNELS, createRecording, DEFAULT_TRIAL, ONSET } from './generator'
import { estimateBaseline, extractFeatures, highPass, WINDOW_SEC, WINDOWS } from './decoder'
import type { DecoderConfig, Gesture, Recording, Templates, TrialConfig } from './types'
import { GESTURES } from './types'

/** Labelled examples are cut at the cued moment, the way a guided session would cut them. */
export function featureOfExample(rec: Recording) {
  const f = rec.samples.map((x) => highPass(x, rec.sampleRate))
  const end = Math.round((ONSET - 0.02 + WINDOWS * WINDOW_SEC) * rec.sampleRate)
  return extractFeatures(f, estimateBaseline(f, rec.sampleRate), end, rec.sampleRate)
}
export function meanVector(vs: Float32Array[]) {
  const m = new Float32Array(CHANNELS * WINDOWS)
  for (const v of vs) v.forEach((x, i) => (m[i] += x / vs.length))
  return m
}
const TRAIN_SEEDS = Array.from({ length: 12 }, (_, i) => 90001 + i * 17)
function build(): Templates {
  const vectors = {} as Record<Gesture, Float32Array>
  for (const g of GESTURES)
    vectors[g] = meanVector(TRAIN_SEEDS.map((seed) => featureOfExample(createRecording({ ...DEFAULT_TRIAL, requestedGesture: g, seed }))))
  return { version: 0, vectors }
}
export const BASE_TEMPLATES: Templates = build()
export const BLEND = 0.85
export const CALIBRATION_TRIALS = 3
export const DEFAULT_DECODER: DecoderConfig = {
  templates: BASE_TEMPLATES, threshold: 0.66, margin: 0.12, gate: 0.16, stableFrames: 3, refractoryMs: 450,
}

export interface CalibrationExample { gesture: Gesture; seed: number; recording: Recording }
/** Three labelled demonstrations per class at the current placement. Seeds never overlap test seeds. */
export function collectExamples(setup: Pick<TrialConfig, 'placementAngle' | 'contactQuality' | 'noiseLevel' | 'userProfile'>, baseSeed: number): CalibrationExample[] {
  return GESTURES.flatMap((gesture, gi) =>
    Array.from({ length: CALIBRATION_TRIALS }, (_, k) => {
      const seed = 500000 + baseSeed * 64 + gi * 8 + k
      return { gesture, seed, recording: createRecording({ ...DEFAULT_TRIAL, ...setup, requestedGesture: gesture, seed }) }
    }))
}
export function calibrateTemplates(base: Templates, examples: CalibrationExample[], blend = BLEND): Templates {
  const vectors = { ...base.vectors }
  for (const g of GESTURES) {
    const mine = examples.filter((e) => e.gesture === g)
    if (!mine.length) continue
    const m = meanVector(mine.map((e) => featureOfExample(e.recording)))
    vectors[g] = base.vectors[g].map((v, i) => v * (1 - blend) + m[i] * blend)
  }
  return { version: base.version + 1, vectors }
}

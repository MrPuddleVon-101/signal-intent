export type Gesture = 'rest' | 'pinch' | 'left' | 'right'
export type EventToken = 'SELECT' | 'PREVIOUS' | 'NEXT'
export const GESTURES: Gesture[] = ['rest', 'pinch', 'left', 'right']
export const GESTURE_LABEL: Record<Gesture, string> = { rest: 'Rest', pinch: 'Pinch', left: 'Swipe left', right: 'Swipe right' }
export const EVENT_FOR: Record<Gesture, EventToken | null> = { rest: null, pinch: 'SELECT', left: 'PREVIOUS', right: 'NEXT' }

/** Generator input. `requestedGesture` never travels past the generator. */
export interface TrialConfig {
  requestedGesture: Gesture
  seed: number
  intensity: number      // 0.3 to 1.4, scales burst amplitude
  placementAngle: number // conceptual degrees, 0 to 45
  contactQuality: number // 0 (poor) to 1 (good)
  noiseLevel: number     // 0 to 3, 1 is the default baseline
  userProfile: number    // 0, 1 or 2: a generic anatomy variation
  sampleRate: number
}
export interface Recording {
  samples: Float32Array[] // CHANNELS arrays of signed model units
  sampleRate: number
}
export interface GeneratorOutput extends Recording {
  sources: Float32Array[]     // signed latent source activity, kept for inspection only
  sourceDrive: Float32Array[] // smooth activation envelopes, kept for inspection only
}
export interface Templates { version: number; vectors: Record<Gesture, Float32Array> }
export interface DecoderConfig {
  templates: Templates
  threshold: number
  margin: number
  gate: number
  stableFrames: number
  refractoryMs: number
  channelMask?: boolean[] // optional: isolate channels
  windowOrder?: number[]  // optional: scramble the order of the time windows
}
export type Phase = 'Ready' | 'Candidate' | 'Fired' | 'Cooldown'
export interface Frame {
  t: number
  activity: number
  gateOpen: boolean
  scores: Record<Gesture, number>
  top: Gesture
  phase: Phase
}
export interface Decision {
  filtered: Float32Array[]
  envelope: Float32Array[]
  baseline: Float32Array
  frames: Frame[]
  decisionFrame: number       // index of the frame shown as "the decision"
  features: Float32Array      // CHANNELS * WINDOWS at the decision frame
  scores: Record<Gesture, number>
  ranked: Gesture[]
  contributions: Float32Array // per channel share of distance to the top class
  event: EventToken | null
  eventTime: number | null
  reason: string
}

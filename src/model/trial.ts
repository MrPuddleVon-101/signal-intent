import { createRecording, DEFAULT_TRIAL } from './generator'
import { decode } from './decoder'
import type { Decision, DecoderConfig, EventToken, GeneratorOutput, TrialConfig } from './types'

/** The one object every view reads. Nothing downstream invents its own numbers. */
export interface Trial {
  id: number
  config: TrialConfig
  recording: GeneratorOutput
  decision: Decision
  provenance: 'simulation'
}
let nextId = 1
export function runTrial(partial: Partial<TrialConfig>, decoder: DecoderConfig): Trial {
  const config = { ...DEFAULT_TRIAL, ...partial }
  const recording = createRecording(config)
  // Only numbers cross this line.
  const decision = decode({ samples: recording.samples, sampleRate: recording.sampleRate }, decoder)
  return { id: nextId++, config, recording, decision, provenance: 'simulation' }
}

export interface GlassesState { focus: number; selected: number | null; lastEvent: EventToken | null; count: number }
export const CARDS = ['Message', 'Music', 'Map'] as const
export const GLASSES_INITIAL: GlassesState = { focus: 1, selected: null, lastEvent: null, count: 0 }
/** Pure: previous UI state + emitted event. Focus clamps at the ends. */
export function commandReducer(s: GlassesState, e: EventToken | null): GlassesState {
  if (!e) return s
  const base = { ...s, lastEvent: e, count: s.count + 1 }
  if (e === 'SELECT') return { ...base, selected: s.selected === s.focus ? null : s.focus }
  const focus = Math.max(0, Math.min(CARDS.length - 1, s.focus + (e === 'NEXT' ? 1 : -1)))
  return { ...base, focus, selected: null }
}

import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { BASE_TEMPLATES, calibrateTemplates, collectExamples, DEFAULT_DECODER } from './model/templates'
import { decode } from './model/decoder'
import { TRIAL_SECONDS } from './model/generator'
import { commandReducer, GLASSES_INITIAL, runTrial, type GlassesState, type Trial } from './model/trial'
import type { DecoderConfig, Gesture, Templates, TrialConfig } from './model/types'

export const DEMO_SEED = 58
export const RATE = 1.05 // playback speed of a trial
export interface Settings { placementAngle: number; contactQuality: number; intensity: number; noiseLevel: number; userProfile: number }
export const DEFAULT_SETTINGS: Settings = { placementAngle: 0, contactQuality: 1, intensity: 1, noiseLevel: 1, userProfile: 0 }
const decoderDefaults = () => ({ ...DEFAULT_DECODER })

export interface State {
  settings: Settings
  decoder: DecoderConfig
  calibrated: boolean
  trial: Trial | null
  idle: Trial
  playing: boolean
  eventDone: boolean
  startedAt: number
  seedCounter: number
  lastGesture: Gesture
  glasses: GlassesState
  seenSuccess: boolean
  selected: number | null
  paused: boolean
  reduced: boolean
  sound: boolean
  worldReady: boolean
  noWebgl: boolean
  panel: null | 'simulated' | 'how'
  run: (g: Gesture, opts?: { seed?: number }) => void
  set: (p: Partial<Settings>) => void
  setDecoder: (p: Partial<DecoderConfig>) => void
  calibrate: (baseSeed: number) => Templates
  resetTraining: () => void
  resetGlasses: () => void
  resetAll: () => void
}

export const getConfig = (s: State, g: Gesture, seed: number): Partial<TrialConfig> => ({ requestedGesture: g, seed, ...s.settings })
const listeners = new Set<(t: Trial) => void>()
/** The event boundary. Fires once per emitted command, never from a button. */
export const onCommand = (f: (t: Trial) => void) => { listeners.add(f); return () => { listeners.delete(f) } }
const started = new Set<(t: Trial) => void>()
export const onTrialStart = (f: (t: Trial) => void) => { started.add(f); return () => { started.delete(f) } }
const DEV = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev')

export const store = createStore<State>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS }, decoder: decoderDefaults(), calibrated: false,
  trial: null, idle: runTrial({ requestedGesture: 'rest', seed: 11 }, decoderDefaults()),
  playing: false, eventDone: false, startedAt: 0, seedCounter: 0, lastGesture: 'rest',
  glasses: GLASSES_INITIAL, seenSuccess: false, selected: null,
  paused: false, reduced: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  sound: false, worldReady: false, noWebgl: false, panel: null,
  run(g, opts) {
    const s = get()
    if (s.playing) return
    const seed = opts?.seed ?? (s.seedCounter === 0 ? DEMO_SEED : DEMO_SEED + s.seedCounter * 13)
    const trial = runTrial(getConfig(s, g, seed), s.decoder)
    if (DEV) console.info('[trial]', trial.id, { seed, features: Array.from(trial.decision.features), ranked: trial.decision.ranked, scores: trial.decision.scores, event: trial.decision.event })
    set({ trial, playing: true, eventDone: false, startedAt: performance.now(), seedCounter: s.seedCounter + 1, lastGesture: g })
    started.forEach((f) => f(trial))
    if (s.reduced) finish()
  },
  set(p) { set((s) => ({ settings: { ...s.settings, ...p } })) },
  setDecoder(p) { set((s) => ({ decoder: { ...s.decoder, ...p } })) },
  calibrate(baseSeed) {
    const s = get()
    const templates = calibrateTemplates(s.decoder.templates, collectExamples(s.settings, baseSeed))
    set({ decoder: { ...s.decoder, templates }, calibrated: true })
    return templates
  },
  resetTraining() { set((s) => ({ decoder: { ...s.decoder, templates: BASE_TEMPLATES }, calibrated: false })) },
  resetGlasses() { set({ glasses: GLASSES_INITIAL }) },
  resetAll() { set({ settings: { ...DEFAULT_SETTINGS }, decoder: decoderDefaults(), calibrated: false, trial: null, playing: false, glasses: GLASSES_INITIAL, seedCounter: 0, selected: null, seenSuccess: false }) },
}))
export const useS = <T,>(f: (s: State) => T) => useStore(store, f)
export const redecode = (t: Trial, d: DecoderConfig): Trial => ({ ...t, decision: decode({ samples: t.recording.samples, sampleRate: t.recording.sampleRate }, d) })

function emit() {
  const { trial, glasses, eventDone } = store.getState()
  if (!trial || eventDone) return
  const e = trial.decision.event
  store.setState({ eventDone: true, glasses: commandReducer(glasses, e) })
  if (e) { listeners.forEach((f) => f(trial)); store.setState({ seenSuccess: true }) }
}
function finish() { emit(); store.setState({ playing: false }) }

/** Trial playhead in seconds. Called once per frame. */
export function tick(now: number) {
  const s = store.getState()
  if (!s.playing || !s.trial) return
  const t = ((now - s.startedAt) / 1000) * RATE
  const et = s.trial.decision.eventTime
  if (et !== null && t >= et) emit()
  if (t >= TRIAL_SECONDS) finish()
}
export function playhead(now = performance.now()) {
  const s = store.getState()
  return s.playing ? Math.max(0, Math.min(TRIAL_SECONDS, ((now - s.startedAt) / 1000) * RATE)) : TRIAL_SECONDS
}
/** What the body is doing right now: the running trial, or the resting loop. */
export function live(now = performance.now()) {
  const s = store.getState()
  if (s.playing && s.trial) return { trial: s.trial, t: playhead(now) }
  const span = TRIAL_SECONDS - 0.2
  const u = (now / 1000) % (span * 2)
  return { trial: s.idle, t: 0.1 + (u < span ? u : span * 2 - u) }
}
const buf = new Array(8).fill(0)
export function liveEnvelope(now = performance.now()) {
  const { trial, t } = live(now)
  const i = Math.max(0, Math.floor(t * trial.recording.sampleRate))
  for (let c = 0; c < 8; c++) buf[c] = trial.decision.envelope[c][Math.min(i, trial.decision.envelope[c].length - 1)]
  return buf
}

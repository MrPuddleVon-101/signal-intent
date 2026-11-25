import { describe, expect, it, vi } from 'vitest'
import { createRecording, DEFAULT_TRIAL } from '../src/model/generator'
import { decode, extractFeatures } from '../src/model/decoder'
import { BASE_TEMPLATES, calibrateTemplates, collectExamples, DEFAULT_DECODER } from '../src/model/templates'
import { commandReducer, GLASSES_INITIAL, runTrial } from '../src/model/trial'
import { UnitStream } from '../src/model/units'
import type { Gesture } from '../src/model/types'

const flat = (x: Float32Array[]) => x.flatMap((c) => Array.from(c))
const rec = (p: object) => createRecording({ ...DEFAULT_TRIAL, ...p })
const seeds = Array.from({ length: 30 }, (_, i) => 1000 + i)
const count = (p: object, ev: string | null, d = DEFAULT_DECODER) => seeds.filter((seed) => runTrial({ ...p, seed }, d).decision.event === ev).length

describe('generator', () => {
  it('is deterministic for a fixed config and seed', () => expect(flat(rec({ requestedGesture: 'pinch' }).samples)).toEqual(flat(rec({ requestedGesture: 'pinch' }).samples)))
  it.each([['seed', { seed: 8 }], ['gesture', { requestedGesture: 'left' }], ['placement', { placementAngle: 20 }], ['contact', { contactQuality: 0.4 }], ['intensity', { intensity: 0.5 }], ['noise', { noiseLevel: 2 }], ['profile', { userProfile: 1 }]])
  ('samples change when %s changes', (_n, p) => expect(flat(rec({ requestedGesture: 'pinch', ...p }).samples)).not.toEqual(flat(rec({ requestedGesture: 'pinch' }).samples)))
  it('placement changes mixing but not the muscles', () => expect(flat(rec({ requestedGesture: 'pinch', placementAngle: 40 }).sources)).toEqual(flat(rec({ requestedGesture: 'pinch' }).sources)))
  it('rest is never electrically silent, and signals are signed', () => {
    for (const c of rec({ requestedGesture: 'rest' }).samples) { expect(Math.max(...c)).toBeGreaterThan(0); expect(Math.min(...c)).toBeLessThan(0) }
  })
})

describe('decoder', () => {
  it('cannot read the generator label: misleading labels do not change the result', () => {
    const r = rec({ requestedGesture: 'pinch' })
    const a = decode({ samples: r.samples, sampleRate: r.sampleRate }, DEFAULT_DECODER)
    const liar = { samples: r.samples, sampleRate: r.sampleRate, requestedGesture: 'left', config: { requestedGesture: 'right' } }
    const b = decode(liar as never, DEFAULT_DECODER)
    expect(b.event).toBe(a.event); expect(b.scores).toEqual(a.scores)
  })
  it.each([['pinch', 'SELECT'], ['left', 'PREVIOUS'], ['right', 'NEXT']])('%s is decoded at the default fit', (g, e) => expect(count({ requestedGesture: g }, e)).toBeGreaterThanOrEqual(29))
  it('rest emits nothing under normal noise', () => expect(count({ requestedGesture: 'rest' }, null)).toBe(30))
  it('a very weak pinch is often missed', () => expect(count({ requestedGesture: 'pinch', intensity: 0.2 }, null)).toBeGreaterThan(20))
  it('a shifted band reliably loses the pinch', () => expect(count({ requestedGesture: 'pinch', placementAngle: 42 }, null)).toBeGreaterThan(24))
  it('a small shift is tolerated', () => expect(count({ requestedGesture: 'pinch', placementAngle: 10 }, 'SELECT')).toBeGreaterThan(28))
  it('a loose band loses the pinch', () => expect(count({ requestedGesture: 'pinch', contactQuality: 0.3 }, null)).toBeGreaterThan(27))
  it('reversing time windows turns swipes around', () => {
    const d = { ...DEFAULT_DECODER, windowOrder: [3, 2, 1, 0] }
    expect(count({ requestedGesture: 'left' }, 'NEXT', d)).toBeGreaterThan(25)
    expect(count({ requestedGesture: 'right' }, 'PREVIOUS', d)).toBeGreaterThan(25)
  })
  it('left and right carry similar total energy', () => {
    const e = (g: Gesture) => flat(rec({ requestedGesture: g, seed: 3 }).samples).reduce((s, v) => s + v * v, 0)
    expect(e('left') / e('right')).toBeGreaterThan(0.7); expect(e('left') / e('right')).toBeLessThan(1.4)
  })
  it('one isolated contact cannot recover swipes', () => {
    const d = { ...DEFAULT_DECODER, channelMask: Array.from({ length: 8 }, (_, i) => i === 2) }
    expect(count({ requestedGesture: 'left' }, 'PREVIOUS', d)).toBe(0)
  })
  it('threshold and margin are real: an impossible threshold blocks everything', () => expect(count({ requestedGesture: 'pinch' }, null, { ...DEFAULT_DECODER, threshold: 1.1 })).toBe(30))
  it('debounces: one pinch, one event', () => {
    for (const seed of seeds) {
      const d = runTrial({ requestedGesture: 'pinch', seed }, DEFAULT_DECODER).decision
      expect(d.frames.filter((f) => f.phase === 'Fired').length).toBeLessThanOrEqual(1)
    }
  })
  it('scores stay bounded', () => { for (const s of Object.values(runTrial({ requestedGesture: 'left' }, DEFAULT_DECODER).decision.scores)) { expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(1) } })
  it('features have eight contacts by four windows', () => {
    const d = runTrial({ requestedGesture: 'pinch' }, DEFAULT_DECODER).decision
    expect(extractFeatures(d.filtered, d.baseline, 900, 1000).length).toBe(32)
  })
})

describe('calibration', () => {
  const setup = { placementAngle: 42, contactQuality: 1, noiseLevel: 1, userProfile: 0 }
  it('recovers a shifted band on held-out trials, with separate seeds', () => {
    const ex = collectExamples(setup, 3)
    const used = new Set(ex.map((e) => e.seed))
    seeds.forEach((s) => expect(used.has(s)).toBe(false))
    const t = calibrateTemplates(BASE_TEMPLATES, ex)
    const before = count({ requestedGesture: 'pinch', ...setup }, 'SELECT')
    const after = count({ requestedGesture: 'pinch', ...setup }, 'SELECT', { ...DEFAULT_DECODER, templates: t })
    expect(after).toBeGreaterThan(before + 15)
  })
  it('can make another placement worse', () => {
    const t = calibrateTemplates(BASE_TEMPLATES, collectExamples(setup, 3))
    const d = { ...DEFAULT_DECODER, templates: t }
    expect(runTrial({ requestedGesture: 'pinch', seed: 7 }, d).decision.scores.pinch).toBeLessThan(0.9)
  })
  it('does not mutate base templates', () => {
    const snap = Array.from(BASE_TEMPLATES.vectors.pinch)
    calibrateTemplates(BASE_TEMPLATES, collectExamples(setup, 1))
    expect(Array.from(BASE_TEMPLATES.vectors.pinch)).toEqual(snap)
  })
})

describe('glasses', () => {
  it('null changes nothing', () => expect(commandReducer(GLASSES_INITIAL, null)).toBe(GLASSES_INITIAL))
  it('responds to the decoded event, even a wrong one', () => {
    const d = runTrial({ requestedGesture: 'left', seed: 7 }, { ...DEFAULT_DECODER, windowOrder: [3, 2, 1, 0] }).decision
    expect(d.event).toBe('NEXT')
    expect(commandReducer(GLASSES_INITIAL, d.event).focus).toBe(2)
  })
  it('focus clamps and SELECT toggles', () => {
    let s = GLASSES_INITIAL
    for (let i = 0; i < 5; i++) s = commandReducer(s, 'NEXT')
    expect(s.focus).toBe(2)
    s = commandReducer(s, 'SELECT'); expect(s.selected).toBe(2)
    s = commandReducer(s, 'SELECT'); expect(s.selected).toBe(null)
  })
  it('the event boundary is the only input', () => {
    const spy = vi.fn(commandReducer)
    const t = runTrial({ requestedGesture: 'pinch', placementAngle: 42, seed: 1001 }, DEFAULT_DECODER)
    spy(GLASSES_INITIAL, t.decision.event)
    expect(spy.mock.calls[0]).toEqual([GLASSES_INITIAL, t.decision.event])
  })
})

describe('motor unit figure', () => {
  it('recruits more activity with more effort', () => {
    const e = (x: number) => { const s = new UnitStream(); s.step(700, x); return s.sum.reduce((a, v) => a + v * v, 0) }
    expect(e(0.9)).toBeGreaterThan(e(0.3) * 2)
  })
})

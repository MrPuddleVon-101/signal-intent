/**
 * Decoder. It accepts ONLY numeric samples and a decoder configuration.
 * There is no route for a gesture label to reach this file.
 */
import type { Decision, DecoderConfig, EventToken, Frame, Gesture, Phase, Recording, Templates } from './types'
import { EVENT_FOR, GESTURES } from './types'

export const WINDOWS = 4
export const WINDOW_SEC = 0.15
export const HOP_SEC = 0.02
const SIGMA = 0.5

/** First-order high-pass (about 20 Hz) removes drift and slow artifact. */
export function highPass(x: Float32Array, sr: number, fc = 20) {
  const a = Math.exp((-2 * Math.PI * fc) / sr)
  const out = new Float32Array(x.length)
  let px = x[0], py = 0
  for (let i = 0; i < x.length; i++) {
    py = a * (py + x[i] - px); px = x[i]; out[i] = py
  }
  return out
}

/** Centred moving RMS: square nearby samples, average, take the square root. */
export function computeEnvelope(x: Float32Array, sr: number, win = 0.05) {
  const h = Math.max(1, Math.round((win * sr) / 2))
  const acc = new Float64Array(x.length + 1)
  for (let i = 0; i < x.length; i++) acc[i + 1] = acc[i] + x[i] * x[i]
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) {
    const a = Math.max(0, i - h), b = Math.min(x.length, i + h + 1)
    out[i] = Math.sqrt((acc[b] - acc[a]) / (b - a))
  }
  return out
}

export function rms(x: Float32Array, a: number, b: number) {
  let s = 0
  for (let i = a; i < b; i++) s += x[i] * x[i]
  return Math.sqrt(s / Math.max(1, b - a))
}

/** Four sequential RMS windows per channel ending at `end`, as log ratios to the quiet baseline. */
export function extractFeatures(filtered: Float32Array[], baseline: Float32Array, end: number, sr: number, order?: number[]) {
  const C = filtered.length, w = Math.round(WINDOW_SEC * sr)
  const f = new Float32Array(C * WINDOWS)
  for (let c = 0; c < C; c++)
    for (let k = 0; k < WINDOWS; k++) {
      const src = order ? order[k] : k
      const a = end - (WINDOWS - src) * w
      f[c * WINDOWS + k] = Math.max(0, Math.log(rms(filtered[c], Math.max(0, a), Math.max(1, a + w)) / baseline[c]))
    }
  return f
}

/** Similarity from distance: exp(-d^2 / 2 sigma^2). A match score, never a probability. */
export function scoreTemplates(f: Float32Array, t: Templates, mask?: boolean[]) {
  const scores = {} as Record<Gesture, number>
  for (const g of GESTURES) {
    const v = t.vectors[g]
    let d = 0, n = 0
    for (let i = 0; i < f.length; i++) {
      if (mask && !mask[Math.floor(i / WINDOWS)]) continue
      const e = f[i] - v[i]; d += e * e; n++
    }
    scores[g] = Math.exp(-(d / Math.max(1, n)) / (2 * SIGMA * SIGMA))
  }
  return scores
}

export function estimateBaseline(filtered: Float32Array[], sr: number) {
  // The quiet lead-in of every recording, floored so a silent contact cannot explode the ratio.
  return Float32Array.from(filtered, (x) => Math.max(0.045, rms(x, Math.round(0.02 * sr), Math.round(0.2 * sr))))
}

const rank = (s: Record<Gesture, number>) => [...GESTURES].sort((a, b) => s[b] - s[a])

export function decode(rec: Recording, cfg: DecoderConfig): Decision {
  const sr = rec.sampleRate
  const filtered = rec.samples.map((x) => highPass(x, sr))
  const envelope = filtered.map((x) => computeEnvelope(x, sr))
  const baseline = estimateBaseline(filtered, sr)
  const n = filtered[0].length
  const hop = Math.round(HOP_SEC * sr), span = Math.round(WINDOWS * WINDOW_SEC * sr)
  const frames: Frame[] = []
  let phase: Phase = 'Ready', run = 0, runClass: Gesture = 'rest', cool = 0
  let event: EventToken | null = null, eventTime: number | null = null, fired = -1

  for (let end = span; end <= n; end += hop) {
    const f = extractFeatures(filtered, baseline, end, sr, cfg.windowOrder)
    const scores = scoreTemplates(f, cfg.templates, cfg.channelMask)
    let activity = 0, m = 0
    for (let c = 0; c < filtered.length; c++) {
      if (cfg.channelMask && !cfg.channelMask[c]) continue
      for (let k = 0; k < WINDOWS; k++) { activity += f[c * WINDOWS + k]; m++ }
    }
    activity /= Math.max(1, m)
    const gateOpen = activity > cfg.gate
    const r = rank(scores), top = r[0]
    const ok = gateOpen && EVENT_FOR[top] !== null && scores[top] >= cfg.threshold && scores[top] - scores[r[1]] >= cfg.margin

    // Ready -> Candidate -> Fired -> Cooldown -> Ready
    if (phase === 'Fired') phase = 'Cooldown'
    else if (phase === 'Cooldown') {
      cool -= HOP_SEC * 1000
      if (cool <= 0 && !ok) { phase = 'Ready'; run = 0 } // needs a release as well as time
    } else if (ok) {
      run = top === runClass ? run + 1 : 1
      runClass = top
      phase = 'Candidate'
      if (run >= cfg.stableFrames) {
        phase = 'Fired'; cool = cfg.refractoryMs; run = 0
        if (event === null) { event = EVENT_FOR[top]; eventTime = end / sr; fired = frames.length }
      }
    } else { phase = 'Ready'; run = 0 }
    frames.push({ t: end / sr, activity, gateOpen, scores, top, phase })
  }

  // The frame we show: the one that fired, otherwise the best-scoring moment while the gate was open,
  // otherwise the most active moment. All of it comes from the samples.
  let pick = fired
  if (pick < 0) {
    let best = -1
    frames.forEach((fr, i) => {
      const s = Math.max(fr.scores.pinch, fr.scores.left, fr.scores.right)
      const v = fr.gateOpen ? 1 + s : fr.activity
      if (v > best) { best = v; pick = i }
    })
  }
  const fr = frames[pick]
  const features = extractFeatures(filtered, baseline, Math.round(fr.t * sr), sr, cfg.windowOrder)
  const ranked = rank(fr.scores)
  const contributions = channelDistance(features, cfg.templates.vectors[ranked[0]])
  let reason: string
  if (event) reason = `${cfg.stableFrames} consecutive frames agreed above the threshold.`
  else if (!fr.gateOpen) reason = 'Activity never rose far enough above resting noise.'
  else if (ranked[0] === 'rest') reason = 'The closest reference was rest.'
  else if (fr.scores[ranked[0]] < cfg.threshold) reason = 'The best match stayed below the threshold.'
  else if (fr.scores[ranked[0]] - fr.scores[ranked[1]] < cfg.margin) reason = 'Two references matched almost equally well.'
  else reason = 'The match did not hold steady for long enough.'
  return { filtered, envelope, baseline, frames, decisionFrame: pick, features, scores: fr.scores, ranked, contributions, event, eventTime, reason }
}

export function channelDistance(f: Float32Array, v: Float32Array) {
  const C = f.length / WINDOWS
  return Float32Array.from({ length: C }, (_, c) => {
    let d = 0
    for (let k = 0; k < WINDOWS; k++) d += (f[c * WINDOWS + k] - v[c * WINDOWS + k]) ** 2
    return Math.sqrt(d / WINDOWS)
  })
}

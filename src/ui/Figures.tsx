/** Figures. Every mark below is read from a trial object. */
import { useEffect, useRef } from 'react'
import type { Trial } from '../model/trial'
import { TRIAL_SECONDS } from '../model/generator'
import { WINDOWS } from '../model/decoder'
import { EVENT_FOR, GESTURES, GESTURE_LABEL, type EventToken } from '../model/types'
import { live, playhead, store } from '../store'
import { C, CLASS_COLOR, heat, heatRGB, Plot, SANS, useFrame, type Ctx } from './lib'
import { clamp } from '../world/math'

export const fmt = (v: number) => v.toFixed(2)
export const WORD: Record<EventToken, string> = { SELECT: 'select', NEXT: 'next', PREVIOUS: 'previous' }
export const word = (e: EventToken | null) => (e ? WORD[e] : 'nothing')

/** Eight signed traces, one gradient stroke each, revealed by the playhead. */
export function LiveTraces() {
  const grads = useRef<{ id: number; w: number; g: CanvasGradient[] }>({ id: -1, w: 0, g: [] })
  const draw = ({ c, w, h, now }: Ctx) => {
    const s = store.getState(), running = s.playing && s.trial, t = s.trial ?? s.idle
    const upto = running ? playhead(now) : s.trial ? TRIAL_SECONDS : live(now).t
    const left = 26, lane = h / 8, span = w - left, sr = t.recording.sampleRate
    if (grads.current.id !== t.id || grads.current.w !== w) {
      grads.current = { id: t.id, w, g: t.decision.envelope.map((e) => { const g = c.createLinearGradient(left, 0, w, 0); for (let k = 0; k <= 22; k++) g.addColorStop(k / 22, heat(0.5 + clamp((e[Math.floor((k / 22) * (e.length - 1))] - 0.1) * 0.8) * 0.5)); return g }) }
    }
    c.font = SANS(560, 11); c.textBaseline = 'middle'
    for (let ch = 0; ch < 8; ch++) {
      const y = lane * (ch + 0.5), d = t.decision.filtered[ch], dim = s.selected !== null && s.selected !== ch && s.trial
      c.globalAlpha = dim ? 0.3 : 1
      c.fillStyle = C.mute; c.fillText('S' + (ch + 1), 0, y)
      c.beginPath()
      const end = Math.min(d.length - 1, Math.floor(upto * sr)), step = Math.max(1, Math.floor(d.length / (span * 1.4)))
      for (let i = 0; i <= end; i += step) c.lineTo(left + (i / (d.length - 1)) * span, y - clamp(d[i], -2.6, 2.6) * lane * 0.46)
      c.strokeStyle = s.trial ? grads.current.g[ch] : 'rgba(243,246,255,.45)'; c.lineWidth = 1.2; c.lineJoin = 'round'; c.stroke()
    }
    c.globalAlpha = 1
    const et = t.decision.eventTime
    if (s.trial && et !== null && upto >= et) { const x = left + (et / TRIAL_SECONDS) * span; c.fillStyle = C.volt; c.fillRect(x, 0, 2, h); c.fillRect(x, 0, 62, 17); c.fillStyle = C.ink; c.font = SANS(650, 11); c.fillText('decision', x + 8, 9) }
  }
  return <Plot className="traces" draw={draw} stamp={(now) => { const s = store.getState(); return s.playing ? now : s.trial ? `${s.trial.id}-${s.selected}` : Math.floor(now / 40) }} label="Eight simulated sensor waveforms, S1 to S8, in arbitrary model units." />
}

/**
 * The iris. Angle is the contact, distance from the centre is time, brightness is activity.
 * Twist the band and the whole pattern turns. That is the mechanism in one picture.
 */
const RES = 176
export function Iris({ features, label, className = '', scan }: { features: Float32Array | null; label: string; className?: string; scan?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), cur = useRef(new Float32Array(32)), goal = useRef<Float32Array | null>(null), dirty = useRef(true), vis = useRef(false)
  useEffect(() => { goal.current = features; dirty.current = true }, [features])
  useEffect(() => { const io = new IntersectionObserver(([e]) => { vis.current = e.isIntersecting; dirty.current = true }, { rootMargin: '80px' }); io.observe(ref.current!); return () => io.disconnect() }, [])
  useFrame((now, dt) => {
    if (!vis.current || (!dirty.current && !(scan && store.getState().playing))) return
    const f = cur.current, k = 1 - Math.exp(-dt * 11)
    let move = 0
    for (let i = 0; i < 32; i++) { const t = goal.current ? goal.current[i] : 0, d = t - f[i]; f[i] += d * k; move = Math.max(move, Math.abs(d)) }
    if (move < 0.004) dirty.current = false
    const c = ref.current!.getContext('2d')!, im = c.createImageData(RES, RES), D = im.data
    for (let y = 0; y < RES; y++) for (let x = 0; x < RES; x++) {
      const px = (x + 0.5) / RES * 2 - 1, py = (y + 0.5) / RES * 2 - 1, r = Math.hypot(px, py)
      if (r > 0.995 || r < 0.16) continue
      const a = ((Math.atan2(-px, -py) / 6.28318 + 1) % 1) * 8, t = clamp((r - 0.22) / 0.7) * 3
      const a0 = Math.floor(a) % 8, a1 = (a0 + 1) % 8, t0 = Math.min(2, Math.floor(t)), u = a - Math.floor(a), w = t - t0
      const su = u * u * (3 - 2 * u), sw = w * w * (3 - 2 * w)
      const v = (f[a0 * 4 + t0] * (1 - su) + f[a1 * 4 + t0] * su) * (1 - sw) + (f[a0 * 4 + t0 + 1] * (1 - su) + f[a1 * 4 + t0 + 1] * su) * sw
      const ring = Math.abs(((r - 0.22) / 0.7) * 13 % 1 - 0.5) * 2, streak = 0.55 + 0.6 * clamp(1.5 - ring * 1.6)
      const col = heatRGB((v / 2.25) * streak + 0.02), i = (y * RES + x) * 4
      const edge = clamp((0.995 - r) / 0.03) * clamp((r - 0.16) / 0.03)
      D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = 255 * edge
    }
    c.putImageData(im, 0, 0)
    void now
  })
  return <canvas ref={ref} width={RES} height={RES} className={`iris ${className}`} role="img" aria-label={label} />
}
export const WINDOW_COUNT = WINDOWS

/** Four match scores as four thin lights. Comparisons, not probabilities. */
export function Scores({ trial, threshold }: { trial: Trial; threshold: number }) {
  return (
    <div className="scores" style={{ '--thr': threshold } as never} aria-label="Match scores. Comparisons with references, not probabilities.">
      {GESTURES.map((g) => <div className="score" key={g} style={{ '--col': CLASS_COLOR[g], '--v': trial.decision.scores[g] } as never}><span>{GESTURE_LABEL[g]}</span><div className="bar"><u /></div><b>{fmt(trial.decision.scores[g])}</b></div>)}
    </div>
  )
}
/** Compare what was asked of the generator with what came out. For people only, never fed to the decoder. */
export function verdict(t: Trial): { word: string; mark: string; kind: 'ok' | 'miss' | 'false' | 'wrong' } {
  const want = EVENT_FOR[t.config.requestedGesture], got = t.decision.event
  if (want === got) return { word: want ? 'Correct' : 'Correctly quiet', mark: '✓', kind: 'ok' }
  if (want && !got) return { word: 'Missed', mark: '○', kind: 'miss' }
  if (!want && got) return { word: 'False command', mark: '!', kind: 'false' }
  return { word: 'Wrong command', mark: '×', kind: 'wrong' }
}
export function explain(a: Trial, b: Trial) {
  const diffs = Array.from({ length: 8 }, (_, c) => { let d = 0; for (let k = 0; k < WINDOWS; k++) d += b.decision.features[c * WINDOWS + k] - a.decision.features[c * WINDOWS + k]; return { c, d: d / WINDOWS } }).sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
  const ga = a.decision.ranked[0], g = ga === 'rest' ? a.decision.ranked[1] : ga
  return `${diffs.slice(0, 2).map((x) => `S${x.c + 1} ${x.d < 0 ? 'fell' : 'rose'} by ${Math.abs(x.d).toFixed(2)}`).join(', ')} (log activity). Match to ${GESTURE_LABEL[g]} went from ${fmt(a.decision.scores[g])} to ${fmt(b.decision.scores[g])}.`
}

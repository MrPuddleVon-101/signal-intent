import { onCommand, onTrialStart, RATE, store } from '../store'
import type { Trial } from '../model/trial'
import { world } from '../world/shared'
/** An original score (scripts/score.py). It loops without a seam and the film plays its filter. */
const PERIOD = 64
let ac: AudioContext | null = null, bus: GainNode, low: BiquadFilterNode, choir: GainNode, loading = false
const buf: Record<string, AudioBuffer> = {}
const get = async (n: string) => { if (!buf[n]) buf[n] = await ac!.decodeAudioData(await (await fetch(`./audio/${n}.m4a`)).arrayBuffer()); return buf[n] }
export function ensureAudio() {
  if (!ac) {
    ac = new AudioContext(); bus = ac.createGain(); bus.gain.value = 0; low = ac.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 900; low.Q.value = 0.4; choir = ac.createGain(); choir.gain.value = 0
    low.connect(bus); choir.connect(bus); bus.connect(ac.destination)
  }
  void ac.resume()
  if (!loading) {
    loading = true
    const loop = (n: string, to: AudioNode) => get(n).then((b) => { const s = ac!.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = 1; s.loopEnd = 1 + PERIOD; s.connect(to); s.start(0, 1) })
    void loop('score', low); void loop('choir', choir); void get('sink')
  }
}
export function hum(n: 'ignite' | 'sink', gain = 0.8) {
  if (!ac || !store.getState().sound) return
  void get(n).then((b) => { const s = ac!.createBufferSource(), g = ac!.createGain(); s.buffer = b; g.gain.value = gain; s.connect(g).connect(ac!.destination); s.start() })
}
export const preload = () => { for (const n of ['score', 'choir', 'ignite', 'sink']) void fetch(`./audio/${n}.m4a`, { priority: 'low' } as RequestInit).catch(() => {}) }
/** Once per frame: light rooms open the sound, the underground closes it, the choir belongs to the deep places. */
let was = false
export function mix() {
  if (!ac) return
  const on = store.getState().sound && !document.hidden, t = ac.currentTime, s = world.w?.st
  if (on !== was) { was = on; if (on) void ac.resume() }
  bus.gain.setTargetAtTime(on ? 0.62 : 0, t, on ? 1.6 : 0.35)
  if (!s) return
  const deep = Math.max(s.cv, s.skin < 0.95 && s.hv > 0.5 ? 0.6 : 0), open = Math.max(s.lt, s.fr, s.rv * 0.8)
  low.frequency.setTargetAtTime(650 + open * 5200 + s.gy * 2600 - deep * 180, t, 0.9)
  choir.gain.setTargetAtTime(0.1 + deep * 0.75 + s.rv * 0.3, t, 1.4)
}
/** EMG is often monitored by ear. This plays the trial's own eight summed channels, quietly, inside the music. */
function play(t: Trial) {
  if (!store.getState().sound || !ac) return
  const f = t.decision.filtered, n = f[0].length, sr = 16000, up = sr / (t.recording.sampleRate * RATE)
  const b = ac.createBuffer(2, Math.floor(n * up), sr)
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch)
    for (let i = 0; i < d.length; i++) {
      const x = i / up, k = Math.min(n - 2, Math.floor(x)), u = x - k
      let v = 0
      for (let c = 0; c < 8; c++) { const pan = ch === (c < 4 ? 0 : 1) ? 1 : 0.45; v += (f[c][k] * (1 - u) + f[c][k + 1] * u) * pan }
      d[i] = Math.tanh(v * 0.5)
    }
  }
  const s = ac.createBufferSource(); s.buffer = b
  const g = ac.createGain(); g.gain.value = 0.09
  s.connect(g).connect(ac.destination); s.start()
}
function chime() {
  if (!store.getState().sound || !ac) return
  const t = ac.currentTime
  for (const [f, d] of [[587.33, 0], [880, 0.07], [1318.5, 0.13]]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.06, t + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.6); o.connect(g).connect(ac.destination); o.start(t + d); o.stop(t + d + 1.7) }
}
onTrialStart(play); onCommand(chime)

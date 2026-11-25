/**
 * "One twitch, many sparks": a tiny motor-unit recruitment model for the figure in Act 2.
 * Teaching choice: units join in order of size, fire faster with effort, and the skin sees only their sum.
 */
import { seededRandom } from './random'
export const UNITS = 7
export const unitThreshold = (u: number) => 0.06 + (u / UNITS) * 0.8
export const unitRate = (u: number, effort: number) => (effort < unitThreshold(u) ? 0 : 7 + 22 * (effort - unitThreshold(u)))
export function unitWave(u: number, x: number) {
  const a = 0.28 + u * 0.13, w = 1 + u * 0.06
  const z = x / w
  return a * (1 - 1.7 * z * z) * Math.exp(-0.75 * z * z) * (u % 2 ? -1 : 1)
}
export class UnitStream {
  private rnd = seededRandom(4242)
  private next = new Float64Array(UNITS).fill(Infinity)
  private t = 0
  readonly len: number
  readonly units: Float32Array[]
  readonly sum: Float32Array
  constructor(readonly sr = 240, seconds = 3) {
    this.len = Math.round(sr * seconds)
    this.units = Array.from({ length: UNITS }, () => new Float32Array(this.len))
    this.sum = new Float32Array(this.len)
  }
  /** Append `n` samples at the given effort (0 to 1). Buffers scroll left. */
  step(n: number, effort: number) {
    const tail = 10
    this.sum.copyWithin(0, n); this.sum.fill(0, this.len - n)
    for (const b of this.units) { b.copyWithin(0, n); b.fill(0, this.len - n) }
    for (let i = 0; i < n; i++) {
      this.t += 1 / this.sr
      const pos = this.len - n + i
      for (let u = 0; u < UNITS; u++) {
        const r = unitRate(u, effort)
        if (r === 0) { this.next[u] = Infinity; continue }
        if (this.next[u] === Infinity) this.next[u] = this.t + this.rnd.next() / r
        if (this.t >= this.next[u]) {
          this.next[u] = this.t + (0.8 + 0.4 * this.rnd.next()) / r
          for (let k = -tail; k <= 0; k++) {
            const j = pos + k
            if (j >= 0) this.units[u][j] += unitWave(u, (k + tail / 2) / 2)
          }
        }
      }
    }
    // the mixture is always recomputed from the parts
    for (let i = Math.max(0, this.len - n - tail); i < this.len; i++) {
      let s = 0
      for (const b of this.units) s += b[i]
      this.sum[i] = s + this.rnd.normal() * 0.012
    }
  }
}

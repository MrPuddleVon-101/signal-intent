import { SOURCE_ANGLES } from '../model/generator'
import { smooth } from './math'
import { rng } from './util'
/** Forearm half-widths at distance d up the arm from the wrist. */
export const radii = (d: number): [number, number] => { const k = smooth(0.2, 4.6, d), t = smooth(6, 10, d); return [0.545 + 0.42 * k - 0.05 * t, 0.388 + 0.52 * k - 0.04 * t] }
/** A point along one generic fibre. Conceptual, six source groups only. */
export function strand(s: number, f: number, t: number) {
  const q = rng(1000 + s * 131 + f * 17), off = (q() - 0.5) * 2, depth = 0.42 + 0.46 * Math.sqrt(q()), wob = q() * 6.28
  const x = -8.6 + t * 10.4, d = Math.max(0, -x), [ry, rz] = radii(d)
  const belly = Math.exp(-(((d - 4.1) / 2.2) ** 2)), tendon = smooth(1.6, 0.1, d), palm = smooth(0, 1.6, x)
  const a = (SOURCE_ANGLES[s] * Math.PI) / 180 + off * (0.06 + 0.46 * belly + 0.1 * tendon) + Math.sin(t * 5 + wob) * 0.05
  const rr = depth * (0.62 + 0.34 * belly + 0.2 * tendon)
  return { p: [x, Math.cos(a) * ry * rr * (1 + palm * 0.45), Math.sin(a) * rz * rr * (1 - palm * 0.4)], n: [0, Math.cos(a), Math.sin(a)], t }
}

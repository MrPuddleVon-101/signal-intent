/** The film. Each shot is pinned to a scroll position inside a section. Values ease between shots. */
import { DEEP, FLOOR, RAD, RING, RUNGS, STEP, TOP } from './gallery'
export const BASE = {
  cx: 0, cy: 0, cz: 10, tx: 0, ty: 0, tz: 0, fov: 30, fx: 0, fy: 0, roll: 0,
  hv: 0, skin: 1, fib: 0.16, arx: 0, ary: Math.PI, arz: 0,
  // the band: on the wrist (bf 0) or free (bf 1), open along its axis, x-ray
  bf: 1, bx: 0, by: 0, bz: 0, brx: 0, bry: 0, brz: 0, bs: 1, bv: 1, ex: 0, xr: 0,
  // tone: light studio, accent flood
  lt: 0, ac: 0, key: 1,
  mi: 0, mo: 0, wv: 0, tr: 0, tw: 0,
  // page: grey studio, framed print, torch. portrait: shown, taken over, cropped. photographs: ladder, cavern, ring angle
  gy: 0, fr: 0, to: 0, rv: 0, rf: 0, rc: 0, la: 0, cv: 0, yw: 0, cm: 0, cr: 0,
}
export type ShotState = typeof BASE
export interface Shot { at: string; p: number; s: Partial<ShotState>; m?: Partial<ShotState> }
const P = Math.PI, ON = { hv: 1, bf: 0 }, OFF = { bv: 0 }, H = -P / 2, D = DEEP
export const HERO: Partial<ShotState> = { ...ON, cx: 0, cy: 0.7, cz: 9.6, tx: 0, ty: 0.86, fx: 0.3, fov: 30, arx: 2.95, ary: P, arz: H, gy: 1, to: 1 }
const HM: Partial<ShotState> = { cz: 21, fx: 0.05, fy: 0.07 }
const A0 = [0.2, 0.35, 0.5, 0.65, 0.8, 0.95]
const rung = (i: number, k = 1, roll = 0): Partial<ShotState> => { const q = RUNGS[i]; return { ...OFF, la: 1, lt: 1, cx: q.x * 0.5, cy: TOP + q.y + 0.6, cz: 11.5 * k, tx: q.x * 0.62, ty: TOP + q.y - 0.2, tz: 0, fov: 34, roll } }
const ring = (i: number, o: Partial<ShotState> = {}): Partial<ShotState> => ({ cv: 1, bf: 1, bx: 1.7, by: D + 0.35, bz: 0, brx: 0.5, bry: 0.9, brz: 0.35, bs: 1.5, cx: 0, cy: D + 2.1, cz: 8.4, tx: 0, ty: D + 2.35, tz: -RAD, fov: 36, yw: -i * STEP, ...o })
export const SHOTS: Shot[] = [
  { at: 'try', p: 0, s: HERO, m: HM },
  { at: 'try', p: 0.1, s: { ...HERO, arx: 2.7 }, m: HM },
  // pan out: the film becomes a print on white paper
  { at: 'try', p: 0.34, s: { ...HERO, cz: 11.5, cy: 0.9, ty: 0.9, fx: 0, arx: 1.7, fr: 1, to: 0.5 }, m: { cz: 15, fy: 0 } },
  { at: 'try', p: 0.52, s: { ...HERO, cz: 10.6, cy: 0.8, ty: 0.8, fx: 0, arx: 0.4, fr: 1, to: 0.5 }, m: { cz: 14, fy: 0 } },
  // and back in, all the way
  { at: 'try', p: 0.7, s: { ...ON, cx: -0.6, cy: 1.6, cz: 7.6, tx: -0.2, ty: 1.1, fov: 34, arx: 0, ary: P, arz: H * 0.75, gy: 0.25 }, m: { cz: 11 } },
  { at: 'try', p: 1, s: { ...ON, cx: -8.2, cy: 0.5, cz: 2.2, tx: -1.5, fov: 40, arx: -0.2 }, m: { fov: 60 } },
  { at: 'skin', p: 0.12, s: { ...ON, cx: -4.6, cy: 0.12, cz: 0.2, tx: 2, fov: 62, fib: 0.9, roll: 0.35 } },
  { at: 'skin', p: 0.26, s: { ...ON, cx: -0.9, cy: 0.02, tx: 4, cz: 0, fov: 82, arx: 0.5, fib: 1.1, skin: 0.8, roll: 1.4 } },
  { at: 'skin', p: 0.38, s: { ...ON, cx: 0.8, cz: 0, tx: 6, fov: 92, arx: 1.2, fib: 1.4, skin: 0.5, roll: 3 } },
  { at: 'skin', p: 0.54, s: { ...ON, cx: 4.8, cz: 0, tx: 10, fov: 96, arx: 2.2, fib: 1.5, skin: 0.45, roll: 5.2 } },
  { at: 'skin', p: 0.63, s: { ...ON, cx: 6.6, cy: 0.5, cz: 2.6, tx: 3, fov: 60, arx: 2.4, fib: 1.4, skin: 0.5, roll: 6.2 } },
  { at: 'skin', p: 0.74, s: { ...ON, cx: 2.6, cy: -0.2, cz: 5.6, tx: 1.9, fov: 38, fx: 0.72, fy: 0.16, arx: 2.6, ary: P - 0.1, arz: 0.06, skin: 0.4, fib: 1.4, roll: 6.2832 }, m: { cz: 13, fx: 0.5, fy: 0.3 } },
  { at: 'skin', p: 0.95, s: { ...ON, cx: 1.2, cz: 5.2, tx: 0.7, fov: 38, fx: 0.64, fy: 0.16, arx: 2.9, ary: P - 0.05, arz: 0.04, skin: 0.4, fib: 1.4, roll: 6.2832 }, m: { cz: 13, fx: 0.5, fy: 0.3 } },
  // the object: the arm falls away, the lights snap on
  { at: 'band', p: 0.03, s: { cx: 0.5, cy: -0.35, cz: 2.5, ty: 0.12, fov: 34, brx: 2.9, bry: P - 0.6, roll: 6.2832 }, m: { cz: 4 } },
  { at: 'band', p: 0.088, s: { cx: -0.4, cy: -0.1, cz: 2.7, ty: 0.06, fov: 34, brx: 3.3, bry: P - 0.2, roll: 6.2832 }, m: { cz: 4.4 } },
  { at: 'band', p: 0.1, s: { cx: -0.4, cy: 0, cz: 2.9, fov: 34, brx: 3.4, bry: P - 0.15, lt: 1, roll: 6.2832 }, m: { cz: 4.8 } },
  { at: 'band', p: 0.18, s: { cx: 0, cy: 0.5, cz: 6, fov: 32, fx: 0.3, brx: 3.7, bry: P + 0.7, brz: 0.14, lt: 1, roll: 6.2832 }, m: { cz: 12, fx: 0 } },
  { at: 'band', p: 0.3, s: { cx: 0, cy: 0.7, cz: 5.6, fov: 32, fx: 0.3, brx: 4.3, bry: P + 1.5, brz: -0.1, lt: 1, roll: 6.2832 }, m: { cz: 12, fx: 0 } },
  { at: 'band', p: 0.4, s: { cx: 0, cy: 0.1, cz: 5.2, fov: 32, brx: 5.4, bry: P * 2 - 0.35, lt: 1, roll: 6.2832 }, m: { cz: 12 } },
  // it opens along its own axis
  { at: 'band', p: 0.53, s: { cx: 0.35, cy: 0.9, cz: 7.4, tx: 0.2, ty: 0.15, fov: 30, brx: 6.1, bry: P * 2 - 0.2, ex: 1, lt: 1, roll: 6.2832 }, m: { cz: 25 } },
  { at: 'band', p: 0.58, s: { cx: 0.3, cy: 0.8, cz: 7.1, tx: 0.2, ty: 0.15, fov: 30, brx: 6.2, bry: P * 2 - 0.18, ex: 1, lt: 1, roll: 6.2832 }, m: { cz: 25 } },
  { at: 'band', p: 0.65, s: { cx: -2.5, cy: 0.5, cz: 3.5, tx: -1.5, fov: 34, fy: 0.2, brx: 6.4, bry: P * 2 - 0.1, ex: 1, lt: 1, roll: 6.2832 + 0.14 }, m: { cz: 7.5 } },
  { at: 'band', p: 0.73, s: { cx: 0.1, cy: -0.5, cz: 3.2, tx: 0.25, fov: 34, fy: 0.2, brx: 6.6, bry: P * 2, ex: 1, lt: 1, roll: 6.2832 - 0.1 }, m: { cz: 7.5 } },
  { at: 'band', p: 0.81, s: { cx: 2.5, cy: 0.5, cz: 3.0, tx: 1.75, fov: 34, fy: 0.2, brx: 6.9, bry: P * 2 + 0.12, ex: 1, lt: 1, roll: 6.2832 + 0.1 }, m: { cz: 7.5 } },
  // cut: lights out, x-ray
  { at: 'band', p: 0.852, s: { cx: 1.2, cy: 0.8, cz: 5, tx: 0.8, fov: 32, brx: 7, bry: P * 2 + 0.14, ex: 1, lt: 1, roll: 6.2832 }, m: { cz: 14 } },
  { at: 'band', p: 0.862, s: { cx: 0.9, cy: 0.8, cz: 5.6, tx: 0.6, fov: 32, brx: 7.05, bry: P * 2 + 0.14, ex: 1, xr: 1, roll: 6.2832 }, m: { cz: 16 } },
  { at: 'band', p: 0.93, s: { cx: 0, cy: 0.6, cz: 7.6, fov: 32, brx: 7.8, bry: P * 2 + 0.7, ex: 0.5, xr: 1, roll: 6.2832 }, m: { cz: 20 } },
  { at: 'band', p: 1, s: { cx: 0, cy: 0.2, cz: 6.4, fov: 32, brx: 8.4, bry: P * 2 + 1.1, xr: 0, roll: 6.2832 }, m: { cz: 14 } },
  // the portrait, under a liquid brush
  { at: 'maker', p: 0.035, s: { cz: 8, ...OFF, brx: 8.4, bry: P * 2 + 1.1, rv: 0, roll: 6.2832 } },
  { at: 'maker', p: 0.05, s: { cz: 9.33, ...OFF, rv: 1, roll: 6.2832 } },
  { at: 'maker', p: 0.36, s: { cz: 9.33, ...OFF, rv: 1, roll: 6.2832 } },
  { at: 'maker', p: 0.48, s: { cz: 9.33, ...OFF, rv: 1, rf: 1, roll: 6.2832 } },
  { at: 'maker', p: 0.52, s: { cz: 9.33, ...OFF, rv: 1, rf: 1, roll: 6.2832 } },
  { at: 'maker', p: 0.58, s: { cz: 9.75, ...OFF, rv: 1, rf: 1, rc: 1, mi: 1, mo: 0, roll: 6.2832 }, m: { cz: 12.8 } },
  { at: 'maker', p: 0.585, s: { cz: 9.75, ...OFF, rv: 0, rf: 1, rc: 1, mi: 1, mo: 0, roll: 6.2832 }, m: { cz: 12.8 } },
  // it turns, and the other side is the idea
  { at: 'maker', p: 0.72, s: { cx: 1.2, cy: 0.1, cz: 11, fx: 0.3, mi: 1, mo: P - 0.18, bx: -3.6, by: -1.6, bz: 1.6, brx: 10.4, bry: P * 2 + 2.4, brz: 0.2, bs: 0.75, bv: 1, roll: 6.2832 }, m: { cz: 17.5, fx: 0, fy: -0.2 } },
  { at: 'maker', p: 0.77, s: { cx: 1.2, cy: 0.1, cz: 10.8, fx: 0.3, mi: 1, mo: P - 0.1, bx: -3.6, by: -1.6, bz: 1.6, brx: 10.5, bry: P * 2 + 2.4, brz: 0.2, bs: 0.75, roll: 6.2832 }, m: { cz: 17.5, fx: 0, fy: -0.2 } },
  { at: 'maker', p: 0.88, s: { cx: -0.1, cy: -1.5, cz: 4.1, tx: -0.16, ty: -1.6, mi: 1, mo: P, bx: -0.2, by: -1.74, bz: 0.8, brx: 10.6, bry: P * 2, brz: 1.48, bs: 1.14, roll: 6.2832 }, m: { cz: 7 } },
  // the photograph goes, the object stays
  { at: 'maker', p: 0.95, s: { cx: -0.1, cy: -1.5, cz: 4.4, tx: -0.16, ty: -1.7, mi: 0, mo: P, bx: -0.2, by: -1.74, bz: 0.8, brx: 11.6, bry: P * 2 + 0.1, brz: 1.3, bs: 1.14, roll: 6.2832 }, m: { cz: 8 } },
  { at: 'maker', p: 1, s: { cx: 0, cy: 0.1, cz: 7, mi: 0, mo: P, bx: 0, by: 0, bz: 0, brx: 13.4, bry: P * 2 + 1, bs: 1.1, roll: 6.2832 }, m: { cz: 15 } },
  // its eight contacts speak
  { at: 'signal', p: 0.1, s: { cz: 14.8, fx: 0.02, fy: -0.07, wv: 1, bx: -6.15, brx: 14.2, bry: P * 2 + 1.15, bs: 1.25, roll: 6.2832 }, m: { cz: 34, fx: 0, fy: 0 } },
  { at: 'signal', p: 0.22, s: { cz: 14.1, fx: 0.02, fy: -0.07, wv: 1, bx: -6.15, brx: 15, bry: P * 2 + 1.15, bs: 1.25, roll: 6.2832 }, m: { cz: 34, fx: 0, fy: 0 } },
  { at: 'signal', p: 0.4, s: { cx: 5.6, cy: 5, cz: 10.6, ty: -0.4, fov: 32, fx: 0.14, fy: -0.04, tr: 1, ...OFF, bx: -9, brx: 16, roll: 6.2832 }, m: { cx: 14, cy: 12, cz: 25, fx: 0 } },
  { at: 'signal', p: 0.53, s: { cx: -5, cy: 4.6, cz: 10.6, ty: -0.4, fov: 32, fx: 0.14, fy: -0.04, tr: 1, ...OFF, roll: 6.2832 }, m: { cx: -13, cy: 12, cz: 25, fx: 0 } },
  { at: 'signal', p: 0.62, s: { cx: 0, cy: 14, cz: 1.2, ty: -0.6, fov: 34, tr: 1, ...OFF, roll: 6.2832 + P / 2 }, m: { cy: 24 } },
  { at: 'signal', p: 0.73, s: { cx: 2.4, cy: 1.4, cz: 12.6, fov: 32, fx: 0.04, fy: 0.12, tw: 1, ...OFF, roll: 6.2832 }, m: { cz: 34, fx: 0, fy: 0 } },
  { at: 'signal', p: 0.84, s: { cx: -0.6, cy: 0.9, cz: 12.2, fov: 32, fx: 0.04, fy: 0.12, tw: 1, ...OFF, roll: 6.2832 }, m: { cz: 34, fx: 0, fy: 0 } },
  { at: 'signal', p: 0.97, s: { cx: -0.6, cy: 0.9, cz: 10.4, fov: 32, ...OFF, roll: 6.2832 } },
  { at: 'break', p: 0.1, s: { ...ON, cx: -0.4, cy: 0.6, cz: 8.2, fx: -0.46, fy: -0.02, arx: -0.2, ary: P - 0.2, arz: -1.28 }, m: { cz: 17, fx: 0, fy: 0.5 } },
  { at: 'break', p: 0.99, s: { ...ON, cx: -0.7, cy: 0.5, cz: 7.8, fx: -0.46, fy: -0.02, arx: -0.1, ary: P - 0.25, arz: -1.28 }, m: { cz: 14, fx: 0, fy: 2.4 } },
  { at: 'explore', p: 0.2, s: { cz: 12, ...OFF } },
  { at: 'explore', p: 0.98, s: { ...OFF, ...rung(0, 0.5), la: 0, lt: 0 } },
  // out of the first photograph, into a white world, and down
  { at: 'ladder', p: 0, s: { ...rung(0, 0.42), cx: 0, tx: 0, cy: TOP, ty: TOP, lt: 1 }, m: { cz: 5.6 } },
  { at: 'ladder', p: 0.05, s: { ...rung(0, 0.5), cx: 0, tx: 0, cy: TOP, ty: TOP }, m: { cz: 6.4 } },
  { at: 'ladder', p: 0.15, s: { ...rung(0, 1.12, 0.03), cy: TOP - 1.4, ty: TOP - 1.8 }, m: { cz: 22 } },
  { at: 'ladder', p: 0.27, s: rung(1, 1, -0.03), m: { cz: 20 } },
  { at: 'ladder', p: 0.38, s: rung(2, 0.95, 0.05), m: { cz: 18 } },
  { at: 'ladder', p: 0.49, s: rung(3, 0.95, -0.06), m: { cz: 18 } },
  { at: 'ladder', p: 0.6, s: rung(4, 1, 0.04), m: { cz: 20 } },
  { at: 'ladder', p: 0.7, s: rung(5, 1.05), m: { cz: 22 } },
  // it tips over the edge, and falls. one line, straight down
  { at: 'ladder', p: 0.795, s: { ...OFF, la: 1, lt: 1, cx: 0, cy: TOP - 31, cz: 8, tx: 0, ty: FLOOR - 1.5, tz: 0, fov: 42 }, m: { fov: 60 } },
  { at: 'ladder', p: 0.86, s: { ...OFF, la: 1, lt: 1, cx: 0, cy: FLOOR + 7, cz: 1.2, tx: 0, ty: FLOOR - 20, tz: 0, fov: 54 }, m: { fov: 72 } },
  { at: 'ladder', p: 0.9, s: { ...OFF, la: 1, lt: 1, cx: 0, cy: FLOOR - 0.6, cz: 0.7, tx: 0, ty: FLOOR - 30, tz: 0, fov: 62, roll: 0.12 }, m: { fov: 80 } },
  { at: 'ladder', p: 0.915, s: { ...OFF, la: 1, lt: 0, cx: 0, cy: FLOOR - 4, cz: 0.65, tx: 0, ty: FLOOR - 34, tz: 0, fov: 64, roll: 0.16 }, m: { fov: 82 } },
  { at: 'ladder', p: 0.985, s: { ...OFF, la: 1, cx: 0, cy: FLOOR - 26, cz: 0.5, tx: 0, ty: FLOOR - 60, tz: 0, fov: 64, roll: 0.3 }, m: { fov: 84 } },
  // black. then, far below, the screens wake one by one
  { at: 'ladder', p: 1, s: { ...ring(0), cv: 0, bv: 0, cm: 1, cr: 0, fov: 46, yw: -0.5 }, m: { fov: 70 } },
  { at: 'atmos', p: 0.05, s: { ...ring(0), cv: 1, bv: 0, cm: 1, cr: 0, fov: 46, yw: -0.28 }, m: { fov: 70 } },
    ...A0.flatMap((a, i): Shot[] => [{ at: 'atmos', p: a, s: ring(i, { cm: 1, cr: 1 }), m: { fov: 62 } }, { at: 'atmos', p: a + 0.04, s: ring(i, { cm: 1, cr: 1 }), m: { fov: 62 } }]),
  { at: 'atmos', p: 1, s: ring(RING.length - 1, { cy: D + 2.15, cz: 8.39, bv: 0 }), m: { fov: 62 } },
  // through the lens
  { at: 'lens', p: 0.19, s: ring(RING.length - 1, { cx: 2.05, cy: D + 3.5, cz: -RAD + 5, tx: 2.05, ty: D + 3.5, tz: -RAD, fov: 36, bv: 0 }) },
  { at: 'lens', p: 0.25, s: { ...ring(RING.length - 1), ...OFF, cx: 2.05, cy: D + 3.5, cz: -RAD + 4.2, tx: 2.05, ty: D + 3.5, tz: -RAD, cv: 0, fov: 36 } },
  { at: 'lens', p: 0.34, s: { ...OFF, cz: 12 } },
  { at: 'lens', p: 0.6, s: { ...ON, hv: 0, bv: 0, cx: 0, cy: 0.6, cz: 13, ty: 0.6, arx: 2.2, arz: H } },
  { at: 'lens', p: 0.64, s: { ...ON, cx: 0, cy: 0.6, cz: 12, ty: 0.6, fx: 0.3, arx: 2.3, ary: P, arz: H, gy: 0.5 }, m: { cz: 16, fx: 0 } },
  { at: 'lens', p: 0.78, s: { ...HERO, cz: 9.4, fx: 0.4, arx: 2.7, gy: 1 }, m: { cz: 18, fx: 0, fy: 0 } },
  { at: 'lens', p: 1, s: { ...HERO, cz: 9, fx: 0.4, arx: 3.3, gy: 1 }, m: { cz: 18, fx: 0, fy: 0 } },
  { at: 'credits', p: 0.2, s: { cz: 12, ...OFF } },
]

import { useEffect, useRef } from 'react'
import { store } from '../store'
import { useFrame } from './lib'

/** Solid disc that never lags (moved on the pointer event itself), a solid wake, and lightning inside the wake. */
type P = { x: number; y: number; t: number }
export function Cursor() {
  const cvs = useRef<HTMLCanvasElement>(null), dot = useRef<HTMLDivElement>(null)
  const S = useRef({ trail: [] as P[], x: -99, y: -99, jag: [] as number[], jt: 0, dirty: false, on: false, d: 1 })
  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
    document.documentElement.classList.add('has-cursor')
    const s = S.current, cv = cvs.current!, el = dot.current!
    s.on = true
    const size = () => { s.d = Math.min(1.5, devicePixelRatio); cv.width = innerWidth * s.d; cv.height = innerHeight * s.d }
    size()
    const move = (e: PointerEvent) => {
      s.x = e.clientX; s.y = e.clientY
      el.style.transform = `translate3d(${s.x}px,${s.y}px,0)`; el.style.opacity = '1'
      const ev = e.getCoalescedEvents?.() ?? []
      for (const q of ev.length ? ev : [e]) s.trail.unshift({ x: q.clientX, y: q.clientY, t: performance.now() })
      const hot = !!(e.target as Element | null)?.closest?.('a,button,summary,label,input,[data-hot]')
      if (el.dataset.hot !== String(hot)) el.dataset.hot = String(hot)
    }
    const press = () => {
      el.dataset.down = 'true'
    }
    const up = () => { el.dataset.down = 'false' }
    addEventListener('resize', size); addEventListener('pointermove', move, { passive: true }); addEventListener('pointerdown', press); addEventListener('pointerup', up)
    return () => { removeEventListener('resize', size); removeEventListener('pointermove', move); removeEventListener('pointerdown', press); removeEventListener('pointerup', up) }
  }, [])
  useFrame((now, dt) => {
    const s = S.current; if (!s.on) return
    const T = s.trail
    while (T.length && now - T[T.length - 1].t > 220) T.pop()
    if (T.length > 60) T.length = 60
    const active = T.length > 1
    if (!active && !s.dirty) return
    const c = cvs.current!.getContext('2d')!
    c.setTransform(s.d, 0, 0, s.d, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight)
    s.dirty = !!active
    let len = 0
    for (let i = 1; i < T.length; i++) len += Math.hypot(T[i].x - T[i - 1].x, T[i].y - T[i - 1].y)
    if (len > 16 && !store.getState().reduced) {
      const N = Math.min(24, Math.max(6, Math.round(len / 13))), pts: number[][] = []
      let seg = 1, acc = 0
      const sl = (i: number) => Math.hypot(T[i].x - T[i - 1].x, T[i].y - T[i - 1].y)
      for (let i = 0; i <= N; i++) {
        const target = (i / N) * len
        while (seg < T.length - 1 && acc + sl(seg) < target) { acc += sl(seg); seg++ }
        const a = T[seg - 1], b = T[seg], l = sl(seg) || 1, u = Math.min(1, (target - acc) / l)
        pts.push([a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, -(b.y - a.y) / l, (b.x - a.x) / l])
      }
      const w0 = Math.min(7.5, 3 + len * 0.02)
      c.beginPath()
      pts.forEach(([px, py, nx, ny], i) => { const w = w0 * (1 - i / N); c.lineTo(px + nx * w, py + ny * w) })
      for (let i = N; i >= 0; i--) { const [px, py, nx, ny] = pts[i], w = w0 * (1 - i / N); c.lineTo(px - nx * w, py - ny * w) }
      c.closePath(); c.fillStyle = '#ffffff'; c.fill()
      s.jt += dt; if (s.jt > 0.04 || s.jag.length < 30) { s.jt = 0; s.jag = Array.from({ length: 30 }, () => Math.random() - 0.5) }
      const amp = Math.min(15, 3 + len * 0.05)
      const bolt = (ph: number, a: number, lw: number, col: string) => { c.beginPath(); pts.forEach(([px, py, nx, ny], i) => { const j = s.jag[(i + ph) % 30] * 2 * a * Math.min(1, i / 3) * (1 - 0.5 * (i / N)); c.lineTo(px + nx * j, py + ny * j) }); c.lineWidth = lw; c.strokeStyle = col; c.stroke() }
      bolt(7, amp * 1.3, 1, '#7f9cff'); bolt(0, amp * 0.8, 2, '#2f5bff')
    }
  })
  return <><canvas id="cursor" ref={cvs} aria-hidden="true" /><div id="dot" ref={dot} aria-hidden="true"><i /></div></>
}

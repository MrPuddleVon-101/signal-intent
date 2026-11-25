import * as React from 'react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Lenis from 'lenis'
import { store } from '../store'
import { glassEls, scroll, world } from '../world/shared'
import { clamp } from '../world/math'

/* ------------ one loop: scroll, page, then picture. Nothing reads layout inside it. ------------ */
type Fn = (now: number, dt: number) => void
const fns = new Set<Fn>()
export let lenis: Lenis | null = null
let started = false, last = 0
const loop = (now: number) => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now
  lenis?.raf(now)
  const y = lenis ? lenis.animatedScroll : window.scrollY
  scroll.v = y - scroll.y; scroll.y = y
  fns.forEach((f) => f(now, dt))
  if (store.getState().worldReady && !store.getState().noWebgl) world.w?.frame(now)
  requestAnimationFrame(loop)
}
export function startLoop() {
  if (started) return
  started = true
  if (!store.getState().reduced) lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.85, touchMultiplier: 1.1 })
  requestAnimationFrame(loop)
}
export function useFrame(f: Fn) { const r = useRef(f); r.current = f; useEffect(() => { const g: Fn = (n, d) => r.current(n, d); fns.add(g); return () => { fns.delete(g) } }, []) }

/* ------------ section geometry, measured only when the page changes size ------------ */
export const SECTIONS = ['try', 'skin', 'band', 'maker', 'signal', 'break', 'explore', 'ladder', 'atmos', 'lens', 'credits'] as const
export type SectionId = (typeof SECTIONS)[number]
export const geo: Record<string, { top: number; h: number }> = {}
export const view = { w: 1, h: 1, doc: 1 }
export function measure() {
  view.w = innerWidth; view.h = innerHeight; view.doc = document.documentElement.scrollHeight
  for (const id of SECTIONS) { const e = document.getElementById(id); if (e) geo[id] = { top: e.offsetTop, h: e.offsetHeight } }
  world.w?.measure()
}
export const progress = (id: SectionId) => { const g = geo[id]; return g ? (scroll.y - g.top) / Math.max(1, g.h - view.h) : -9 }
export const onScreen = (id: SectionId, m = 0) => { const g = geo[id]; return !!g && scroll.y + view.h > g.top - m && scroll.y < g.top + g.h + m }
export function goTo(id: SectionId, p = 0) {
  const g = geo[id]; if (!g) return
  const y = g.top + p * Math.max(0, g.h - view.h)
  if (lenis) lenis.scrollTo(y, { duration: 2.6, easing: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2) })
  else scrollTo({ top: y })
}

/** Titles live on a layer behind the 3D canvas, so the hand and the band pass in front of the words. */
export function Behind({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  useEffect(() => setEl(document.getElementById('behind')), [])
  return el ? createPortal(children, el) : null
}
/** A block that is on between two points of a section. State flips once; CSS does the motion on the compositor. */
export function Cue({ id, from, to, children, className = '', style }: { id: SectionId; from: number; to: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null), st = useRef('')
  useFrame(() => {
    const p = progress(id), s = p < from ? 'pre' : p > to ? 'post' : 'on'
    if (s === st.current) return
    st.current = s
    const el = ref.current!; el.dataset.s = s; el.inert = s !== 'on'
  })
  return <div ref={ref} className={`cue ${className}`} style={style} data-s="pre">{children}</div>
}
/** A solid block crosses each line and leaves the words behind. */
export function Title({ id, from, to, text, className = '', as: T = 'h2' }: { id: SectionId; from: number; to: number; text: string; className?: string; as?: 'h1' | 'h2' }) {
  return (
    <Cue id={id} from={from} to={to} className={`title ${className}`}>
      <T aria-label={text.replace(/\n/g, ' ')}>{text.split('\n').map((l, i) => <span className="ln" key={i} aria-hidden="true" style={{ '--i': i } as never}><span className="tx">{l}</span><i className="bk" /></span>)}</T>
    </Cue>
  )
}
/** Enormous type that crosses behind the subject as you scroll. */
export function Runner({ id, from, to, text, y = '50%' }: { id: SectionId; from: number; to: number; text: string; y?: string }) {
  const ref = useRef<HTMLDivElement>(null), w = useRef(0)
  useFrame(() => {
    const el = ref.current!; const p = (progress(id) - from) / (to - from), on = p > -0.02 && p < 1.02
    if (el.style.visibility !== (on ? 'visible' : 'hidden')) el.style.visibility = on ? 'visible' : 'hidden'
    if (!on) return
    w.current ||= el.offsetWidth
    el.style.transform = `translate3d(${view.w - p * (view.w + w.current)}px,-50%,0)`
  })
  useEffect(() => { const f = () => { w.current = 0 }; addEventListener('resize', f); return () => removeEventListener('resize', f) }, [])
  return <div ref={ref} className="runner" style={{ top: y }} aria-hidden="true">{text}</div>
}
/** Notched control. The label rolls, the notch fills. */
export function Btn({ children, kind = 'volt', className = '', ...rest }: { children: string; kind?: 'volt' | 'line'; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn ${kind} ${className}`} {...rest}><span className="roll" data-t={children}><span>{children}</span></span></button>
}

/** Liquid glass: no border, no blur filter. The final shader refracts the film inside this rectangle. */
export function Glass({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const e = ref.current!; glassEls.add(e); return () => { glassEls.delete(e) } }, [])
  return <div ref={ref} className={`glass ${className}`}>{children}</div>
}

/* ------------ plots: drawn only when something changed ------------ */
export interface Ctx { c: CanvasRenderingContext2D; w: number; h: number; now: number }
export function Plot({ draw, className = '', label, stamp }: { draw: (x: Ctx) => void; className?: string; label: string; stamp?: (now: number) => unknown }) {
  const ref = useRef<HTMLCanvasElement>(null), vis = useRef(false), key = useRef<unknown>(undefined), box = useRef({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current!
    const io = new IntersectionObserver(([e]) => { vis.current = e.isIntersecting; key.current = undefined }, { rootMargin: '60px' }); io.observe(el)
    const ro = new ResizeObserver(() => { box.current = { w: el.clientWidth, h: el.clientHeight }; const d = Math.min(devicePixelRatio, 2); el.width = Math.round(box.current.w * d); el.height = Math.round(box.current.h * d); key.current = undefined }); ro.observe(el)
    return () => { io.disconnect(); ro.disconnect() }
  }, [])
  useFrame((now) => {
    const { w, h } = box.current
    if (!vis.current || !w) return
    if (stamp) { const k = stamp(now); if (k === key.current) return; key.current = k }
    const c = ref.current!.getContext('2d')!, d = Math.min(devicePixelRatio, 2)
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h)
    draw({ c, w, h, now })
  })
  return <canvas ref={ref} className={`plot ${className}`} role="img" aria-label={label} />
}
export const SANS = (w: number, s: number) => `${w} ${s}px "Host Grotesk Variable", system-ui, sans-serif`
export const C = { ink: '#050506', white: '#f3f6ff', mute: '#9aa0ad', blue: '#2f5bff', volt: '#ffffff' }
export const CLASS_COLOR = { rest: '#7d8491', pinch: '#2f5bff', left: '#8fa2c8', right: '#f3f6ff' } as const
/** One cold ramp: black, deep blue, electric blue, ice, white. */
const RAMP: [number, number[]][] = [[0, [11, 12, 15]], [0.25, [38, 42, 50]], [0.5, [104, 116, 138]], [0.78, [188, 203, 232]], [1, [255, 255, 255]]]
export function heatRGB(v: number): number[] {
  const t = clamp(v)
  for (let i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) { const k = (t - RAMP[i - 1][0]) / (RAMP[i][0] - RAMP[i - 1][0]); return RAMP[i][1].map((b, j) => RAMP[i - 1][1][j] + (b - RAMP[i - 1][1][j]) * k) }
  return RAMP[RAMP.length - 1][1]
}
export const heat = (v: number) => `rgb(${heatRGB(v).map(Math.round)})`
export function Sup({ n }: { n: number }) { return <sup className="fn"><a href={`#source-${n}`} aria-label={`Source ${n}`} onClick={(e) => { e.preventDefault(); store.setState({ panel: null }); const el = document.getElementById(`source-${n}`); if (el) { if (lenis) lenis.scrollTo(el, { offset: -160, duration: 1.4 }); else el.scrollIntoView(); el.focus({ preventScroll: true }) } }}>{n}</a></sup> }
export function Why({ children, label = 'Why?' }: { children: ReactNode; label?: string }) { return <details className="why"><summary>{label}</summary><p>{children}</p></details> }

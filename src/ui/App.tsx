import { useEffect, useRef, useState } from 'react'
import { DEMO_SEED, store, tick, useS } from '../store'
import { runTrial } from '../model/trial'
import { DEFAULT_DECODER } from '../model/templates'
import type { World } from '../world/World'
import { world } from '../world/shared'
import { Stage } from './Stage'
import { Cursor } from './Cursor'
import { Explore } from './Explore'
import { Credits, Legend, Lens } from './Finale'
import { Hero, Dock } from './Hero'
import { BreakLab } from './Labs'
import { Maker } from './Maker'
import { Nav } from './Nav'
import { Ladder } from './Ladder'
import { Atmos } from './Atmos'
import { Signal } from './Signal'
import { Skin } from './Skin'
import { ensureAudio, hum, mix, preload } from './sound'
import { Btn, geo, goTo, measure, startLoop, useFrame, view } from './lib'
import { scroll } from '../world/shared'

const demo = runTrial({ requestedGesture: 'pinch', seed: DEMO_SEED }, DEFAULT_DECODER)
let booted = false
export function App() {
  const c = useRef<HTMLCanvasElement>(null)
  const noGl = useS((s) => s.noWebgl)
  useEffect(() => {
    if (booted) return
    booted = true
    history.scrollRestoration = 'manual'
    readShare(); measure(); startLoop()
    let t = 0
    const later = () => { clearTimeout(t); t = window.setTimeout(measure, 80) }
    addEventListener('resize', later); new ResizeObserver(later).observe(document.body)
    // the 3D film is progressive enhancement around a working experiment
    import('../world/World').then(async ({ World }) => {
      const w = new World(c.current!)
      world.w = w
      if (import.meta.env.DEV) (window as never as { __w: World }).__w = w
      await w.init(demo); measure()
    }).catch((e) => { console.error(e); world.w = null; store.setState({ noWebgl: true }) })
  }, [])
  useFrame((n) => { mix(); const s = store.getState(); if (!s.worldReady || s.noWebgl) tick(n) })
  return (
    <>
      <div id="ground" aria-hidden="true"><i><b /><b /><b /></i><i className="studio" /></div>
      <div id="behind" />
      <canvas id="gl" ref={c} aria-hidden="true" />
      {noGl && <p className="nogl">3D is not available here. Every signal, score and command still runs.</p>}
      <a className="skip" href="#try" onClick={(e) => { e.preventDefault(); goTo('try') }}>Skip to the experiment</a>
      <Nav />
      <main><Hero /><Skin /><Stage /><Maker /><Signal /><BreakLab /><Explore /><Ladder /><Atmos /><Lens /><Credits /></main>
      <MiniBar />
      <SimPanel />
      <Loader />
      <Cursor />
    </>
  )
}
/** Shared settings only. Nothing in the URL can set a prediction. */
function readShare() {
  const q = new URLSearchParams(location.search), num = (k: string, a: number, b: number) => { const v = Number(q.get(k)); return q.has(k) && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : undefined }
  const p = { placementAngle: num('shift', 0, 45), contactQuality: num('contact', 0.1, 1), intensity: num('strength', 0.2, 1.4), noiseLevel: num('noise', 0, 4) }
  store.getState().set(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)))
}
/** Phones: the gestures stay in reach once the hero has gone. */
function MiniBar() {
  const ref = useRef<HTMLDivElement>(null), st = useRef('')
  useFrame(() => { const on = scroll.y > view.h * 1.2 && scroll.y < (geo.break?.top ?? 0) - view.h * 0.6 ? 'true' : 'false'; if (st.current !== on) { st.current = on; ref.current!.dataset.on = on; ref.current!.inert = on === 'false' } })
  return <div className="minibar" ref={ref} data-on="false"><Dock /></div>
}
function SimPanel() {
  const open = useS((s) => s.panel === 'simulated')
  const d = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (open) d.current?.showModal(); else d.current?.close() }, [open])
  const close = () => store.setState({ panel: null })
  return (
    <dialog ref={d} className="sim" onClose={close} onClick={(e) => { if (e.target === d.current) close() }} aria-label="What is simulated?" data-lenis-prevent>
      <div><h2>What is simulated?</h2><Legend />
        <ol className="flow"><li>A gesture sets activity in six generic muscle groups.</li><li>Each group is mixed into eight contacts by distance around the wrist.</li><li>Fit and noise change those samples.</li><li>The decoder receives only the samples. Never the gesture name.</li><li>It measures, compares, waits, and sometimes sends one command.</li><li>Only that command can change the glasses.</li></ol>
        <p className="tiny">All units are arbitrary. All constants are teaching choices, not Meta&rsquo;s.</p>
        <div className="row"><Btn onClick={close}>Back to the film</Btn><button className="alt" onClick={() => { close(); goTo('credits', 0.1) }}>Sources and limits</button></div></div>
    </dialog>
  )
}

/** A dark room and one thin line. You let the light in. Scrolling, or any key, also opens it: nothing is ever blocked. */
function Loader() {
  const ready = useS((s) => s.worldReady || s.noWebgl), calm = useS((s) => s.reduced)
  const [gone, setGone] = useState(false), done = useRef(false)
  const enter = (sound: boolean) => {
    if (done.current || !store.getState().worldReady) return
    done.current = true
    if (sound) { ensureAudio(); store.setState({ sound: true }); hum('ignite', 0.9) }
    if (world.w) world.w.lit = performance.now()
    document.documentElement.dataset.gate = 'open'; setGone(true)
  }
  useEffect(() => {
    if (calm || store.getState().noWebgl) { document.documentElement.dataset.lit = '1'; document.documentElement.dataset.gate = 'open' }
    preload()
    const w = () => enter(false), k = (e: KeyboardEvent) => { if (!['Tab', 'Shift', 'Enter', ' '].includes(e.key)) enter(false) }
    addEventListener('wheel', w, { passive: true }); addEventListener('touchmove', w, { passive: true }); addEventListener('keydown', k)
    return () => { removeEventListener('wheel', w); removeEventListener('touchmove', w); removeEventListener('keydown', k) }
  }, [])
  useEffect(() => { if (ready && (store.getState().noWebgl || location.hash === '#skip')) { document.documentElement.dataset.lit = '1'; document.documentElement.dataset.gate = 'open'; if (world.w) world.w.lit = -2; setGone(true); done.current = true } }, [ready])
  if (calm) return null
  return (
    <div className="gate" data-ready={ready} data-gone={gone} inert={gone}>
      <div className="line"><i /></div>
      <div className="gate-go"><button className="go" onClick={() => enter(true)} data-hot disabled={!ready}>Enter</button><button className="go2" onClick={() => enter(false)} disabled={!ready}>without sound</button></div>
    </div>
  )
}

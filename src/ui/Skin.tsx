import { useEffect, useRef, useState } from 'react'
import { manual } from '../world/shared'
import { UNITS, UnitStream, unitThreshold } from '../model/units'
import { store } from '../store'
import { Behind, C, Cue, heat, Plot, Sup, Title, useFrame, Why, type Ctx } from './lib'
import { damp } from '../world/math'

export function Skin() {
  return (
    <section id="skin" className="film" style={{ height: '350vh' }}>
      <div className="stick">
        <Title id="skin" from={0.34} to={0.55} className="tl" text={'Muscle\nis electric.'} />
        <Behind><Title id="skin" from={0.68} to={0.96} className="tl" text={'Squeeze.'} /></Behind>
        <Cue id="skin" from={0.68} to={0.97} className="unit-fig"><Recruit /></Cue>
        <Cue id="skin" from={0.1} to={0.97} className="foot-r"><p className="tiny">Conceptual artwork, not an anatomical map</p></Cue>
      </div>
    </section>
  )
}
/** Hold to squeeze. A quick tap squeezes by itself, so nobody is left with a dead control. */
function Recruit() {
  const stream = useRef<UnitStream | null>(null); stream.current ??= new UnitStream()
  const held = useRef(false), auto = useRef(0), downAt = useRef(0), eff = useRef(0), acc = useRef(0), box = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null)
  const [n, setN] = useState(0), [hot, setHot] = useState(false), [used, setUsed] = useState(false)
  const begin = () => { if (held.current) return; held.current = true; auto.current = 0; downAt.current = performance.now(); setHot(true); setUsed(true) }
  const end = () => { if (!held.current) return; held.current = false; if (performance.now() - downAt.current < 350) auto.current = performance.now() + 2300; else setHot(false) }
  useEffect(() => {
    // anywhere on the picture works too, with a mouse
    const sec = document.getElementById('skin')!
    const down = (e: PointerEvent) => { if (e.pointerType === 'mouse' && e.button === 0 && box.current?.parentElement?.dataset.s === 'on' && !(e.target as Element).closest('a,button,summary,details')) { e.preventDefault(); begin() } }
    sec.addEventListener('pointerdown', down); addEventListener('pointerup', end); addEventListener('pointercancel', end); addEventListener('blur', end)
    return () => { sec.removeEventListener('pointerdown', down); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); removeEventListener('blur', end); manual.effort = 0 }
  }, [])
  useFrame((now, dt) => {
    const on = box.current?.parentElement?.dataset.s === 'on'
    if (!on && (held.current || auto.current)) { held.current = false; auto.current = 0; setHot(false) }
    if (auto.current && now > auto.current) { auto.current = 0; setHot(false) }
    const go = held.current || auto.current > 0
    eff.current = damp(eff.current, go ? 1 : 0, go ? 1.9 : 4.5, dt)
    if (eff.current < 0.004) eff.current = 0
    manual.effort = eff.current
    if (!on) return
    acc.current += dt * 240; const k = Math.floor(acc.current); acc.current -= k
    if (k && !store.getState().paused) stream.current!.step(k, eff.current * 0.97 + 0.02)
    let c = 0; for (let u = 0; u < UNITS; u++) if (eff.current * 0.97 + 0.02 >= unitThreshold(u)) c++
    if (c !== n) setN(c)
    btn.current!.style.setProperty('--e', eff.current.toFixed(3))
  })
  const draw = ({ c, w, h }: Ctx) => {
    const s = stream.current!, lane = (h * 0.6) / UNITS
    const line = (b: Float32Array, y: number, a: number) => { c.beginPath(); for (let i = 0; i < s.len; i += 2) c.lineTo((i / (s.len - 1)) * w, y - b[i] * a) }
    for (let u = 0; u < UNITS; u++) { const on = eff.current * 0.97 + 0.02 >= unitThreshold(u); line(s.units[u], lane * (u + 0.5), lane * 0.5); c.strokeStyle = on ? heat(0.62 + u * 0.05) : 'rgba(243,246,255,.2)'; c.lineWidth = on ? 1.7 : 1; c.stroke() }
    line(s.sum, h * 0.82, h * 0.07); c.strokeStyle = C.white; c.lineWidth = 2; c.stroke()
  }
  return (
    <div className="recruit" ref={box}>
      <div className="squeeze">
        <button className="sqz" ref={btn} data-hot data-on={hot} aria-pressed={hot} aria-label="Hold to squeeze the hand" onPointerDown={(e) => { if (e.button) return; e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* not capturable */ } begin() }}
          onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin() } }} onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') end() }} onBlur={end} onContextMenu={(e) => e.preventDefault()}><i /></button>
        <p className="sqz-say"><b>{hot ? 'Squeezing' : used ? 'Hold it again' : 'Hold to squeeze'}</b><span>{n} of {UNITS} motor units firing</span></p>
      </div>
      <div className="units-wrap">
        <Plot draw={draw} className="units" label="Seven simulated motor unit spike trains and, below them, the single mixed waveform they add up to." />
        <span className="ul a">each motor unit</span><span className="ul b">what the band hears</span>
      </div>
      <Why label="What am I seeing?">Squeeze harder and more motor units join in, each firing its own pulses. Electrodes on the skin record them added together, through tissue. That sum is surface electromyography, sEMG.<Sup n={3} /></Why>
    </div>
  )
}

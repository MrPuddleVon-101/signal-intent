import { useEffect, useRef, useState } from 'react'
import { RING } from '../world/gallery'
import { world } from '../world/shared'
import { Cue, onScreen, progress, useFrame } from './lib'
/** A ring of screens underground. Scroll turns it. So does your hand. */
export function Atmos() {
  const [i, setI] = useState(0), last = useRef(0), box = useRef<HTMLElement>(null), D = useRef({ on: false, x: 0, t: 0 })
  useFrame(() => { const w = world.w; if (!w || !onScreen('atmos')) return; const n = progress('atmos') < 0.17 ? -1 : w.gallery.facing(w.st.yw); if (n !== last.current) { last.current = n; setI(n) } })
  useEffect(() => {
    const el = box.current!, d = D.current
    const down = (e: PointerEvent) => { if ((e.target as Element).closest('a,button')) return; d.on = true; d.x = e.clientX; d.t = performance.now(); if (world.w) { world.w.drag = true; world.w.gallery.spinV = 0 } }
    const move = (e: PointerEvent) => { if (!d.on || !world.w) return; const n = performance.now(), dx = (e.clientX - d.x) / innerWidth, dt = Math.max(0.008, (n - d.t) / 1000); d.x = e.clientX; d.t = n; const g = world.w.gallery; g.spin -= dx * 1.7; g.spinV = g.spinV * 0.6 + (-dx * 1.7 / dt) * 0.4 }
    const up = () => { d.on = false; if (world.w) world.w.drag = false }
    el.addEventListener('pointerdown', down); addEventListener('pointermove', move, { passive: true }); addEventListener('pointerup', up); addEventListener('pointercancel', up)
    return () => { el.removeEventListener('pointerdown', down); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up) }
  }, [])
  const N = RING.length, at = (k: number) => RING[(i + k + N) % N].c
  return (
    <section id="atmos" className="film grab" ref={box} style={{ height: '980vh' }} aria-label="A revolving ring of photographs">
      <div className="stick">
        <Cue id="atmos" from={0.18} to={0.985} className="at-cap">{i >= 0 && <><b key={i}>{RING[i].c}</b><span>Drag to turn</span></>}</Cue>
        <Cue id="atmos" from={0.18} to={0.985} className="at-nav">{i >= 0 && <><i>Next</i><i>{at(1)}</i></>}</Cue>
      </div>
    </section>
  )
}

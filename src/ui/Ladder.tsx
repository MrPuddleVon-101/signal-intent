import { useRef, useState } from 'react'
import { RUNGS } from '../world/gallery'
import { world } from '../world/shared'
import { Behind, Cue, onScreen, progress, Sup, Title, useFrame } from './lib'
import { hum } from './sound'
const AT = [0.15, 0.27, 0.38, 0.49, 0.6, 0.7]
/** Photographs climb. Then the ground opens. */
export function Ladder() {
  const [i, setI] = useState(0), last = useRef(0), sunk = useRef(false)
  useFrame(() => {
    if (!onScreen('ladder')) return
    const p = progress('ladder'), h = world.w?.gallery.hover ?? -1
    let n = 0, d = 9; AT.forEach((s, k) => { const q = Math.abs(s - p); if (q < d) { d = q; n = k } }); if (h >= 0) n = h
    if (n !== last.current) { last.current = n; setI(n) }
    const s = p > 0.885; if (s !== sunk.current) { sunk.current = s; if (s) hum('sink') }
  })
  return (
    <section id="ladder" className="film" style={{ height: '900vh' }} aria-label="Photographs of the band, the glasses and their demonstration">
      <div className="stick">
        <Behind><Title id="ladder" from={0.21} to={0.33} className="cl xs dark" text={'Hands can\nbe hidden.'} /></Behind>
        <Behind><Title id="ladder" from={0.43} to={0.555} className="cl xs dark" text={'The band\nstill hears\nthe muscle.'} /></Behind>
        <Cue id="ladder" from={0.08} to={0.77} className="th-cap dark"><b key={i}>{RUNGS[i].c}</b></Cue>
        <Cue id="ladder" from={0.08} to={0.77} className="foot-r dark"><p className="tiny">Photographs Meta<Sup n={1} /></p></Cue>
      </div>
    </section>
  )
}

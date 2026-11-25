import { useRef } from 'react'
import { world } from '../world/shared'
import { Behind, Cue, onScreen, progress, Title, useFrame, view } from './lib'
import { clamp } from '../world/math'
const INFO: Record<string, [string, string]> = { sleeve: ['Fabric', 'Keeps the pressure even.'], frame: ['Frame', 'Holds every contact in place.'], flex: ['Signal path', 'Carries tiny voltages inward.'], contacts: ['Contacts', 'Touch skin. Eight here, our choice.'], core: ['Processing', 'Turns samples into one decision.'] }
const SHOW = ['sleeve', 'frame', 'flex', 'contacts', 'core'] as const
export function Stage() {
  const tags = useRef<Record<string, HTMLDivElement | null>>({}), spin = useRef<HTMLDivElement>(null)
  useFrame(() => {
    if (!onScreen('band')) return
    const p = progress('band'), w = world.w, el = spin.current!
    const on = p > 0.12 && p < 0.5
    if ((el.style.visibility === 'visible') !== on) el.style.visibility = on ? 'visible' : 'hidden'
    if (on) el.style.transform = `translate3d(-50%,${view.h * 1.1 - clamp((p - 0.12) / 0.38) * (view.h * 1.1 + el.offsetHeight)}px,0)`
    if (w && p > 0.48 && p < 0.62) for (const k of SHOW) { const t = tags.current[k]; if (t) { const q = w.part(k); t.style.transform = `translate3d(${q.x}px,${q.y}px,0)` } }
  })
  return (
    <section id="band" className="film" style={{ height: '900vh' }}>
      <div className="stick">
        <Behind><div className="spine" ref={spin} aria-hidden="true">it listens</div></Behind>
        <Title id="band" from={0.015} to={0.085} className="bl xs" text={'This is all it needs.'} />
        <Behind><Title id="band" from={0.13} to={0.33} className="cl xs dark" text={'No buttons.\nNo screen.\nNo camera\npointed at you.'} /></Behind>
        <Behind><Title id="band" from={0.49} to={0.6} className="tc xs dark" text={'Five parts. One reading.'} /></Behind>
        <Cue id="band" from={0.51} to={0.6} className="layer-tags dark">{SHOW.map((k, i) => <div key={k} className={"ptag " + k} style={{ '--i': i } as never} ref={(e) => { tags.current[k] = e }}><b>{INFO[k][0]}</b></div>)}</Cue>
        {([['sleeve', 0.625, 0.67], ['frame', 0.67, 0.71], ['flex', 0.71, 0.745], ['contacts', 0.745, 0.785], ['core', 0.785, 0.845]] as const).map(([k, a, b]) => <Cue key={k} id="band" from={a} to={b} className="part"><b>{INFO[k][0]}</b><span>{INFO[k][1]}</span></Cue>)}
        <Title id="band" from={0.865} to={0.965} className="cl xs" text={'What it reads\nis electricity.'} />
        <Cue id="band" from={0.13} to={0.84} className="foot-r dark"><p className="tiny">Conceptual model, not a verified teardown</p></Cue>
      </div>
    </section>
  )
}

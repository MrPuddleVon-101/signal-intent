import { useRef } from 'react'
import { store, useS } from '../store'
import { world } from '../world/shared'
import { GESTURE_LABEL, GESTURES } from '../model/types'
import { Behind, Cue, onScreen, progress, Title, useFrame } from './lib'
import { Dock } from './Hero'
import { fmt, word } from './Figures'

/** The swarm holds the data. These are only its labels. */
export function Signal() {
  const rows = useRef<(HTMLElement | null)[]>([]), tw = useRef<(HTMLElement | null)[]>([]), thr = useRef<HTMLDivElement>(null)
  const trial = useS((s) => s.trial), threshold = useS((s) => s.decoder.threshold)
  useFrame(() => {
    const w = world.w; if (!w || !onScreen('signal')) return
    const p = progress('signal')
    if (p < 0.34) rows.current.forEach((e, i) => { if (e) { const q = w.at(-4.62, (3.5 - i) * 0.66, 0); e.style.transform = `translate3d(${q.x}px,${q.y}px,0) translate(-100%,-50%)` } })
    if (p > 0.56 && p < 0.92) { tw.current.forEach((e, i) => { if (e) { const q = w.at((i - 1.5) * 2.3, -2.5, 0.7); e.style.transform = `translate3d(${q.x}px,${q.y}px,0) translate(-50%,0)` } }); const q = w.at(4.8, 0.65 * 4.2 - 2.1, 1.1); if (thr.current) thr.current.style.transform = `translate3d(${q.x}px,${q.y}px,0) translate(-104%,-190%)` }
  })
  void store
  const sc = trial?.decision.scores
  return (
    <section id="signal" className="film" style={{ height: '380vh' }}>
      <div className="stick">
        <Behind><Title id="signal" from={0.0} to={0.24} className="tl sm" text={'One pinch, heard eight ways.'} /></Behind>
        <Cue id="signal" from={0.02} to={0.22} className="pins">{Array.from({ length: 8 }, (_, i) => <span key={i} ref={(e) => { rows.current[i] = e }}>S{i + 1}</span>)}</Cue>
        <Behind><Title id="signal" from={0.32} to={0.56} className="tl sm" text={'A gesture\nhas a shape.'} /></Behind>
        <Cue id="signal" from={0.36} to={0.56} className="foot-r"><p className="tiny">8 contacts by 4 moments. Height is activity.</p></Cue>
        <Behind><Title id="signal" from={0.63} to={0.83} className="tl sm" text={'Only one\nshape fits.'} /></Behind>
        <Cue id="signal" from={0.66} to={0.84} className="pins big">{GESTURES.map((g, i) => <span key={g} ref={(e) => { tw.current[i] = e }}>{GESTURE_LABEL[g]}<b>{sc ? fmt(sc[g]) : ''}</b></span>)}<div ref={thr} className="thr">needed {threshold.toFixed(2)}</div></Cue>
        <Cue id="signal" from={0.88} to={1.02} className="big-word"><b key={trial?.id ?? 0} className={trial && !trial.decision.event ? 'no' : ''}>{word((trial ?? null)?.decision.event ?? (trial ? null : 'SELECT'))}</b></Cue>
        <Cue id="signal" from={0.02} to={1.02} className="sig-dock"><Dock /></Cue>
      </div>
    </section>
  )
}

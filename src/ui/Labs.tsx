import { useMemo, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, DEMO_SEED, redecode, store, useS } from '../store'
import { runTrial, type Trial } from '../model/trial'
import { BASE_TEMPLATES, BLEND, calibrateTemplates, collectExamples, DEFAULT_DECODER, featureOfExample } from '../model/templates'
import type { Templates } from '../model/types'
import { Btn, Sup, Title } from './lib'
import { explain, fmt, Iris, Scores, word } from './Figures'

export function Slider({ label, min, max, step, value, onChange, show }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; show: string }) {
  return <label className="slider" style={{ '--f': (value - min) / (max - min) } as never}><span><b>{label}</b><output>{show}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} aria-valuetext={show} /></label>
}
export function Say({ t, big = true }: { t: Trial; big?: boolean }) {
  const e = t.decision.event
  return <p className={`say ${big ? '' : 'sm'}`} key={`${e}`}><b className={e ? '' : 'no'}>{word(e)}</b><span>{fmt(Math.max(t.decision.scores.pinch, t.decision.scores.left, t.decision.scores.right))}</span></p>
}
const DEMOS = 12
/** Break it, then repair it, in one view. */
export function BreakLab() {
  const settings = useS((s) => s.settings), set = useS((s) => s.set), dec = useS((s) => s.decoder), playing = useS((s) => s.playing)
  const [seed, setSeed] = useState(DEMO_SEED), [fly, setFly] = useState(0), [tpl, setTpl] = useState<Templates | null>(null), [round, setRound] = useState(1)
  const drag = useRef<{ x: number; a: number } | null>(null)
  // the bench always starts from the original references, so only the fit differs
  const fixed = useMemo(() => ({ ...DEFAULT_DECODER, threshold: dec.threshold, margin: dec.margin, gate: dec.gate }), [dec.threshold, dec.margin, dec.gate])
  const base = useMemo(() => runTrial({ requestedGesture: 'pinch', seed }, fixed), [seed, fixed])
  const now = useMemo(() => runTrial({ requestedGesture: 'pinch', seed, ...settings }, fixed), [seed, settings, fixed])
  const after = useMemo(() => (tpl ? redecode(now, { ...fixed, templates: tpl }) : null), [tpl, now, fixed])
  const back = useMemo(() => (tpl ? runTrial({ requestedGesture: 'pinch', seed }, { ...fixed, templates: tpl }) : null), [tpl, seed, fixed])
  const demos = useMemo(() => collectExamples(settings, round), [settings, round])
  const same = settings.placementAngle < 1 && settings.contactQuality > 0.99
  const change = (p: Partial<typeof settings>) => { setTpl(null); setFly(0); store.getState().resetTraining(); set(p) }
  const teach = () => {
    const done = () => { const t = calibrateTemplates(BASE_TEMPLATES, demos); setTpl(t); setRound((r) => r + 1); store.setState({ decoder: { ...store.getState().decoder, templates: t }, calibrated: true }) }
    if (store.getState().reduced) return done()
    setFly(1); setTimeout(done, 1500)
  }
  const result = after ?? now
  return (
    <section id="break" className="lab">
      <div className="lab-stick">
        <div className="dragger" data-hot role="slider" tabIndex={0} aria-label="Twist the band around the wrist" aria-valuemin={0} aria-valuemax={45} aria-valuenow={settings.placementAngle}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX + e.clientY, a: settings.placementAngle } }}
          onPointerMove={(e) => { if (drag.current) change({ placementAngle: Math.round(Math.max(0, Math.min(45, drag.current.a + (e.clientX + e.clientY - drag.current.x) * 0.16))) }) }}
          onPointerUp={() => { drag.current = null }}
          onKeyDown={(e) => { const d = { ArrowRight: 3, ArrowUp: 3, ArrowLeft: -3, ArrowDown: -3 }[e.key]; if (d) { e.preventDefault(); change({ placementAngle: Math.max(0, Math.min(45, settings.placementAngle + d)) }) } }}><span>Drag to twist</span></div>
        <div className="bench">
          <Title id="break" from={-0.4} to={9} text={'Now move the band.'} className="flow" />
          <div className="pair">
            <figure><Iris features={base.decision.features} label="Pinch, fitted: contacts around the circle, time outward." /><Say t={base} /><figcaption>Fitted</figcaption></figure>
            <figure className={fly && !tpl ? 'learning' : ''}>
              <Iris features={now.decision.features} label="The same pinch as worn now." />
              {fly > 0 && !tpl && <div className="orbit" aria-hidden="true">{demos.slice(0, DEMOS).map((d, i) => <span key={i} style={{ '--a': `${i * 30}deg`, '--d': `${i * 70}ms` } as never}><Iris features={featureOfExample(d.recording)} label="" /></span>)}</div>}
              <Say t={result} /><figcaption>{after ? `Taught, was ${fmt(now.decision.scores.pinch)}` : 'As worn'}</figcaption>
            </figure>
          </div>
          <div className="ctl">
            <Slider label="Twist" min={0} max={45} step={1} value={settings.placementAngle} onChange={(x) => change({ placementAngle: x })} show={`${settings.placementAngle}°`} />
            <Slider label="Loosen" min={0} max={0.9} step={0.05} value={1 - settings.contactQuality} onChange={(x) => change({ contactQuality: 1 - x })} show={`${Math.round((1 - settings.contactQuality) * 100)}%`} />
          </div>
          <div className="row">
            {same ? <Btn onClick={() => change({ placementAngle: 42, contactQuality: 1 })}>Twist it</Btn>
              : tpl ? <Btn aria-disabled={playing} onClick={() => store.getState().run('pinch', { seed })}>Pinch again</Btn>
              : <Btn aria-disabled={fly > 0} onClick={teach}>{fly ? 'Learning' : 'Teach it'}</Btn>}
            <button className="ghost" onClick={() => change({ placementAngle: 0, contactQuality: 0.3 })}>Loose</button>
            <button className="ghost" onClick={() => { setSeed((s) => s + 17); setTpl(null); setFly(0) }}>New pinch</button>
            <button className="ghost" onClick={() => { change({ ...DEFAULT_SETTINGS }); setSeed(DEMO_SEED) }}>Reset</button>
          </div>
          <details className="why"><summary>Details</summary>
            <div className="details"><div><p>{same ? 'Both are the same samples until you twist the band.' : explain(base, now)} {after && `After three examples per gesture (other seeds, blend ${BLEND}), the very same samples score ${fmt(after.decision.scores.pinch)}. Slide back to normal and the new references score ${fmt(back!.decision.scores.pinch)}. Teaching cannot recover signal that never reached a contact.`}</p>
              <p>Researchers report large differences in the signal for the same action across people and across times the band is put on.<Sup n={3} /> Meta says its band works out of the box for nearly everyone.<Sup n={1} /></p></div>
              <Scores trial={result} threshold={dec.threshold} /></div></details>
        </div>
        <p className="sr" aria-live="polite">{`As worn: ${result.decision.event ?? 'no command'}, match ${fmt(result.decision.scores.pinch)}.`}</p>
      </div>
    </section>
  )
}

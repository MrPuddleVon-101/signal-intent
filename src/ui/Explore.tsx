import { useMemo, useState } from 'react'
import { DEMO_SEED, useS, store } from '../store'
import { runTrial, type Trial } from '../model/trial'
import { createRecording, DEFAULT_TRIAL } from '../model/generator'
import { decode } from '../model/decoder'
import { DEFAULT_DECODER } from '../model/templates'
import { GESTURE_LABEL, type Gesture } from '../model/types'
import { Title, Why } from './lib'
import { explain, Iris, Scores, verdict } from './Figures'
import { Say, Slider } from './Labs'

const TABS = ['Time', 'Doubt', 'Touch', 'Change'] as const
export function Explore() {
  const [tab, setTab] = useState(0)
  return (
    <section id="explore" className="lab explore">
      <Title id="explore" from={-1.2} to={9} text={'Test it.'} className="flow" />
      <div className="ex-tabs" role="tablist" aria-label="Explore deeper">
        {TABS.map((t, i) => <button key={t} role="tab" id={`tab-${i}`} aria-selected={tab === i} aria-controls="ex-panel" tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)}
          onKeyDown={(e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { const n = (tab + d + TABS.length) % TABS.length; setTab(n); document.getElementById(`tab-${n}`)?.focus() } }}>{t}</button>)}
      </div>
      <div className="ex-panel" id="ex-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} key={tab}>{tab === 0 && <Order />}{tab === 1 && <Doubt />}{tab === 2 && <Touch />}{tab === 3 && <Compare />}</div>
    </section>
  )
}
const Seg = ({ items, at, set, label }: { items: string[]; at: number; set: (i: number) => void; label: string }) => <div className="seg" role="group" aria-label={label}>{items.map((x, i) => <button key={x} aria-pressed={at === i} onClick={() => set(i)}>{x}</button>)}</div>
const GS: Gesture[] = ['left', 'right']
const ORDERS = [{ n: 'Forward', o: [0, 1, 2, 3] }, { n: 'Backward', o: [3, 2, 1, 0] }, { n: 'Shuffled', o: [2, 0, 3, 1] }]
function Order() {
  const [g, setG] = useState(0), [o, setO] = useState(0)
  const t = useMemo(() => runTrial({ requestedGesture: GS[g], seed: 64 }, { ...DEFAULT_DECODER, windowOrder: ORDERS[o].o }), [g, o])
  return <div className="stage"><Iris features={t.decision.features} label="Swipe pattern with its time windows reordered" className="xl" />
    <div className="stage-r"><Say t={t} /><p className="one">You asked for {GESTURE_LABEL[GS[g]].toLowerCase()}.</p><Seg label="Swipe" items={['Swipe left', 'Swipe right']} at={g} set={setG} /><Seg label="Time order" items={ORDERS.map((x) => x.n)} at={o} set={setO} />
      <Why>Each contact keeps about the same energy. Only the order of its four windows changes before classification. A gesture is a short sequence, not a still picture.</Why></div></div>
}
/** Forty-eight recordings, decoded again every time the threshold moves. */
const BATCH = (['rest', 'pinch', 'left', 'right'] as Gesture[]).flatMap((g, gi) => Array.from({ length: 12 }, (_, i) => ({ g, cfg: { ...DEFAULT_TRIAL, requestedGesture: g, seed: 3000 + gi * 100 + i, intensity: g === 'rest' ? 1 : 0.26 + (i / 11) * 0.8, placementAngle: g === 'rest' ? 0 : (i * 7) % 33, noiseLevel: 1 + (i % 3) * 0.3, contactQuality: 1 - ((i * 5) % 12) / 80 } })))
function Doubt() {
  const [sens, setSens] = useState(0.5)
  const thr = 0.88 - sens * 0.56, margin = 0.2 - sens * 0.18, gate = 0.26 - sens * 0.24
  const recs = useMemo(() => BATCH.map((b) => createRecording(b.cfg)), [])
  const out = useMemo(() => recs.map((r, i) => verdict({ config: BATCH[i].cfg, decision: decode(r, { ...DEFAULT_DECODER, threshold: thr, margin, gate, stableFrames: sens > 0.85 ? 2 : 3 }) } as Trial)), [recs, thr, margin, gate, sens])
  const n = (k: string) => out.filter((o) => o.kind === k).length
  return <div className="stage"><div className="matrix" role="img" aria-label={`${n('ok')} correct, ${n('miss')} missed, ${n('wrong')} wrong, ${n('false')} false commands`}>
      {(['rest', 'pinch', 'left', 'right'] as Gesture[]).map((g, gi) => <div key={g}><span>{GESTURE_LABEL[g]}</span>{out.slice(gi * 12, gi * 12 + 12).map((o, i) => <i key={i} className={o.kind} title={o.word}>{o.mark}</i>)}</div>)}</div>
    <div className="stage-r"><p className="say"><b>{n('ok')}</b><span>right of 48</span></p><Slider label="Sensitivity" min={0} max={1} step={0.02} value={sens} onChange={setSens} show={thr.toFixed(2)} />
      <p className="one">{n('miss')} missed, {n('wrong')} wrong, {n('false')} false.</p><button className="ghost" onClick={() => store.getState().setDecoder({ threshold: thr, margin, gate })}>Use this everywhere</button>
      <Why>Synthetic trials with varied strength, fit and noise. {'✓'} correct, {'○'} miss, {'×'} wrong, ! false. They say nothing about any product or person.</Why></div></div>
}
function Touch() {
  const [mask, setMask] = useState<boolean[]>(() => Array(8).fill(true)), [g, setG] = useState(0), G: Gesture[] = ['left', 'right', 'pinch']
  const thr = useS((s) => s.decoder.threshold)
  const t = useMemo(() => runTrial({ requestedGesture: G[g], seed: 41 }, { ...DEFAULT_DECODER, channelMask: mask }), [mask, g]) // eslint-disable-line
  const shown = useMemo(() => t.decision.features.map((v, i) => (mask[Math.floor(i / 4)] ? v : 0)), [t, mask])
  const v = verdict(t)
  return <div className="stage"><div className="ring-pick"><Iris features={shown} label="Pattern from the contacts you kept" className="xl" />{mask.map((m, i) => { const a = (i / 8) * Math.PI * 2; return <button key={i} aria-pressed={m} style={{ left: `${50 - Math.sin(a) * 57}%`, top: `${50 - Math.cos(a) * 57}%` }} onClick={() => setMask((x) => { const y = [...x]; y[i] = !y[i]; return y.some(Boolean) ? y : x })}>S{i + 1}</button> })}</div>
    <div className="stage-r"><Say t={t} /><p className="one">{mask.filter(Boolean).length} of 8 contacts. {v.word}.</p><Seg label="Gesture" items={['Swipe left', 'Swipe right', 'Pinch']} at={g} set={setG} /><div className="row"><button className="ghost" onClick={() => setMask(Array.from({ length: 8 }, (_, i) => i === 2))}>Only S3</button><button className="ghost" onClick={() => setMask(Array(8).fill(true))}>All eight</button></div>
      <details className="why"><summary>Scores</summary><Scores trial={t} threshold={thr} /></details></div></div>
}
const PAIRS: { n: string; p: Record<string, number | string> }[] = [{ n: 'Shifted band', p: { placementAngle: 42 } }, { n: 'Another gesture', p: { requestedGesture: 'left' } }, { n: 'Weaker', p: { intensity: 0.22 } }, { n: 'Noisier', p: { noiseLevel: 4 } }]
function Compare() {
  const [i, setI] = useState(0), [seed, setSeed] = useState(DEMO_SEED)
  const a = useMemo(() => runTrial({ requestedGesture: 'pinch', seed }, DEFAULT_DECODER), [seed]), b = useMemo(() => runTrial({ requestedGesture: 'pinch', seed, ...PAIRS[i].p }, DEFAULT_DECODER), [seed, i])
  return <div className="stage"><div className="pair"><figure><Iris features={a.decision.features} label="Trial A" /><Say t={a} /><figcaption>A</figcaption></figure><figure><Iris features={b.decision.features} label="Trial B" /><Say t={b} /><figcaption>B</figcaption></figure></div>
    <div className="stage-r"><p className="one">Change exactly one thing.</p><div className="vlist" role="group" aria-label="What changes in B">{PAIRS.map((p, k) => <button key={p.n} aria-pressed={i === k} onClick={() => setI(k)}>{p.n}</button>)}</div><button className="ghost" onClick={() => setSeed((s) => s + 23)}>New pinch</button><Why label="Explain this">{explain(a, b)}</Why></div></div>
}

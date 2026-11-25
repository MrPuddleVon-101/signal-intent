import { useState } from 'react'
import { DEMO_SEED, getConfig, store, useS } from '../store'
import { CARDS, runTrial } from '../model/trial'
import { GESTURE_LABEL, type Gesture } from '../model/types'
import { Behind, Btn, Cue, goTo, Title } from './lib'
import { fmt, LiveTraces, word } from './Figures'
import { LensHud } from './LensHud'

const ALT: Gesture[] = ['left', 'right', 'rest']
export function Dock({ first = false }: { first?: boolean }) {
  const playing = useS((s) => s.playing), run = useS((s) => s.run), n = useS((s) => s.seedCounter)
  return (
    <div className="dock">
      <Btn aria-disabled={playing} onClick={() => run('pinch')}>{first && n === 0 ? 'Try a pinch' : 'Pinch'}</Btn>
      {ALT.map((g) => <button key={g} className="alt" aria-disabled={playing} onClick={() => run(g)}><svg viewBox="0 0 20 20" aria-hidden="true">{g === 'left' ? <path d="M12 4L6 10l6 6" /> : g === 'right' ? <path d="M8 4l6 6-6 6" /> : <path d="M4 10h12" />}</svg><span>{GESTURE_LABEL[g]}</span></button>)}
    </div>
  )
}
export function Hero() {
  const trial = useS((s) => s.trial), playing = useS((s) => s.playing), done = useS((s) => s.eventDone), glasses = useS((s) => s.glasses)
  const settings = useS((s) => s.settings), seen = useS((s) => s.seenSuccess), calibrated = useS((s) => s.calibrated)
  const [ba, setBa] = useState<{ b: number; a: number } | null>(null)
  const shifted = settings.placementAngle > 24, e = trial?.decision.event ?? null
  const next = playing || !seen ? null
    : !shifted ? { t: 'Now shift the band', f: () => { setBa(null); store.getState().set({ placementAngle: 42 }); store.getState().run('pinch', { seed: DEMO_SEED }) } }
    : !calibrated ? { t: 'Teach it this position', f: () => {
        // one new held-out pinch, scored before and after. The examples use other seeds.
        const st = store.getState(), b = runTrial(getConfig(st, 'pinch', DEMO_SEED + 1), st.decoder).decision.scores.pinch
        st.calibrate(Date.now() % 997); st.run('pinch', { seed: DEMO_SEED + 1 }); setBa({ b, a: store.getState().trial!.decision.scores.pinch })
      } }
    : { t: 'See why', f: () => goTo('skin', 0.16) }
  return (
    <section id="try" className="film" style={{ height: '560vh' }}>
      <div className="stick">
        <Behind><Title id="try" from={-1} to={0.1} as="h1" className="hero-title" text={'Your fingers move.\nYour wrist\ngives them away.'} /></Behind>
        <Cue id="try" from={-1} to={0.1} className="hero-foot">
          <div className="hf-l"><Dock first /><div className="nextrow">{next ? <Btn kind="line" onClick={next.f}>{next.t}</Btn> : <p className="tiny">Interactive teaching model</p>}</div></div>
          <div className={`hf-m ${trial ? 'on' : ''}`}><LiveTraces /></div>
          <div className="hf-r"><LensHud />
            <div className="verb" aria-hidden="true">{trial && done ? <div key={trial.id} className={e ? 'hit' : 'no'}><b>{word(e)}</b><span>{ba && calibrated && shifted ? `same pinch ${fmt(ba.b)}, now ${fmt(ba.a)}` : e ? `match ${fmt(trial.decision.scores[trial.decision.ranked[0]])}` : 'No confident command'}</span></div> : <p className="tiny">Illustrative glasses display</p>}</div></div>
        </Cue>
        <Title id="try" from={0.28} to={0.53} className="fr-l xs dark" text={'Fingers are\npulled from\nthe forearm.'} />
        <Title id="try" from={0.36} to={0.53} className="fr-r xs dark" text={'So listen\nat the wrist.'} />
        <div className="sr" aria-live="polite">{done && trial ? `${e ?? 'No confident command. The glasses do nothing.'} ${trial.decision.reason} Focus on ${CARDS[glasses.focus]}${glasses.selected !== null ? ', opened' : ''}. The band does not need to see your fingers. It recognises a pattern at your wrist.` : ''}</div>
      </div>
    </section>
  )
}

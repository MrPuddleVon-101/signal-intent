import { useS } from '../store'
import { Behind, Cue, goTo, Sup, Title, type SectionId } from './lib'
import { Dock } from './Hero'
import { LensHud } from './LensHud'
import { word } from './Figures'

const STEPS: [string, SectionId, number][] = [['Finger motion', 'try', 0], ['Muscle activity', 'skin', 0.2], ['Sensor pattern', 'signal', 0.34], ['Command', 'signal', 1]]
export function Lens() {
  const last = useS((s) => s.glasses.lastEvent)
  return (
    <section id="lens" className="film" style={{ height: '420vh' }}>
      <div className="stick">
        <Behind><Title id="lens" from={0.36} to={0.44} className="tc up" text={'Look through it.'} /></Behind>
        <Behind><Title id="lens" from={0.76} to={1.02} className="tl sm" text={'It reads muscle.\nNot your fingers.\nNot your mind.'} /></Behind>
        <Cue id="lens" from={0.36} to={0.62} className="through"><LensHud big /></Cue>
        <Cue id="lens" from={0.82} to={1.02} className="finale">
          <ol className="chain">{STEPS.map(([t, id, p]) => <li key={t}><button onClick={() => goTo(id, p)}>{t}</button></li>)}</ol>
          <div className="row"><Dock />{last && <span className="tiny">{word(last)}</span>}</div>
        </Cue>
      </div>
    </section>
  )
}

const SOURCES: [string, string, string, string][] = [
  ['Meta Ray-Ban Display: AI Glasses With an EMG Wristband', 'Meta, 17 September 2025', 'https://about.fb.com/news/2025/09/meta-ray-ban-display-ai-glasses-emg-wristband/', 'Supports: pinch and thumb swipe as examples, the wristband translating muscle signals into commands for the glasses, and the out-of-the-box claim.'],
  ['EMG Wristbands and Technology', 'Meta', 'https://www.meta.com/emerging-tech/emg-wearable-technology/', 'Supports: sensing muscle activity at the wrist, processing EMG on-device, and not needing hands inside a camera’s view.'],
  ['A generic non-invasive neuromotor interface for human-computer interaction', 'Kaifosh, Reardon and CTRL-labs at Reality Labs. Nature 645, 702 to 711 (2025)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12443603/', 'Supports: what sEMG measures, 16 bipolar channels at 2 kHz on a research device, nine gestures, model type, participant range, variability across people and wearings, and the 16% personalisation result.'],
  ['generic-neuromotor-interface, code and dataset', 'Meta Reality Labs, CC BY-NC 4.0', 'https://github.com/facebookresearch/generic-neuromotor-interface', 'Supports: availability and licence of the research data. No recordings are redistributed here.'],
]
const LIMITS = ['Muscle sources, tissue, contacts and noise are synthetic.', 'The arm, hand, band and glasses are generic geometry, not measured or verified products.', 'Eight contacts is our choice. The consumer layout is unknown to us.', 'The filter, features and template classifier are deliberately small.', 'No electrodes are involved. Nothing on this page reads your real muscles.', 'Scores are template comparisons. No accuracy is claimed for any product.']

const ROWS: [string, React.ReactNode, string][] = [
  ['Channels', <>16 bipolar, research band<Sup n={3} /></>, '8, chosen for clarity'],
  ['Sampling', <>2 kHz<Sup n={3} /></>, '1 kHz, simulated'],
  ['Decoder', <>Convolution then LSTM<Sup n={3} /></>, 'RMS windows and templates'],
  ['Learned from', <>162 to 6,627 people, by task<Sup n={3} /></>, '12 synthetic examples per class'],
  ['Runs on', <>On-device<Sup n={2} /></>, 'Your browser'],
  ['Consumer internals', <>Not publicly established</>, 'Not modelled'],
]
export function Credits() {
  return (
    <section id="credits" className="credits">
      <div className="cr">
        <div className="context"><img className="cr-photo" src="./img/real/demo.webp" alt="Mark Zuckerberg in glasses, pinching, wearing the band" loading="lazy" decoding="async" /><p className="tiny">Meta introduced its display glasses and Neural Band in September 2025.<Sup n={1} /> Press photograph. No endorsement implied.</p></div>
        <div className="cr-list">
          <details open><summary>Sources</summary><ol className="src">{SOURCES.map(([t, by, u, s], i) => <li key={u} id={`source-${i + 1}`} tabIndex={-1}><a href={u} target="_blank" rel="noreferrer">{t}</a><span>{by}. {s}</span></li>)}</ol></details>
          <details><summary>Research and this page</summary><table><thead><tr><th scope="col"> </th><th scope="col">Published</th><th scope="col">Here</th></tr></thead><tbody>{ROWS.map((r) => <tr key={r[0]}><th scope="row">{r[0]}</th><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></details>
          <details><summary>Limits</summary><ul className="limits">{LIMITS.map((l) => <li key={l}>{l}</li>)}</ul></details>
          <details><summary>Credits</summary><p className="tiny">Global Virtual Hackathon 2026. Independent, not affiliated with Meta, Ray-Ban or EssilorLuxottica. Hand mesh: WebXR generic hand, MIT, Amazon. Type: Unbounded and Host Grotesk, SIL OFL. Portrait: Jeff Sainlar, Meta, <a href="https://commons.wikimedia.org/wiki/File:Mark_Zuckerberg_(2025).jpg" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>, cropped, toned, and composited with a product photograph of the glasses; our version is shared under the same licence. Product, lifestyle and research wristband photographs: Meta press images. Conference photograph: press. Press image rights to be confirmed before publication. No endorsement implied.</p></details>
        </div>
      </div>
      <button className="again" onClick={() => goTo('try')}>again</button>
    </section>
  )
}
export function Legend() {
  return <dl className="legend"><div><dt className="tag doc">Publicly documented</dt><dd>Anything with a footnote number. It points to the source that supports it.</dd></div><div><dt className="tag sim">Our simulation</dt><dd>Every waveform, envelope, pattern, score and command. Computed here, in model units.</dd></div><div><dt className="tag concept">Conceptual artwork</dt><dd>The hand, muscle fibres, exploded band, glasses and lightning.</dd></div></dl>
}

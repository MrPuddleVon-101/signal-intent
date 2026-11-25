import { Behind, Cue, Sup, Title } from './lib'
/** Two portraits under a liquid brush. Then one print that turns. */
export function Maker() {
  return (
    <section id="maker" className="film" style={{ height: '760vh' }} aria-label="Mark Zuckerberg, then wearing the glasses, then pinching with the band on">
      <div className="stick">
        <Title id="maker" from={0.07} to={0.34} className="cl xs rv-l" text={'In 2025, Meta\nput a screen\nin the glasses.'} />
        <Cue id="maker" from={0.09} to={0.36} className="rv-hint"><span>Sweep across</span></Cue>
        <Title id="maker" from={0.42} to={0.54} className="cl xs rv-l" text={'It needed\na mouse.'} />
        <Behind><Title id="maker" from={0.66} to={0.8} className="cl xs" text={'The mouse\nis a wrist.'} /></Behind>
        <Cue id="maker" from={0.07} to={0.4} className="foot-r rv-note"><p className="tiny">Mark Zuckerberg. Photo Jeff Sainlar, CC BY-SA 4.0. Glasses composited in by us.<Sup n={1} /></p></Cue>
        <Cue id="maker" from={0.68} to={0.9} className="foot-r"><p className="tiny">Meta research wristband. Photo Meta.<Sup n={2} /></p></Cue>
      </div>
    </section>
  )
}

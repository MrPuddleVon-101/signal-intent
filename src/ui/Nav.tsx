import { useEffect, useRef, useState } from 'react'
import { liveEnvelope, store, useS } from '../store'
import { geo, Glass, goTo, lenis, SECTIONS, useFrame, view, type SectionId } from './lib'
import { scroll } from '../world/shared'
import { ensureAudio } from './sound'

const LINKS: [string, SectionId, number][] = [['try it', 'try', 0], ['inside', 'skin', 0.16], ['break it', 'break', 0.1], ['explore', 'explore', 0], ['sources', 'credits', 0.1]]
/** Open at the top of the film. Folds into a single bead of glass that carries the live signal. */
export function Nav() {
  const [open, setOpen] = useState(true), [pinned, setPinned] = useState(false), [here, setHere] = useState<string>('try')
  const bead = useRef<HTMLCanvasElement>(null), S = useRef({ y: 0, hold: -9999, open: true, pinned: false, here: 'try' })
  S.current.open = open; S.current.pinned = pinned
  const sound = useS((s) => s.sound), still = useS((s) => s.paused || s.reduced)
  useFrame((now) => {
    const s = S.current, y = scroll.y
    if (!s.pinned) { const want = y < view.h * 0.2; if (want !== s.open && Math.abs(y - s.hold) > 60) setOpen(want) } else if (Math.abs(y - s.y) > 260) setPinned(false)
    let cur = 'try'; for (const id of SECTIONS) if (geo[id] && geo[id].top < y + view.h * 0.5) cur = id
    if (cur !== s.here) { s.here = cur; setHere(cur) }
    const cv = bead.current!, d = Math.min(2, devicePixelRatio)
    if (cv.width !== 56 * d) cv.width = cv.height = 56 * d
    const c = cv.getContext('2d')!; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, 56, 56)
    c.lineWidth = 2.5; c.lineCap = 'round'; c.strokeStyle = '#ffffff'; c.beginPath(); c.arc(28, 28, 24, -1.5708, -1.5708 + Math.max(0.01, y / Math.max(1, view.doc - view.h)) * 6.283); c.stroke()
    const env = liveEnvelope(now); c.lineWidth = 2.4
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283 - 1.5708, e = Math.min(1, env[i]); c.strokeStyle = e > 0.25 ? '#ffffff' : '#f3f6ff'; c.beginPath(); c.moveTo(28 + Math.cos(a) * 8, 28 + Math.sin(a) * 8); c.lineTo(28 + Math.cos(a) * (11 + e * 9), 28 + Math.sin(a) * (11 + e * 9)); c.stroke() }
  })
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setPinned(false) }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  const go = (id: SectionId, p: number) => { setPinned(false); goTo(id, p) }
  const toggle = () => { const s = S.current, small = innerWidth <= 900; s.y = scroll.y; if (pinned) setPinned(false); else if (small || !open) setPinned(true); else { s.hold = scroll.y; setOpen(false) } }
  const shown = open || pinned
  return (
    <header className={`nav ${shown ? 'open' : 'shut'} ${pinned ? 'pinned' : ''}`}>
      <Glass className="nav-glass">
        <button className="bead" aria-expanded={shown} aria-label={shown ? 'Fold menu' : 'Open menu'} onClick={toggle}><canvas ref={bead} style={{ width: 56, height: 56 }} /></button>
        <div className="nav-inner" inert={!shown}>
          <a className="brand" href="#try" onClick={(e) => { e.preventDefault(); go('try', 0) }}>signal<i>/</i>intent</a>
          <nav aria-label="Film">{LINKS.map(([l, id, p]) => <a key={id} className="roll" data-t={l} href={`#${id}`} aria-current={here === id || (id === 'skin' && (here === 'maker' || here === 'band' || here === 'signal')) || (id === 'explore' && (here === 'lens' || here === 'ladder' || here === 'atmos')) ? 'step' : undefined} onClick={(e) => { e.preventDefault(); go(id, p) }}><span>{l}</span></a>)}</nav>
          <div className="nav-tools">
            <button onClick={() => store.setState({ panel: 'simulated' })}>What is simulated?</button>
            <button className="ico" aria-pressed={sound} aria-label={sound ? 'Turn the sound off' : 'Turn the sound on'} onClick={() => { ensureAudio(); store.setState({ sound: !sound }) }}><svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor" stroke="none" />{sound ? <path d="M16 9c1.6 1.6 1.6 4.400 0 6M18.500 6.500c3 3 3 8 0 11" /> : <path d="M17 10l4 4m0-4l-4 4" />}</svg></button>
            <button className="ico" aria-pressed={still} aria-label={still ? 'Play motion' : 'Pause motion'} onClick={() => { const n = !still; store.setState({ paused: n, reduced: n }); if (lenis) lenis.options.lerp = n ? 1 : 0.085 }}><svg viewBox="0 0 24 24">{still ? <path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" /> : <path d="M8 6v12M16 6v12" />}</svg></button>
          </div>
        </div>
      </Glass>
    </header>
  )
}

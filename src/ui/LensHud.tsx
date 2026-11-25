import { useS } from '../store'
/** An illustrative in-lens display. It listens to decoded events only. */
export function LensHud({ big = false }: { big?: boolean }) {
  const g = useS((s) => s.glasses)
  return (
    <div className={`hud ${big ? 'big' : ''}`} data-sel={g.selected !== null} aria-label="Illustrative glasses display" role="img">
      {['message', 'music', 'map'].map((n, i) => (
        <div key={n} className={`tile t-${n}`} data-focus={g.focus === i} data-open={g.selected === i} data-dim={g.selected !== null && g.selected !== i}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {i === 0 && <g><path className="b1" d="M14 24h52v26H30l-10 10V50h-6z" /><path className="b2" d="M40 58h46v22H76l-8 8v-8H40z" /></g>}
            {i === 1 && <g className="bars">{[0, 1, 2, 3, 4].map((k) => <rect key={k} x={16 + k * 15} y="20" width="9" height="60" style={{ '--k': k } as never} />)}</g>}
            {i === 2 && <g><path className="st" d="M0 30L100 16M0 72L100 84M30 0L22 100M72 0L84 100" /><path className="rt" pathLength="1" d="M24 90L27 52Q29 24 76 22" /><circle cx="76" cy="22" r="8" /></g>}
          </svg>
          <b>{n}</b>
        </div>
      ))}
      <i className="bracket" style={{ '--f': g.focus } as never} />
    </div>
  )
}

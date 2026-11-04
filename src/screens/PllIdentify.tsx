import { useMemo, useState } from 'react';
import { TopBar, MoveList } from '../ui/widgets';
import { Diagram } from '../ui/Diagram';
import { identify, distinctCases, preMove, SideColour, Entry } from '../training/pllId';
import { FAMILY_BY_ID } from '../content/cases';
import { parseAlg } from '../cube/cube';
import type { Nav } from '../App';

const HEX: Record<SideColour, string> = { F: '#15b85a', R: '#e0303d', B: '#2563eb', L: '#ff7a1a' };
const NAME: Record<SideColour, string> = { F: 'Green', R: 'Red', B: 'Blue', L: 'Orange' };
const YELLOW = '#ffd23f';
const EMPTY = '#2a3040';

// isometric projection of the top layer (front face on the left, right face on the right)
const P = (x: number, y: number, z: number) => [(x - z) * 0.866 * 30, ((x + z) * 0.5 - y) * 30];
function quad(c: number[], du: number[], dv: number[], s = 0.44) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    .map(([a, b]) => P(c[0] + du[0] * a * s + dv[0] * b * s, c[1] + du[1] * a * s + dv[1] * b * s, c[2] + du[2] * a * s + dv[2] * b * s).join(','))
    .join(' ');
}

/**
 * "Which PLL do I have?" Enter the 6 side stickers of the top layer that you
 * see on your real cube; candidates narrow down live.
 */
export function PllIdentify({ nav }: { nav: Nav }) {
  const [cells, setCells] = useState<(SideColour | null)[]>([null, null, null, null, null, null]);
  const [sel, setSel] = useState(0);
  const found = useMemo(() => identify(cells), [cells]);
  const cases = useMemo(() => distinctCases(found), [found]);
  const filled = cells.filter(Boolean).length;

  const set = (c: SideColour | null) => {
    const next = cells.slice();
    next[sel] = c;
    setCells(next);
    if (c && sel < 5) setSel(sel + 1);
  };

  const stickers = [
    // front: x = -1..1 at z = 1.5, top row y = 1
    ...[-1, 0, 1].map((x) => quad([x, 1, 1.5], [1, 0, 0], [0, 1, 0])),
    // right: z = 1..-1 at x = 1.5
    ...[1, 0, -1].map((z) => quad([1.5, 1, z], [0, 0, -1], [0, 1, 0])),
  ];

  return (
    <div className="screen scroll pll-id">
      <TopBar title={<><div className="tb-main">Which PLL?</div><div className="tb-sub">Read it from your own cube</div></>} onBack={nav.canBack ? nav.back : undefined} />
      <div className="card">
        <div className="small muted">Hold the cube with <b style={{ color: YELLOW }}>yellow on top</b>. Look at the <b>top row</b> of the front side and the right side, and tap in the 6 colours you see.</div>
        <svg viewBox="-100 -96 200 204" className="pll-input" role="group" aria-label="Top layer stickers">
          {[-1, 0, 1].flatMap((x) => [-1, 0, 1].map((z) => <polygon key={`t${x}${z}`} points={quad([x, 1.5, z], [1, 0, 0], [0, 0, 1])} fill={YELLOW} stroke="#05060a" strokeWidth={2} />))}
          {[-1, 0, 1].flatMap((x) => [0, -1].map((y) => <polygon key={`f${x}${y}`} points={quad([x, y, 1.5], [1, 0, 0], [0, 1, 0])} fill="#1b202b" stroke="#05060a" strokeWidth={2} />))}
          {[1, 0, -1].flatMap((z) => [0, -1].map((y) => <polygon key={`r${z}${y}`} points={quad([1.5, y, z], [0, 0, -1], [0, 1, 0])} fill="#1b202b" stroke="#05060a" strokeWidth={2} />))}
          {stickers.map((pts, i) => (
            <polygon
              key={i}
              points={pts}
              fill={cells[i] ? HEX[cells[i]!] : EMPTY}
              stroke={i === sel ? '#ffffff' : '#05060a'}
              strokeWidth={i === sel ? 4 : 2}
              className="tap"
              onClick={() => setSel(i)}
            />
          ))}
          <text x={-62} y={104} className="svg-label">FRONT</text>
          <text x={32} y={104} className="svg-label">RIGHT</text>
        </svg>
        <div className="palette">
          {(['R', 'F', 'L', 'B'] as SideColour[]).map((c) => (
            <button key={c} className="swatch" style={{ background: HEX[c] }} onClick={() => set(c)} aria-label={NAME[c]}>{NAME[c]}</button>
          ))}
          <button className="swatch clear" onClick={() => set(null)}>Clear</button>
        </div>
        {filled > 0 && <button className="chip" onClick={() => { setCells([null, null, null, null, null, null]); setSel(0); }}>Start over</button>}
      </div>

      {filled > 0 && (
        <section className="card">
          {cases.length === 0 && <div className="beat warn">No case matches these colours. Check them again: orange and red are easy to mix up.</div>}
          {cases.length === 1 && <Answer entries={found} nav={nav} />}
          {cases.length > 1 && (
            <>
              <div className="section-title">{cases.length} possible · add more stickers</div>
              <div className="cand-grid">
                {cases.map((c) => {
                  const e = found.find((x) => x.def === c)!;
                  return (
                    <div key={c?.id ?? 'solved'} className="cand">
                      <Diagram state={e.state} stage="pll" size={44} />
                      <span>{c ? c.name.replace(' perm', '') : 'Solved'}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      <Guide />
    </div>
  );
}

function Answer({ entries, nav }: { entries: Entry[]; nav: Nav }) {
  const e = entries[0];
  if (!e.def) {
    return <div className="beat good">Your last layer is already solved. Just turn the top until it lines up.</div>;
  }
  const fam = FAMILY_BY_ID[e.def.family];
  const pre = preMove(e.pre);
  return (
    <div className="answer">
      <div className="answer-head">
        <Diagram state={e.state} stage="pll" size={80} />
        <div>
          <div className="answer-name">{e.def.name}</div>
          <div className="muted small">{fam.glyph} {fam.title}</div>
        </div>
      </div>
      <ol className="answer-steps">
        <li>{pre ? <>Turn the top: <b className="mono">{pre}</b> (keep holding the cube the same way)</> : 'No setup turn needed'}</li>
        <li>Do the algorithm: <MoveList moves={parseAlg(e.def.alg)} /></li>
        <li>Turn the top until everything lines up</li>
      </ol>
      <div className="row buttons">
        <button className="cta" onClick={() => nav.push({ name: 'lesson', caseId: e.def!.id })}>Learn {e.def.name.replace(' perm', '')} on the 3D cube</button>
      </div>
    </div>
  );
}

function Guide() {
  return (
    <section className="card guide">
      <div className="section-title">How to recognise any PLL</div>
      <div className="guide-step">
        <b>1 · Find the headlights.</b> Headlights are when the two <i>corner</i> stickers on one side are the same colour. Check every side.
      </div>
      <div className="guide-step">
        <b>2 · Find the blocks.</b> A <i>1×2 block</i> is two stickers next to each other with the same colour, a corner and an edge. A <i>solved side</i> is all three the same.
      </div>
      <div className="guide-branch">
        <div><b>Headlights on all 4 sides</b> → only the edges move.<br />One side fully solved → <b>Ua / Ub</b>. No solved side: the middle stickers are the opposite colour → <b>H</b>; a neighbouring colour → <b>Z</b>.</div>
        <div><b>Headlights on 1 side</b> → two corners trade places.<br />A fully solved side with 1×2 blocks beside it → <b>Ja / Jb</b>. A fully solved side and no blocks → <b>F</b>. Two 1×2 blocks: the side opposite the headlights has a block → <b>Aa / Ab</b>; it shows 3 different colours → <b>T</b>. Only one 1×2 block → <b>Ra / Rb</b> or one of the <b>G</b> perms.</div>
        <div><b>No headlights at all</b> → two diagonal corners trade places.<br />No blocks → <b>E</b>. Two 1×2 blocks → <b>Y</b> or <b>V</b>. A 1×2 block on every side → <b>Na / Nb</b>.</div>
      </div>
      <div className="guide-step muted small">Tip: you only need two sides. Look at the front and right; the colours there decide the case. The tool above uses the same trick.</div>
    </section>
  );
}

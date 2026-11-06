import { useMemo, useState } from 'react';
import { TopBar, MoveList } from '../ui/widgets';
import { Diagram } from '../ui/Diagram';
import { identify, distinctCases, preMove, SideColour, Entry } from '../training/pllId';
import { FAMILY_BY_ID } from '../content/cases';
import { TwoSideView, RecogSteps, SIDE_HEX, SIDE_NAME } from '../ui/TwoSideView';
import { explain } from '../training/pllRecog';
import { parseAlg } from '../cube/cube';
import { scheme, setScheme } from '../ui/scheme';
import type { Nav } from '../App';

const HEX = SIDE_HEX;
const NAME = SIDE_NAME;
const YELLOW = '#ffd23f';
const ORDER = ['Red', 'Green', 'Orange', 'Blue'];
const PALETTE = (['F', 'R', 'B', 'L'] as SideColour[]).sort((a, b) => ORDER.indexOf(SIDE_NAME[a]) - ORDER.indexOf(SIDE_NAME[b]));

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


  return (
    <div className="screen scroll pll-id">
      <TopBar title={<><div className="tb-main">Which PLL?</div><div className="tb-sub">Read it from your own cube</div></>} onBack={nav.canBack ? nav.back : undefined} />
      <div className="card">
        <div className="small muted">Hold the cube with <b style={{ color: YELLOW }}>yellow on top</b>. Look at the <b>top row</b> of the front side and the right side, and tap in the 6 colours you see.</div>
        <TwoSideView colours={cells} selected={sel} onTap={setSel} numbers />
        <div className="palette">
          {PALETTE.map((c) => (
            <button key={c} className="swatch" style={{ background: HEX[c] }} onClick={() => set(c)} aria-label={NAME[c]}>{NAME[c]}</button>
          ))}
          <button className="swatch clear" onClick={() => set(null)}>Clear</button>
        </div>
        {filled > 0 && <button className="chip" onClick={() => { setCells([null, null, null, null, null, null]); setSel(0); }}>Start over</button>}
        <SchemePicker />
      </div>

      {filled > 0 && (
        <section className="card">
          {cases.length === 0 && <div className="beat warn">No case matches these colours. Check them again: orange and red are easy to mix up. Also check the colour setting above: hold yellow on top and green in front. Which colour is on the right of your cube?</div>}
          {cases.length === 1 && <Answer entries={found} nav={nav} colours={filled === 6 ? (cells as SideColour[]) : null} />}
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

function Answer({ entries, nav, colours }: { entries: Entry[]; nav: Nav; colours: SideColour[] | null }) {
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
      {colours && (
        <>
          <div className="section-title">How to see it next time</div>
          <RecogSteps ex={explain(colours)} />
        </>
      )}
      <div className="row buttons">
        <button className="chip" onClick={() => nav.push({ name: 'pll-2side' })}>Practise 2-side</button>
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

/** Cubes differ: with yellow on top and green in front, most have orange on the right. */
export function SchemePicker() {
  const sc = scheme();
  return (
    <div className="scheme">
      <div className="small muted">Your cube: hold <b>yellow on top</b> and <b>green in front</b>. Which colour is on the <b>right</b>?</div>
      <div className="segmented">
        <button className={sc === 'standard' ? 'on' : ''} onClick={() => sc !== 'standard' && setScheme('standard')}>Orange (most cubes)</button>
        <button className={sc === 'mirrored' ? 'on' : ''} onClick={() => sc !== 'mirrored' && setScheme('mirrored')}>Red</button>
      </div>
    </div>
  );
}

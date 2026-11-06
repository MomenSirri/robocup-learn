import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar, Segmented, MoveList } from '../ui/widgets';
import { TwoSideView, RecogSteps } from '../ui/TwoSideView';
import { entries, Entry, SideColour } from '../training/pllId';
import { explain, allGroups, PATTERN_TEXT, RELATION_TEXT, STICKER_LABEL, Relation } from '../training/pllRecog';
import { CASES, CaseDef } from '../content/cases';
import { isKnown, logAnswer, pickNext } from '../training/store';
import { parseAlg } from '../cube/cube';
import type { Nav } from '../App';

type Pool = 'all' | 'edges' | 'known';
const RING: SideColour[] = ['F', 'R', 'B', 'L'];
const PLLS = CASES.filter((c) => c.stage === 'pll');
const short = (c: CaseDef) => c.name.replace(' perm', '');
const BY_SHORT = Object.fromEntries(PLLS.map((c) => [short(c), c]));

interface Round {
  def: CaseDef;
  colours: SideColour[];
  options: CaseDef[];
}

function makeRound(pool: CaseDef[], last?: string): Round {
  const def = pickNext(pool, last);
  const views = entries().filter((e: Entry) => e.def?.id === def.id);
  const v = views[Math.floor(Math.random() * views.length)];
  const k = Math.floor(Math.random() * 4); // which colour faces you
  const colours = v.pattern.map((c) => RING[(RING.indexOf(c) + k) % 4]);
  // options: the look-alikes from the same 2-side pattern first, then the rest of the pool
  const look = explain(colours).candidates.map((n) => BY_SHORT[n]).filter(Boolean);
  const others = pool.filter((c) => c.id !== def.id && !look.includes(c)).sort(() => Math.random() - 0.5);
  const opts = Array.from(new Set([def, ...look, ...others])).slice(0, Math.min(6, Math.max(4, look.length)));
  return { def, colours, options: opts.sort(() => Math.random() - 0.5) };
}

/**
 * 2-side recognition trainer: see only what you see in a real solve (front
 * and right of the top layer), name the PLL fast, then see the reasoning.
 */
export function Pll2Side({ nav }: { nav: Nav }) {
  const [pool, setPool] = useState<Pool>('all');
  const cases = useMemo(() => {
    if (pool === 'edges') return PLLS.filter((c) => c.family === 'pll-edges');
    if (pool === 'known') {
      const k = PLLS.filter((c) => isKnown(c.id));
      return k.length >= 2 ? k : PLLS;
    }
    return PLLS;
  }, [pool]);
  const [round, setRound] = useState<Round>(() => makeRound(cases));
  const [picked, setPicked] = useState<CaseDef | null>(null);
  const [ms, setMs] = useState(0);
  const [score, setScore] = useState({ n: 0, ok: 0, times: [] as number[] });
  const shownAt = useRef(performance.now());

  const next = useCallback(() => {
    setRound((r) => makeRound(cases, r.def.id));
    setPicked(null);
    shownAt.current = performance.now();
  }, [cases]);

  useEffect(() => {
    next();
  }, [next]);

  const choose = (c: CaseDef) => {
    if (picked) return;
    const t = performance.now() - shownAt.current;
    setMs(t);
    setPicked(c);
    logAnswer(round.def.id, c.id, t);
    const ok = c.id === round.def.id;
    setScore((s) => ({ n: s.n + 1, ok: s.ok + (ok ? 1 : 0), times: ok ? [...s.times, t] : s.times }));
  };

  const ex = useMemo(() => explain(round.colours), [round]);
  const marks: Record<number, string> = {};
  if (picked) ex.steps.forEach((s, k) => { const l = String.fromCharCode(65 + k); marks[s.check.i] = (marks[s.check.i] ?? '') + l; marks[s.check.j] = (marks[s.check.j] ?? '') + l; });
  const avg = score.times.length ? score.times.reduce((a, b) => a + b, 0) / score.times.length : 0;
  const ok = picked?.id === round.def.id;

  return (
    <div className="screen scroll pll2">
      <TopBar
        title={<><div className="tb-main">2-side PLL</div><div className="tb-sub">{score.n ? `${score.ok}/${score.n} · avg ${(avg / 1000).toFixed(1)}s` : 'Read it from just two sides'}</div></>}
        onBack={nav.canBack ? nav.back : undefined}
      />
      <div className="trainer-config">
        <Segmented<Pool> value={pool} onChange={setPool} options={[{ id: 'all', label: 'All 21' }, { id: 'edges', label: 'U · H · Z' }, { id: 'known', label: 'I know' }]} />
      </div>

      <div className="card">
        <TwoSideView colours={round.colours} marks={picked ? marks : undefined} numbers={!!picked} />
        {!picked && (
          <div className={'options ' + (round.options.length > 4 ? 'three' : 'grid')}>
            {round.options.map((c) => (
              <button key={c.id} className="option" onClick={() => choose(c)}>{short(c)}</button>
            ))}
          </div>
        )}
        {picked && (
          <div className={'feedback ' + (ok ? 'ok' : 'bad')}>
            <div className="feedback-head">
              <span className="verdict">{ok ? '✓' : '✗'}</span>
              <div>
                <div className="feedback-title">{short(round.def)}{!ok && <span className="muted"> · you said {short(picked)}</span>}</div>
                <div className="muted small">{(ms / 1000).toFixed(2)}s</div>
              </div>
            </div>
            <div className="section-title">How to see it</div>
            <RecogSteps ex={ex} />
            <MoveList moves={parseAlg(round.def.alg)} label="Algorithm" />
            <div className="row buttons">
              <button className="chip" onClick={() => nav.push({ name: 'lesson', caseId: round.def.id })}>Lesson</button>
              <button className="cta" onClick={next}>Next →</button>
            </div>
          </div>
        )}
      </div>

      <section className="card">
        <div className="section-title">The method</div>
        <ol className="recog-steps">
          <li>Read the <b>front</b> as one pattern: headlights, a block, a solved side, or nothing.</li>
          <li>Read the <b>right</b> side the same way.</li>
          <li>The two patterns name the case, or narrow it to 2–3.</li>
          <li>If needed, compare one or two stickers (match, opposite or neighbour colours).</li>
        </ol>
        <div className="small muted">Opposite colours: green ↔ blue, red ↔ orange. Neighbours are any other pair.</div>
      </section>

      <PatternMap />
    </div>
  );
}

const OUT_TEXT = (k: string) => k.split('/').map((r) => RELATION_TEXT[r as Relation]).join(' + ');

/** Every 2-side look and what it means: the full cheat-sheet. */
function PatternMap() {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => allGroups().filter((g) => !g.cases.includes('Solved')).sort((a, b) => a.cases.length - b.cases.length || a.key.localeCompare(b.key)), []);
  return (
    <section className="card">
      <button className="map-toggle" onClick={() => setOpen(!open)}>
        <span className="section-title">Pattern map · all {groups.length} looks</span>
        <span className="chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="map-list">
          {groups.map((g) => (
            <div key={g.key} className="map-row">
              <div className="map-look"><span>{PATTERN_TEXT[g.front].short}</span><span className="muted">+</span><span>{PATTERN_TEXT[g.right].short}</span></div>
              {g.checks.length === 0 ? (
                <div className="map-answer">→ <b>{g.cases[0]}</b></div>
              ) : (
                <div className="map-answer">
                  Compare {g.checks.map((c) => `${STICKER_LABEL[c.i]}&${STICKER_LABEL[c.j]}`).join(', then ')}:
                  {[...g.outcome].map(([k, c]) => <div key={k}>· {OUT_TEXT(k)} → <b>{c}</b></div>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

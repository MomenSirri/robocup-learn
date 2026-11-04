import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CubeStage } from '../ui/CubeStage';
import { CubeView } from '../three/CubeView';
import { CASES, CaseDef, FAMILY_BY_ID, familiesOf } from '../content/cases';
import { CaseInstance, keyPieces, makeCase, randomAuf, stickerMask } from '../content/caseState';
import { logAnswer, logExec, optionsFor, pickNext, logMistake } from '../training/store';
import { Diagram } from '../ui/Diagram';
import { HintLadder, MovePad, Segmented, TopBar, MoveList } from '../ui/widgets';
import { useSolve } from '../ui/useSolve';
import { Stage, simplify } from '../cube/analysis';
import type { Nav } from '../App';

type Pool = 'f2l' | 'oll' | 'pll' | 'all';
type Ask = 'case' | 'idea';
type Phase = 'recognise' | 'feedback' | 'execute';

/**
 * Recognition trainer: a random case appears, you identify it (or its idea)
 * as fast as you can, then optionally execute it. Hard cases come back more.
 */
export function Trainer({ nav }: { nav: Nav }) {
  const [view, setView] = useState<CubeView | null>(null);
  const [pool, setPool] = useState<Pool>('f2l');
  const [ask, setAsk] = useState<Ask>('case');
  const [inst, setInst] = useState<CaseInstance | null>(null);
  const [phase, setPhase] = useState<Phase>('recognise');
  const [answer, setAnswer] = useState<string | null>(null);
  const [session, setSession] = useState({ n: 0, ok: 0, times: [] as number[] });
  const [recogMs, setRecogMs] = useState(0);
  const shownAt = useRef(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  const cases = useMemo(() => CASES.filter((c) => c.alg && (pool === 'all' ? c.stage !== 'cross' : c.stage === pool)), [pool]);

  const next = useCallback(() => {
    const def = pickNext(cases, inst?.def.id);
    const i = makeCase(def, randomAuf());
    setInst(i);
    setPhase('recognise');
    setAnswer(null);
    setHintsUsed(0);
    shownAt.current = performance.now();
  }, [cases, inst]);

  useEffect(() => {
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  useEffect(() => {
    if (!view || !inst) return;
    view.setMask(stickerMask(inst.def.stage));
    view.setFocus(null);
    view.setHighlight([]);
    view.setGhosts(null);
    view.showMoveArrow(null);
    view.inputEnabled = false;
    view.jump(inst.start);
  }, [view, inst]);

  const options: { id: string; label: string; def?: CaseDef }[] = useMemo(() => {
    if (!inst) return [];
    if (ask === 'case') return optionsFor(inst.def).map((c) => ({ id: c.id, label: c.name, def: c }));
    return familiesOf(inst.def.stage).map((f) => ({ id: f.id, label: `${f.glyph} ${f.title}` }));
  }, [inst, ask]);

  const choose = (id: string) => {
    if (!inst || phase !== 'recognise') return;
    const ms = performance.now() - shownAt.current;
    setRecogMs(ms);
    setAnswer(id);
    const correctId = ask === 'case' ? inst.def.id : inst.def.family;
    const ok = id === correctId;
    // for "idea" mode, a wrong family counts against the case, confused with a family representative
    logAnswer(inst.def.id, ok ? inst.def.id : ask === 'case' ? id : 'family:' + id, ms, hintsUsed);
    if (!ok && ask === 'idea') logMistake('wrong approach');
    setSession((s) => ({ n: s.n + 1, ok: s.ok + (ok ? 1 : 0), times: ok ? [...s.times, ms] : s.times }));
    setPhase('feedback');
    if (view) {
      const keys = keyPieces(inst.def.stage, inst.start);
      view.setFocus(keys);
      view.setHighlight(keys);
    }
  };

  const peek = () => {
    if (!view || !inst) return;
    setHintsUsed(hintsUsed + 1);
    const keys = keyPieces(inst.def.stage, inst.start);
    view.setFocus(keys);
    view.setHighlight(keys);
  };

  const correctId = inst ? (ask === 'case' ? inst.def.id : inst.def.family) : '';
  const avgMs = session.times.length ? session.times.reduce((a, b) => a + b, 0) / session.times.length : 0;

  return (
    <div className="screen trainer">
      <TopBar
        title={<><div className="tb-main">Recognition</div><div className="tb-sub">{session.n ? `${session.ok}/${session.n} · avg ${(avgMs / 1000).toFixed(1)}s` : 'Spot it fast'}</div></>}
        onBack={nav.canBack ? nav.back : undefined}
        right={pool === 'pll' ? <button className="chip" onClick={() => nav.push({ name: 'pll-id' })}>Which PLL?</button> : <button className="chip" onClick={() => nav.tab('stats')}>Stats</button>}
      />
      <div className="trainer-config">
        <Segmented<Pool> value={pool} onChange={setPool} options={[{ id: 'f2l', label: 'F2L' }, { id: 'oll', label: 'OLL' }, { id: 'pll', label: 'PLL' }, { id: 'all', label: 'Mix' }]} />
        <Segmented<Ask> value={ask} onChange={setAsk} options={[{ id: 'case', label: 'Name it' }, { id: 'idea', label: 'Idea' }]} />
      </div>
      <CubeStage onReady={setView}>
        {phase === 'recognise' && <LiveTimer since={shownAt.current} key={inst?.def.id + String(shownAt.current)} />}
        {phase === 'recognise' && <button className="peek" onClick={peek}>Highlight pieces</button>}
      </CubeStage>
      <div className="sheet">
        {inst && phase === 'recognise' && (
          <div className={'options ' + (ask === 'case' ? 'grid' : 'list')}>
            {options.map((o) => (
              <button key={o.id} className="option tall" onClick={() => choose(o.id)}>
                {o.def && <Diagram state={makeCase(o.def).start} stage={o.def.stage} size={44} />}
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        )}
        {inst && phase === 'feedback' && (
          <Feedback
            inst={inst}
            ok={answer === correctId}
            answerId={answer!}
            ask={ask}
            ms={recogMs}
            onNext={next}
            onExecute={() => setPhase('execute')}
          />
        )}
        {inst && phase === 'execute' && view && <Execute view={view} inst={inst} onDone={next} />}
      </div>
    </div>
  );
}

function LiveTimer({ since }: { since: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(performance.now() - since), 100);
    return () => clearInterval(id);
  }, [since]);
  return <div className="live-timer">{(t / 1000).toFixed(1)}</div>;
}

function Feedback({ inst, ok, answerId, ask, ms, onNext, onExecute }: { inst: CaseInstance; ok: boolean; answerId: string; ask: Ask; ms: number; onNext: () => void; onExecute: () => void }) {
  const fam = FAMILY_BY_ID[inst.def.family];
  const picked = ask === 'case' ? CASES.find((c) => c.id === answerId) : undefined;
  return (
    <div className={'feedback ' + (ok ? 'ok' : 'bad')}>
      <div className="feedback-head">
        <span className="verdict">{ok ? '✓' : '✗'}</span>
        <div>
          <div className="feedback-title">{inst.def.name}</div>
          <div className="muted">{fam.glyph} {fam.title} · {(ms / 1000).toFixed(2)}s</div>
        </div>
      </div>
      {!ok && picked && (
        <div className="compare">
          <div><Diagram state={inst.start} stage={inst.def.stage} size={60} /><span>This case</span></div>
          <div><Diagram state={makeCase(picked).start} stage={picked.stage} size={60} /><span>{picked.name}</span></div>
        </div>
      )}
      {!ok && <div className="beat info">Look for: {inst.def.stage === 'f2l' ? fam.idea : inst.def.cue}</div>}
      <MoveList moves={inst.solution} label="Solution" />
      <MoveList moves={simplify(inst.setup)} label="Set up from solved" />
      <div className="row buttons">
        <button className="chip" onClick={onExecute}>Execute it</button>
        <button className="cta" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}

function Execute({ view, inst, onDone }: { view: CubeView; inst: CaseInstance; onDone: () => void }) {
  const stage: Stage = inst.def.stage;
  const startRef = useRef(performance.now());
  const s = useSolve(view, inst.start, inst.solution, stage, { onSolved: (_r, ms) => logExec(inst.def.id, ms) });
  useEffect(() => {
    view.setFocus(null);
    view.setHighlight([]);
  }, [view]);
  return (
    <div className="solve">
      <div className="timer">{(s.elapsed / 1000).toFixed(1)}s</div>
      {s.solved ? (
        <>
          <div className="beat good">Executed in {(s.elapsed / 1000).toFixed(1)}s · {s.report?.simplifiedMoves} moves</div>
          <button className="cta" onClick={onDone}>Next →</button>
        </>
      ) : (
        <>
          <HintLadder level={s.hint} onNext={s.nextHint} />
          <MovePad onMove={s.doMove} onUndo={s.undo} />
          <div className="row buttons">
            <button className="chip" onClick={() => { logExec(inst.def.id, performance.now() - startRef.current); onDone(); }}>Done on my real cube</button>
          </div>
        </>
      )}
    </div>
  );
}

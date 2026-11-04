import { useEffect, useMemo, useState } from 'react';
import { CubeStage } from '../ui/CubeStage';
import { CubeView } from '../three/CubeView';
import { CASE_BY_ID, FAMILY_BY_ID, CaseDef } from '../content/cases';
import { CaseInstance, keyPieces, makeCase, randomAuf, recognitionCue, stickerMask } from '../content/caseState';
import { usePlayer, SPEEDS } from '../ui/usePlayer';
import { useSolve } from '../ui/useSolve';
import { Beats, HintLadder, MovePad, ReportCard, Segmented, Timeline, TopBar, MoveList } from '../ui/widgets';
import { Diagram } from '../ui/Diagram';
import { Move, applyMove, moveToString, MoveBase } from '../cube/cube';
import { narrate, Beat } from '../cube/analysis';
import { logDiscovery, logExec, markLearned, record } from '../training/store';
import type { Nav } from '../App';

type Tab = 'recognise' | 'understand' | 'predict' | 'solve' | 'practise';

function clear(v: CubeView) {
  v.setFocus(null);
  v.setHighlight([]);
  v.setGhosts(null);
  v.setPaths([]);
  v.showMoveArrow(null);
  v.onUserMove = null;
  v.inputEnabled = false;
}

export function Lesson({ caseId, nav }: { caseId: string; nav: Nav }) {
  const def = CASE_BY_ID[caseId];
  const fam = FAMILY_BY_ID[def.family];
  const [view, setView] = useState<CubeView | null>(null);
  const [tab, setTab] = useState<Tab>('recognise');
  const [auf, setAuf] = useState(0);
  const inst = useMemo(() => makeCase(def, auf), [def, auf]);

  useEffect(() => {
    if (!view) return;
    view.setMask(stickerMask(def.stage));
    view.resetView();
  }, [view, def]);

  return (
    <div className="screen lesson">
      <TopBar title={<><div className="tb-main">{def.name}</div><div className="tb-sub">{fam.glyph} {fam.title}</div></>} onBack={nav.back} />
      <CubeStage onReady={setView}>
        <OverlayHelp tab={tab} />
      </CubeStage>
      <div className="sheet lesson-sheet">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { id: 'recognise', label: 'See' },
            { id: 'understand', label: 'Why' },
            { id: 'predict', label: 'Predict' },
            { id: 'solve', label: 'Solve' },
            { id: 'practise', label: 'Drill' },
          ]}
        />
        <div className="tab-body">
          {view && tab === 'recognise' && <Recognise key={inst.auf + caseId} view={view} inst={inst} onAngle={() => setAuf((auf + 1) % 4)} nav={nav} />}
          {view && tab === 'understand' && <Understand key={inst.auf + caseId} view={view} inst={inst} />}
          {view && tab === 'predict' && <Predict key={inst.auf + caseId} view={view} inst={inst} onDone={() => setTab('solve')} />}
          {view && tab === 'solve' && <Solve key={inst.auf + caseId} view={view} inst={inst} />}
          {view && tab === 'practise' && <Practise key={caseId} view={view} def={def} />}
        </div>
      </div>
    </div>
  );
}

function OverlayHelp({ tab }: { tab: Tab }) {
  const text: Record<Tab, string> = {
    recognise: 'Drag the background to look around',
    understand: 'Follow the glowing paths',
    predict: 'What comes next?',
    solve: 'Swipe a sticker to turn its layer',
    practise: 'Swipe or use the pad — go fast',
  };
  return <div className="overlay-help">{text[tab]}</div>;
}

// ---------------------------------------------------------------- Recognise

function Recognise({ view, inst, onAngle, nav }: { view: CubeView; inst: CaseInstance; onAngle: () => void; nav: Nav }) {
  const [ghost, setGhost] = useState(false);
  const keys = keyPieces(inst.def.stage, inst.start);
  useEffect(() => {
    clear(view);
    view.jump(inst.start);
    view.setFocus(keys);
    view.setHighlight(keys);
    return () => clear(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, inst]);
  useEffect(() => {
    view.setGhosts(ghost ? keys : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghost, view, inst]);
  const cues = recognitionCue(inst);
  return (
    <div className="recognise">
      <div className="row">
        <Diagram state={inst.start} stage={inst.def.stage} size={76} />
        <div className="cues">
          {cues.map((c) => <div key={c} className="cue">{c}</div>)}
        </div>
      </div>
      <div className="row buttons">
        <button className={'chip' + (ghost ? ' on' : '')} onClick={() => setGhost(!ghost)}>◌ Where they go</button>
        <button className="chip" onClick={onAngle}>⟳ Another angle</button>
      </div>
      {inst.auf > 0 && <div className="note">Same case, seen after a U{inst.auf === 2 ? '2' : inst.auf === 3 ? "'" : ''}. Same idea — just turn U first.</div>}
      {inst.def.related && (
        <div className="related">
          <div className="section-title">Connected ideas</div>
          {inst.def.related.map((r) => (
            <button key={r.id} className="related-item" onClick={() => nav.replace({ name: 'lesson', caseId: r.id })}>
              <Diagram state={makeCase(CASE_BY_ID[r.id]).start} stage={CASE_BY_ID[r.id].stage} size={40} />
              <div><b>{CASE_BY_ID[r.id].name}</b><span>{r.how}</span></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Understand

function Understand({ view, inst }: { view: CubeView; inst: CaseInstance }) {
  const keys = useMemo(() => keyPieces(inst.def.stage, inst.start), [inst]);
  const pathKeys = inst.def.stage === 'f2l' ? keys : keys.slice(0, 3);
  const p = usePlayer(view, inst.start, inst.solution, inst.def.stage, pathKeys, inst.def.stage !== 'oll');
  useEffect(() => {
    clear(view);
    view.setHighlight(keys);
    return () => clear(view);
  }, [view, keys]);
  useEffect(() => {
    if (p.index < p.total) view.showMoveArrow(p.playing ? null : inst.solution[p.index]);
    else view.showMoveArrow(null);
  }, [p.index, p.playing, view, inst, p.total]);
  const fam = FAMILY_BY_ID[inst.def.family];
  return (
    <div className="understand">
      <Timeline moves={inst.solution} index={p.index} chunks={p.chunks} onSeek={p.seek} />
      <div className="player">
        <button className="icon-btn" onClick={() => p.seek(0)} aria-label="Restart">⏮</button>
        <button className="icon-btn" onClick={() => p.stepTo(-1)} aria-label="Back">◀</button>
        <button className="icon-btn big" onClick={p.play} aria-label="Play">{p.playing ? '❚❚' : '▶'}</button>
        <button className="icon-btn" onClick={() => p.stepTo(1)} aria-label="Forward">▶︎|</button>
        <button className="chip speed" onClick={() => p.setSpeed(SPEEDS[(SPEEDS.indexOf(p.speed as 1) + 1) % SPEEDS.length])}>{p.speed}×</button>
      </div>
      <Beats beats={p.currentBeats} fallback={p.index === 0 ? inst.def.why : undefined} />
      {p.currentChunk?.trigger && (
        <div className="trigger-card" style={{ ['--chunk' as string]: p.currentChunk.trigger.color }}>
          <b>{p.currentChunk.trigger.name}</b> {p.currentChunk.trigger.idea}
        </div>
      )}
      {p.index === p.total && (
        <div className="concept">
          <div className="section-title">The idea</div>
          <div>{fam.idea}</div>
          <div className="muted">{inst.def.why}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Predict

function distractors(correct: Move, pool: MoveBase[]): Move[] {
  const opts: Move[] = [correct];
  const cands: Move[] = [];
  for (const b of pool) for (const a of [1, -1, 2] as const) cands.push({ base: b, amount: a });
  const sameBase = cands.filter((m) => m.base === correct.base && m.amount !== correct.amount);
  const other = cands.filter((m) => m.base !== correct.base);
  const pick = (arr: Move[]) => arr[Math.floor(Math.random() * arr.length)];
  if (sameBase.length) opts.push(pick(sameBase));
  if (other.length) opts.push(pick(other));
  return opts.sort(() => Math.random() - 0.5);
}

function Predict({ view, inst, onDone }: { view: CubeView; inst: CaseInstance; onDone: () => void }) {
  const moves = inst.solution;
  const [i, setI] = useState(0);
  const [state, setState] = useState(inst.start);
  const [wrong, setWrong] = useState(0);
  const [misses, setMisses] = useState(0);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [busy, setBusy] = useState(false);
  const keys = useMemo(() => keyPieces(inst.def.stage, inst.start), [inst]);
  const pool = useMemo(() => Array.from(new Set(moves.map((m) => m.base))).concat(['U', 'R', 'F'] as MoveBase[]).filter((v, k, a) => a.indexOf(v) === k), [moves]);
  const options = useMemo(() => (i < moves.length ? distractors(moves[i], pool) : []), [i, moves, pool]);

  useEffect(() => {
    clear(view);
    view.jump(inst.start);
    view.setHighlight(keys);
    return () => clear(view);
  }, [view, inst, keys]);

  const choose = async (m: Move) => {
    if (busy) return;
    const ok = moveToString(m) === moveToString(moves[i]);
    if (!ok) {
      setWrong(wrong + 1);
      setMisses(misses + 1);
      if (wrong + 1 >= 2) view.showMoveArrow(moves[i]);
      return;
    }
    setBusy(true);
    view.showMoveArrow(null);
    await view.animate(m, 320);
    const next = applyMove(state, m);
    setBeats(narrate(state, next, inst.def.stage, m));
    setState(next);
    setI(i + 1);
    setWrong(0);
    setBusy(false);
  };

  if (i >= moves.length) {
    const score = Math.max(0, moves.length - misses);
    return (
      <div className="predict done">
        <div className="big-score">{score}/{moves.length}</div>
        <div>moves predicted first try</div>
        <Beats beats={beats} />
        <button className="cta" onClick={onDone}>Now solve it yourself →</button>
      </div>
    );
  }
  return (
    <div className="predict">
      <div className="predict-q">Move {i + 1} of {moves.length}: which turn comes next?</div>
      <MoveList moves={moves.slice(0, i)} label="So far" />
      <div className="options">
        {options.map((m) => (
          <button key={moveToString(m)} className="option" onClick={() => choose(m)}>{moveToString(m)}</button>
        ))}
      </div>
      {wrong > 0 && <div className="beat warn">Not quite — think about where the {inst.def.stage === 'f2l' ? 'corner and edge' : 'highlighted pieces'} need to go{wrong >= 2 ? ' (see the arrow)' : ''}.</div>}
      <Beats beats={beats} />
    </div>
  );
}

// ---------------------------------------------------------------- Solve

function Solve({ view, inst }: { view: CubeView; inst: CaseInstance }) {
  useEffect(() => {
    clear(view);
    return () => clear(view);
  }, [view]);
  const s = useSolve(view, inst.start, inst.solution, inst.def.stage, {
    onSolved: (r, _ms, hints) => {
      record(inst.def.id).hints += hints;
      if (hints < 4) markLearned(inst.def.id);
      logDiscovery(inst.def.id, r.simplifiedMoves, r.referenceMoves);
    },
  });
  return (
    <div className="solve">
      {s.solved && s.report ? (
        <>
          <ReportCard report={s.report} reference={inst.solution} />
          <MoveList moves={s.moves} label="You" />
          <button className="cta" onClick={s.reset}>Try again</button>
        </>
      ) : (
        <>
          <div className="solve-status">
            <MoveList moves={s.moves} label={`${s.moves.length} moves`} />
            <button className="chip" onClick={s.reset}>Reset</button>
          </div>
          <HintLadder level={s.hint} onNext={s.nextHint} />
          {s.hint >= 4 && <MoveList moves={s.remaining()} label="Solution" />}
          <MovePad onMove={s.doMove} onUndo={s.undo} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Practise

function Practise({ view, def }: { view: CubeView; def: CaseDef }) {
  const [round, setRound] = useState(0);
  const inst = useMemo(() => makeCase(def, randomAuf()), [def, round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    clear(view);
    return () => clear(view);
  }, [view]);
  const s = useSolve(view, inst.start, inst.solution, def.stage, { onSolved: (_r, ms) => logExec(def.id, ms) });
  return (
    <div className="solve">
      <div className="timer">{(s.elapsed / 1000).toFixed(1)}s</div>
      {s.solved && s.report ? (
        <>
          <ReportCard report={s.report} reference={inst.solution} elapsed={s.elapsed} />
          <button className="cta" onClick={() => setRound(round + 1)}>Next angle →</button>
        </>
      ) : (
        <>
          <HintLadder level={s.hint} onNext={s.nextHint} />
          <MovePad onMove={s.doMove} onUndo={s.undo} />
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { CubeStage } from '../ui/CubeStage';
import { CubeView } from '../three/CubeView';
import { CASES, CASE_BY_ID } from '../content/cases';
import { makeCase, stickerMask } from '../content/caseState';
import { useSolve } from '../ui/useSolve';
import { HintLadder, MovePad, MoveList, ReportCard, Segmented, TopBar } from '../ui/widgets';
import { logDiscovery } from '../training/store';
import { crossDistance } from '../cube/crossSolver';
import { Stage } from '../cube/analysis';
import type { Nav } from '../App';

type Kind = 'cross' | 'f2l' | 'oll' | 'pll';

/**
 * Sandbox: get a case, find your own solution, then compare it with what an
 * experienced solver would do.
 */
export function Discover({ nav, caseId }: { nav: Nav; caseId?: string }) {
  const initialKind: Kind = caseId ? (CASE_BY_ID[caseId].stage as Kind) : 'f2l';
  const [kind, setKind] = useState<Kind>(initialKind);
  const [round, setRound] = useState(0);
  const [view, setView] = useState<CubeView | null>(null);
  const [showRef, setShowRef] = useState(false);

  const inst = useMemo(() => {
    const pool = CASES.filter((c) => c.stage === kind);
    const def = round === 0 && caseId && CASE_BY_ID[caseId].stage === kind ? CASE_BY_ID[caseId] : pool[Math.floor(Math.random() * pool.length)];
    return makeCase(def, Math.floor(Math.random() * 4));
  }, [kind, round, caseId]);

  useEffect(() => {
    view?.setMask(stickerMask(kind as Stage));
    setShowRef(false);
  }, [view, kind, inst]);

  const s = useSolve(view, inst.start, inst.solution, kind, {
    onSolved: (r) => logDiscovery(inst.def.id, r.simplifiedMoves, r.referenceMoves),
  });

  const optimal = kind === 'cross' ? crossDistance(inst.start) : inst.solution.length;

  return (
    <div className="screen discover">
      <TopBar
        title={<><div className="tb-main">Discover</div><div className="tb-sub">{kind === 'cross' ? `Cross · optimal is ${optimal} moves` : 'Find your own way'}</div></>}
        onBack={nav.canBack ? nav.back : undefined}
      />
      <div className="trainer-config">
        <Segmented<Kind> value={kind} onChange={(k) => { setKind(k); setRound(round + 1); }} options={[{ id: 'cross', label: 'Cross' }, { id: 'f2l', label: 'F2L' }, { id: 'oll', label: 'OLL' }, { id: 'pll', label: 'PLL' }]} />
      </div>
      <CubeStage onReady={setView}>
        <div className="overlay-help">{s.moves.length ? `${s.moves.length} moves` : 'Experiment freely — swipe to turn'}</div>
      </CubeStage>
      <div className="sheet">
        {s.solved && s.report ? (
          <>
            <ReportCard report={s.report} reference={inst.solution} elapsed={s.elapsed} />
            <MoveList moves={s.moves} label="You" />
            <div className="row buttons">
              <button className="chip" onClick={s.reset}>Retry</button>
              <button className="cta" onClick={() => setRound(round + 1)}>New case →</button>
            </div>
          </>
        ) : (
          <>
            <div className="solve-status">
              <MoveList moves={s.moves} label="Your moves" />
              <button className="chip" onClick={s.reset}>Reset</button>
            </div>
            <HintLadder level={s.hint} onNext={s.nextHint} />
            {(showRef || s.hint >= 4) && <MoveList moves={s.remaining()} label="Expert" />}
            <MovePad onMove={s.doMove} onUndo={s.undo} />
            <div className="row buttons">
              <button className="chip" onClick={() => setRound(round + 1)}>Skip case</button>
              {!showRef && <button className="chip" onClick={() => setShowRef(true)}>Reveal expert line</button>}
              {kind !== 'cross' && <button className="chip" onClick={() => nav.push({ name: 'lesson', caseId: inst.def.id })}>Learn this case</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

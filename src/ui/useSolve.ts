import { useCallback, useEffect, useRef, useState } from 'react';
import { CubeState, Move, applyMove, invertAlg, invertMove } from '../cube/cube';
import { analyzeSolution, simplify, SolutionReport, Stage } from '../cube/analysis';
import { solveCross } from '../cube/crossSolver';
import { CubeView } from '../three/CubeView';
import { goalReached, HintLevel } from '../training/goals';
import { keyPieces } from '../content/caseState';

/**
 * A hands-on solving session: the learner turns the cube (swipes or pad),
 * we track moves, time, hints and detect the goal.
 */
export function useSolve(view: CubeView | null, start: CubeState | null, reference: Move[], stage: Stage, opts: { onSolved?: (r: SolutionReport, ms: number, hints: number) => void } = {}) {
  const [moves, setMoves] = useState<Move[]>([]);
  const [state, setState] = useState<CubeState | null>(start);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState<HintLevel>(0);
  const [report, setReport] = useState<SolutionReport | null>(null);
  const [t0, setT0] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const stateRef = useRef<CubeState | null>(start);
  const movesRef = useRef<Move[]>([]);
  const solvedRef = useRef(false);
  const hintRef = useRef<HintLevel>(0);
  const onSolvedRef = useRef(opts.onSolved);
  onSolvedRef.current = opts.onSolved;

  const reset = useCallback(() => {
    if (!view || !start) return;
    view.jump(start);
    view.setFocus(null);
    view.setHighlight([]);
    view.setGhosts(null);
    view.showMoveArrow(null);
    stateRef.current = start;
    movesRef.current = [];
    solvedRef.current = false;
    hintRef.current = 0;
    setState(start);
    setMoves([]);
    setSolved(false);
    setHint(0);
    setReport(null);
    setT0(null);
    setElapsed(0);
  }, [view, start]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (t0 === null || solved) return;
    const id = setInterval(() => setElapsed(performance.now() - t0), 100);
    return () => clearInterval(id);
  }, [t0, solved]);

  const remaining = useCallback((): Move[] => {
    const cur = stateRef.current;
    if (!cur) return [];
    if (stage === 'cross') return solveCross(cur);
    return simplify([...invertAlg(movesRef.current), ...reference]);
  }, [reference, stage]);

  const applyHint = useCallback(
    (lvl: HintLevel) => {
      if (!view || !stateRef.current) return;
      const keys = keyPieces(stage, start ?? stateRef.current);
      view.setFocus(lvl >= 1 ? keys : null);
      view.setHighlight(lvl >= 1 ? keys : []);
      view.setGhosts(lvl >= 2 ? keys : null);
      const rem = remaining();
      view.showMoveArrow(lvl >= 3 && rem.length ? rem[0] : null);
    },
    [view, stage, start, remaining],
  );

  const doMove = useCallback(
    async (m: Move) => {
      if (!view || !stateRef.current || solvedRef.current) return;
      if (t0 === null) setT0(performance.now());
      const next = applyMove(stateRef.current, m);
      stateRef.current = next;
      movesRef.current = [...movesRef.current, m];
      setMoves(movesRef.current);
      setState(next);
      view.showMoveArrow(null);
      await view.animate(m, 170);
      if (goalReached(stage, next)) {
        solvedRef.current = true;
        setSolved(true);
        const ms = t0 === null ? 0 : performance.now() - t0;
        setElapsed(ms);
        const r = analyzeSolution(movesRef.current, stage === 'cross' && start ? solveCross(start) : reference, stage);
        setReport(r);
        view.setFocus(null);
        view.setHighlight([]);
        view.setGhosts(null);
        onSolvedRef.current?.(r, ms, hintRef.current);
      } else if (hintRef.current >= 3) applyHint(hintRef.current);
      else if (hintRef.current >= 2) view.setGhosts(keyPieces(stage, start ?? next));
    },
    [view, stage, reference, start, t0, applyHint],
  );

  const undo = useCallback(() => {
    const last = movesRef.current[movesRef.current.length - 1];
    if (!last || solvedRef.current) return;
    // record the undo as a real move: it is part of what the learner did
    void doMove(invertMove(last));
  }, [doMove]);

  const nextHint = useCallback(() => {
    const lvl = Math.min(4, hintRef.current + 1) as HintLevel;
    hintRef.current = lvl;
    setHint(lvl);
    applyHint(lvl);
  }, [applyHint]);

  // gestures → moves
  useEffect(() => {
    if (!view) return;
    view.inputEnabled = true;
    view.onUserMove = (m) => void doMove(m);
    return () => {
      view.onUserMove = null;
    };
  }, [view, doMove]);

  return { moves, state, solved, hint, nextHint, report, elapsed, doMove, undo, reset, remaining };
}

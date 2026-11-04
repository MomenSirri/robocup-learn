import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CubeState, Move, applyMove, invertMove, CUBIE_BY_ID } from '../cube/cube';
import { Beat, Stage, narrate, piecePath, chunkAlg } from '../cube/analysis';
import { CubeView } from '../three/CubeView';

export const SPEEDS = [0.5, 1, 2] as const;

/**
 * Step-through algorithm player bound to a CubeView. Precomputes every
 * intermediate state so stepping back and scrubbing are exact.
 */
export function usePlayer(view: CubeView | null, start: CubeState, moves: Move[], stage: Stage, keyIds: string[], showPaths = true) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const busy = useRef(false);
  const playRef = useRef(false);
  const indexRef = useRef(0);

  const states = useMemo(() => {
    const out = [start];
    for (const m of moves) out.push(applyMove(out[out.length - 1], m));
    return out;
  }, [start, moves]);

  const beats = useMemo(() => moves.map((m, i) => narrate(states[i], states[i + 1], stage, m)), [moves, states, stage]);
  const chunks = useMemo(() => chunkAlg(moves), [moves]);

  const paths = useMemo(() => {
    if (!showPaths) return [];
    const colors = [0xfbbf24, 0x22d3ee, 0xf472b6, 0xa3e635];
    return keyIds.slice(0, 4).map((id, k) => ({ segments: piecePath(start, moves, CUBIE_BY_ID[id].index, CUBIE_BY_ID[id].home), color: colors[k] }));
  }, [start, moves, keyIds, showPaths]);

  // reset when inputs change
  useEffect(() => {
    if (!view) return;
    playRef.current = false;
    setPlaying(false);
    indexRef.current = 0;
    setIndex(0);
    view.jump(start);
  }, [view, start, moves]);

  useEffect(() => {
    view?.setPaths(paths, index);
  }, [view, paths, index]);

  useEffect(() => () => view?.setPaths([]), [view]);

  const dur = useCallback(() => 380 / speed, [speed]);

  const stepTo = useCallback(
    async (dir: 1 | -1) => {
      if (!view || busy.current) return false;
      const i = indexRef.current;
      if (dir === 1 && i >= moves.length) return false;
      if (dir === -1 && i <= 0) return false;
      busy.current = true;
      const m = dir === 1 ? moves[i] : invertMove(moves[i - 1]);
      view.showMoveArrow(null);
      await view.animate(m, dur());
      indexRef.current = i + dir;
      setIndex(i + dir);
      busy.current = false;
      return true;
    },
    [view, moves, dur],
  );

  const seek = useCallback(
    (k: number) => {
      if (!view) return;
      playRef.current = false;
      setPlaying(false);
      busy.current = false;
      indexRef.current = k;
      setIndex(k);
      view.jump(states[k]);
    },
    [view, states],
  );

  const play = useCallback(async () => {
    if (playRef.current) {
      playRef.current = false;
      setPlaying(false);
      return;
    }
    if (indexRef.current >= moves.length) seek(0);
    playRef.current = true;
    setPlaying(true);
    while (playRef.current) {
      const ok = await stepTo(1);
      if (!ok) break;
      await new Promise((r) => setTimeout(r, 120 / speed));
    }
    playRef.current = false;
    setPlaying(false);
  }, [moves.length, seek, stepTo, speed]);

  const currentBeats: Beat[] = index > 0 ? beats[index - 1] : [];
  const currentChunk = chunks.find((c) => index - 1 >= c.start && index - 1 < c.end);

  return { index, playing, speed, setSpeed, stepTo, seek, play, states, beats, currentBeats, chunks, currentChunk, total: moves.length };
}

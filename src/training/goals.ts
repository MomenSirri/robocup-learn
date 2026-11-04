import { CubeState, CROSS_EDGES, FIRST_TWO_LAYERS, allSolved, applyMove, isSolved, Move } from '../cube/cube';
import { Stage, ollOrientedCount } from '../cube/analysis';

const U: Move = { base: 'U', amount: 1 };

/** Has the learner reached the goal of this stage? (AUF is forgiven for PLL.) */
export function goalReached(stage: Stage, s: CubeState): boolean {
  if (stage === 'cross') return allSolved(s, CROSS_EDGES);
  if (stage === 'f2l') return allSolved(s, FIRST_TWO_LAYERS);
  if (stage === 'oll') return allSolved(s, FIRST_TWO_LAYERS) && ollOrientedCount(s) === 8;
  let t = s;
  for (let k = 0; k < 4; k++) {
    if (isSolved(t)) return true;
    t = applyMove(t, U);
  }
  return false;
}

export type HintLevel = 0 | 1 | 2 | 3 | 4;

export const HINT_LABELS: Record<Exclude<HintLevel, 0>, string> = {
  1: 'Key pieces',
  2: 'Where they go',
  3: 'First move',
  4: 'Full solution',
};

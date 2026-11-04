import {
  CubeState, Move, solvedState, applyAlg, parseAlg, invertAlg, randomScramble,
  CROSS_EDGES, LAST_LAYER, FIRST_TWO_LAYERS, F2L_SLOTS, isCubieSolved, frame,
} from '../cube/cube';
import { simplify, Stage, f2lFeatures, describeF2L } from '../cube/analysis';
import { solveCross } from '../cube/crossSolver';
import { CaseDef } from './cases';

export interface CaseInstance {
  def: CaseDef;
  /** moves that produce the case from solved */
  setup: Move[];
  start: CubeState;
  /** reference solution from start */
  solution: Move[];
  /** pre-AUF applied (0..3) */
  auf: number;
}

const U_TURNS: Move[][] = [[], [{ base: 'U', amount: 1 }], [{ base: 'U', amount: 2 }], [{ base: 'U', amount: -1 }]];

export function makeCase(def: CaseDef, auf = 0): CaseInstance {
  if (def.stage === 'cross') {
    const setup = randomScramble(12);
    const start = applyAlg(solvedState(), setup);
    return { def, setup, start, solution: solveCross(start), auf: 0 };
  }
  const alg = parseAlg(def.alg);
  const setup = [...invertAlg(alg), ...U_TURNS[auf]];
  const start = applyAlg(solvedState(), setup);
  const solution = simplify([...invertAlg(U_TURNS[auf]), ...alg]);
  return { def, setup, start, solution, auf };
}

export function randomAuf(): number {
  return Math.floor(Math.random() * 4);
}

/** Pieces the learner should focus on. */
export function keyPieces(stage: Stage, s: CubeState): string[] {
  if (stage === 'cross') return CROSS_EDGES;
  if (stage === 'f2l') return [F2L_SLOTS.FR.corner, F2L_SLOTS.FR.edge];
  if (stage === 'oll') return LAST_LAYER;
  const fr = frame(s);
  const unsolved = LAST_LAYER.filter((id) => !isCubieSolved(s, id, fr));
  return unsolved.length ? unsolved : LAST_LAYER;
}

export type StickerMode = 'color' | 'grey';

/** Which stickers are shown in colour for a stage (reduces visual noise). */
export function stickerMask(stage: Stage | 'free'): (cubieId: string, colour: string) => StickerMode {
  if (stage === 'cross') return (id) => (CROSS_EDGES.includes(id) || id.length === 1 ? 'color' : 'grey');
  if (stage === 'f2l')
    return (id) => (FIRST_TWO_LAYERS.includes(id) || id.length === 1 ? 'color' : 'grey');
  if (stage === 'oll') return (id, col) => (LAST_LAYER.includes(id) ? (col === 'U' ? 'color' : 'grey') : 'color');
  return () => 'color';
}

export function recognitionCue(inst: CaseInstance): string[] {
  if (inst.def.stage === 'f2l') return describeF2L(f2lFeatures(inst.start));
  return [inst.def.cue];
}

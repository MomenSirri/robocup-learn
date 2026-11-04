/**
 * Curriculum content. Cases are grouped into *families* that share one idea,
 * so the learner studies a handful of concepts instead of a list of algs.
 * Every case state is generated as inverse(algorithm) applied to a solved
 * cube, so cases and solutions are consistent by construction (and tests
 * verify each algorithm only touches what its stage allows).
 */
import { Stage, chunkAlg, f2lFeatures } from '../cube/analysis';
import { parseAlg, applyAlg, solvedState, invertAlg, algToString } from '../cube/cube';
import { F2L_ALGS } from './f2l.generated';
import { OLL, PLL } from './llAlgs';
import { caseKeyOfAlg, mirrorFR, mirrorLR } from './classify';

export interface Family {
  id: string;
  stage: Stage;
  title: string;
  /** one-line idea */
  idea: string;
  /** the mental model, in 2–4 short steps */
  steps: string[];
  glyph: string;
}

export interface CaseDef {
  id: string;
  stage: Stage;
  family: string;
  name: string;
  alg: string;
  alts?: string[];
  /** what to look at to recognise it */
  cue: string;
  /** why the algorithm works */
  why: string;
  /** related cases & how */
  related?: { id: string; how: string }[];
}

export const STAGES: { id: Stage; title: string; subtitle: string; color: string }[] = [
  { id: 'cross', title: 'Cross', subtitle: 'Plan the first 4 edges', color: '#e5e7eb' },
  { id: 'f2l', title: 'F2L', subtitle: 'Pair & insert', color: '#22c55e' },
  { id: 'oll', title: 'OLL', subtitle: 'Make the top yellow', color: '#facc15' },
  { id: 'pll', title: 'PLL', subtitle: 'Move top pieces home', color: '#ef4444' },
];

export const FAMILIES: Family[] = [
  // ---------------- cross
  {
    id: 'cross-plan', stage: 'cross', glyph: '✚', title: 'Planning the cross',
    idea: 'Solve the 4 white edges relative to each other — not one at a time.',
    steps: ['Find the white edges', 'Bring them down while keeping the ones already placed', 'Align them with the centres', 'Aim for ≤ 8 moves'],
  },
  // ---------------- F2L
  {
    id: 'f2l-basic', stage: 'f2l', glyph: '⤵', title: 'Basic inserts',
    idea: 'Opening the slot is the move that brings corner and edge together.',
    steps: ['Spot the corner above the slot', 'Open the slot (R or F′)', 'Turn U so the pieces meet over it', 'Close the slot'],
  },
  {
    id: 'f2l-split', stage: 'f2l', glyph: '⇄', title: 'Split pair: join, then insert',
    idea: 'Hide one piece, bring the other to it, then insert the finished pair.',
    steps: ['Move the edge out of the way (setup U)', 'Use the slot to park the corner', 'Turn U to connect them', 'Insert as a basic case'],
  },
  {
    id: 'f2l-white-up', stage: 'f2l', glyph: '⬆', title: 'White on top',
    idea: 'A corner with white facing up cannot pair directly. Turn white to the side first.',
    steps: ['Put the corner over the slot', 'R U2 R′ (or a U2 trigger) turns white sideways', 'Now it is a split-pair case', 'Join and insert'],
  },
  {
    id: 'f2l-corner-in', stage: 'f2l', glyph: '◣', title: 'Corner stuck in slot',
    idea: 'Lift the corner out with a trigger that also lines it up with the edge.',
    steps: ['Edge waits on top in the right spot', 'Trigger lifts the corner — now they are paired', 'Re-insert the pair'],
  },
  {
    id: 'f2l-edge-in', stage: 'f2l', glyph: '◧', title: 'Edge stuck in slot',
    idea: 'Pull the edge out while parking the corner where they will connect.',
    steps: ['Place the corner so the slot move picks it up', 'Lift the edge out together with it', 'Insert the pair'],
  },
  {
    id: 'f2l-both-in', stage: 'f2l', glyph: '▣', title: 'Both pieces in the slot',
    idea: 'Take them out as one unit, fix them on top, put them back.',
    steps: ['One trigger extracts both pieces', 'U moves rebuild the pair correctly', 'Insert'],
  },
  // ---------------- OLL (shape families)
  { id: 'oll-sune', stage: 'oll', glyph: '↻', title: 'Cross done: the Sune family', idea: 'Edges already form a cross. All 7 cases twist corners, and all are built from Sune.', steps: ['Count corners facing up: 0, 1 or 2', 'Look where the side yellow stickers point', '1 up → Sune or Antisune; 0 → H or Pi; 2 → Headlights, Chameleon or Bowtie'] },
  { id: 'oll-corners-done', stage: 'oll', glyph: '◇', title: 'Corners done, edges not', idea: 'Only two edges need flipping. The M slice does that job.', steps: ['All four corners are yellow', 'Two edges face sideways', 'Sexy move + M′ flips them'] },
  { id: 'oll-tc', stage: 'oll', glyph: '⊤', title: 'T and C shapes', idea: 'Short trigger pairs: F-sexy-F′ or sexy + sledgehammer.', steps: ['Find the T or C of yellow', 'T: bar across the front/back', 'C: open side faces you or the right'] },
  { id: 'oll-p', stage: 'oll', glyph: 'P', title: 'P shapes', idea: 'A 2×2 block plus one edge: the wide-f and F-trigger family.', steps: ['Find the yellow block', 'The stem shows the direction', 'f-sexy-f′ and its mirrors'] },
  { id: 'oll-lightning', stage: 'oll', glyph: 'ϟ', title: 'Squares & lightning', idea: 'Wide (r) versions of Sune: corners twist like Sune while the M slice flips edges.', steps: ['A 2×2 square or a zig-zag bolt', 'Same rhythm as Sune, with r instead of R', 'Mirrors use l or r′'] },
  { id: 'oll-fish', stage: 'oll', glyph: '◢', title: 'Fish shapes', idea: 'One corner up plus a diagonal of edges: sledgehammer combos.', steps: ['Find the fish head (corner) and tail', 'Sexy + sledge or hedge + sexy'] },
  { id: 'oll-knight', stage: 'oll', glyph: '♞', title: 'Knight moves', idea: 'An L-jump of yellow like a chess knight. Wide moves and sexy triggers.', steps: ['Two separate yellow bits', 'Spot which side the "jump" goes', 'Wide-r inserts restore F2L'] },
  { id: 'oll-awkward', stage: 'oll', glyph: '⚠', title: 'Awkward shapes', idea: 'These mix two simpler OLLs: a Sune-like half and an F-trigger half.', steps: ['Line of two + corner', 'First half sets up a known OLL', 'Second half finishes it'] },
  { id: 'oll-w', stage: 'oll', glyph: 'W', title: 'W shapes', idea: 'A staircase of yellow. Sune-like opening, sledgehammer finish.', steps: ['Find the staircase', 'Run the trigger sequence'] },
  { id: 'oll-small-l', stage: 'oll', glyph: '⌐', title: 'Small L shapes', idea: 'An L of edges with corners scattered. Double triggers (sexy twice) or wide r swings.', steps: ['L of two edges', 'Count where corners face', 'Repeat the trigger twice'] },
  { id: 'oll-line', stage: 'oll', glyph: '━', title: 'Line shapes', idea: 'A straight line of yellow. Repeat a trigger inside f … f′.', steps: ['Hold the line horizontally', 'f + double sexy + f′, or a Sune-based variant'] },
  { id: 'oll-dot', stage: 'oll', glyph: '•', title: 'Dot shapes', idea: 'No edges are oriented. These are two OLLs stuck together: an edge flip, then a corner OLL.', steps: ['Only the centre is yellow', 'Look at corners to choose the case', 'Usually F-sexy-F′ + f-sexy-f′'] },
  // ---------------- PLL
  { id: 'pll-edges', stage: 'pll', glyph: '⟲', title: 'Edges only', idea: 'Corners are already solved; only edges cycle or swap.', steps: ['All four sides show headlights', 'One solid side → U perm (3-cycle)', 'No solid side → H or Z (swaps)'] },
  { id: 'pll-corners', stage: 'pll', glyph: '△', title: 'Corners only', idea: 'Edges are solved; corners cycle (A) or swap twice (E). These are commutators.', steps: ['Edges match their centres', 'One side with headlights → A perm', 'No headlights → E perm'] },
  { id: 'pll-adjacent', stage: 'pll', glyph: '⇆', title: 'Adjacent corner swap', idea: 'Two neighbouring corners trade places, plus an edge swap.', steps: ['Exactly one side has headlights', 'Look at the edges between them', 'T / F / J / R'] },
  { id: 'pll-diagonal', stage: 'pll', glyph: '⤡', title: 'Diagonal corner swap', idea: 'No headlights anywhere: two opposite corners swap.', steps: ['No side has matching corners', 'Find the solid 1×2 or 1×3 blocks', 'Y / V / N'] },
  { id: 'pll-g', stage: 'pll', glyph: 'G', title: 'G perms', idea: 'Corners and edges both 3-cycle. Find the solid 2×1 block and the headlights.', steps: ['One side has headlights', 'Find the 1×2 block', 'Its position tells Ga/Gb/Gc/Gd'] },
];

const BASE_CASES: CaseDef[] = [
  // ---------------- cross
  { id: 'cross-1', stage: 'cross', family: 'cross-plan', name: 'Random cross', alg: '', cue: 'White edges — where are they relative to each other?', why: 'Placing edges that are already next to each other first saves moves.' },

  // ---------------- F2L basic
  { id: 'f2l-ready-r', stage: 'f2l', family: 'f2l-basic', name: 'Ready pair (R side)', alg: "U R U' R'", cue: 'Corner and edge already joined on top.', why: 'U sets the pair over the open slot position; R U′ R′ drops it in.', related: [{ id: 'f2l-ready-f', how: 'Mirror through the front face' }] },
  { id: 'f2l-ready-f', stage: 'f2l', family: 'f2l-basic', name: 'Ready pair (F side)', alg: "U' F' U F", cue: 'Joined pair, facing the front.', why: 'Same idea as the R version, but using F′ … F.', related: [{ id: 'f2l-ready-r', how: 'Mirror' }] },
  { id: 'f2l-basic-r', stage: 'f2l', family: 'f2l-basic', name: 'R U R′', alg: "R U R'", cue: 'Corner above the slot, edge waiting at the back.', why: 'R lifts the slot to the top; U brings the corner onto the edge; R′ inserts both.', related: [{ id: 'f2l-basic-f', how: 'Mirror: F′ U′ F' }] },
  { id: 'f2l-basic-f', stage: 'f2l', family: 'f2l-basic', name: 'F′ U′ F', alg: "F' U' F", cue: 'Corner above the slot, edge waiting on the left.', why: 'The front-face twin of R U R′.', related: [{ id: 'f2l-basic-r', how: 'Mirror' }] },

  // ---------------- F2L split
  { id: 'f2l-split-1', stage: 'f2l', family: 'f2l-split', name: 'Split · edge far', alg: "U' R U R' U2 R U' R'", cue: 'White on the side, edge across the top.', why: 'U′ R U R′ joins them while the slot is safe; U2 aims the pair; R U′ R′ inserts.', related: [{ id: 'f2l-split-2', how: 'Mirror (F side)' }, { id: 'f2l-ready-r', how: 'Last 4 moves are the ready-pair insert' }] },
  { id: 'f2l-split-2', stage: 'f2l', family: 'f2l-split', name: 'Split · edge far (F)', alg: "U F' U' F U2 F' U F", cue: 'Mirror of the R version.', why: 'Same three-phase plan through the front.', related: [{ id: 'f2l-split-1', how: 'Mirror' }] },
  { id: 'f2l-split-3', stage: 'f2l', family: 'f2l-split', name: 'Split · edge beside', alg: "U' R U2 R' U2 R U' R'", cue: 'Edge sits right next to the corner, wrongly.', why: 'R U2 R′ moves the corner away and back so the edge can slot in beside it.', related: [{ id: 'f2l-split-4', how: 'Mirror' }] },
  { id: 'f2l-split-4', stage: 'f2l', family: 'f2l-split', name: 'Split · edge beside (F)', alg: "U F' U2 F U2 F' U F", cue: 'Mirror of the R version.', why: 'Same idea through the front.', related: [{ id: 'f2l-split-3', how: 'Mirror' }] },
  { id: 'f2l-split-5', stage: 'f2l', family: 'f2l-split', name: 'Split · front insert', alg: "U' R U' R' U F' U' F", cue: 'Pieces apart; the pair forms facing front.', why: 'First trigger joins them, second inserts from the front side.' },
  { id: 'f2l-split-6', stage: 'f2l', family: 'f2l-split', name: 'Split · double trigger', alg: "U' R U R' U R U R'", cue: 'Corner over the slot, edge one step away.', why: 'Hide the corner with R U R′, line up with U, finish with R U R′.' },
  { id: 'f2l-split-7', stage: 'f2l', family: 'f2l-split', name: 'Mis-paired on top', alg: "R U' R' U R U' R' U2 R U' R'", cue: 'Corner and edge touch, but the colours don\'t match.', why: 'A wrongly connected pair must be split first, then rebuilt and inserted.' },

  // ---------------- F2L white up
  { id: 'f2l-up-1', stage: 'f2l', family: 'f2l-white-up', name: 'White up · edge touching', alg: "R U2 R' U' R U R'", cue: 'White faces up, the edge touches the corner.', why: 'R U2 R′ turns the corner so white faces sideways and separates it; U′ R U R′ joins & inserts.', related: [{ id: 'f2l-up-2', how: 'Mirror' }] },
  { id: 'f2l-up-2', stage: 'f2l', family: 'f2l-white-up', name: 'White up · edge touching (F)', alg: "F' U2 F U F' U' F", cue: 'Mirror of the R version.', why: 'Same through the front.', related: [{ id: 'f2l-up-1', how: 'Mirror' }] },
  { id: 'f2l-up-3', stage: 'f2l', family: 'f2l-white-up', name: 'White up · edge away', alg: "U R U2 R' U R U' R'", cue: 'White up, edge on the far side.', why: 'U positions the corner, R U2 R′ flips white sideways while pairing, then insert.', related: [{ id: 'f2l-up-4', how: 'Mirror' }] },
  { id: 'f2l-up-4', stage: 'f2l', family: 'f2l-white-up', name: 'White up · edge away (F)', alg: "U' F' U2 F U' F' U F", cue: 'Mirror of the R version.', why: 'Same through the front.', related: [{ id: 'f2l-up-3', how: 'Mirror' }] },
  { id: 'f2l-up-5', stage: 'f2l', family: 'f2l-white-up', name: 'White up · edge opposite', alg: "U2 R U R' U R U' R'", cue: 'White up, edge diagonally opposite.', why: 'U2 sets up, R U R′ turns white aside and joins; U R U′ R′ inserts.', related: [{ id: 'f2l-up-6', how: 'Mirror' }] },
  { id: 'f2l-up-6', stage: 'f2l', family: 'f2l-white-up', name: 'White up · edge opposite (F)', alg: "U2 F' U' F U' F' U F", cue: 'Mirror of the R version.', why: 'Same through the front.', related: [{ id: 'f2l-up-5', how: 'Mirror' }] },

  // ---------------- F2L corner in slot
  { id: 'f2l-cin-1', stage: 'f2l', family: 'f2l-corner-in', name: 'Corner in · twisted A', alg: "R U' R' U R U' R'", cue: 'Corner twisted in the slot, edge on top.', why: 'R U′ R′ lifts the corner and pairs it; U R U′ R′ inserts.', related: [{ id: 'f2l-cin-3', how: 'Other twist direction' }] },
  { id: 'f2l-cin-2', stage: 'f2l', family: 'f2l-corner-in', name: 'Corner in · twisted (F)', alg: "F' U F U' F' U F", cue: 'Twisted corner, edge facing front.', why: 'Front-face twin: lift with F′ U F, then insert.' },
  { id: 'f2l-cin-3', stage: 'f2l', family: 'f2l-corner-in', name: 'Corner in · twisted B', alg: "R U R' U' R U R'", cue: 'Corner twisted the other way.', why: 'Sexy move lifts and pairs, R U R′ inserts.', related: [{ id: 'f2l-cin-1', how: 'Other twist direction' }] },
  { id: 'f2l-cin-4', stage: 'f2l', family: 'f2l-corner-in', name: 'Corner solved, edge on top', alg: "U R U' R' U' F' U F", cue: 'Corner already solved; only the edge is missing.', why: 'Reverse-sexy takes the corner out with the edge; sledge-like F′ U F puts both back.' },

  // ---------------- F2L edge in slot
  { id: 'f2l-ein-1', stage: 'f2l', family: 'f2l-edge-in', name: 'Edge in · corner side', alg: "U' R U' R' U2 R U' R'", cue: 'Edge solved in slot, corner on top, white sideways.', why: 'R U′ R′ pulls the edge out under the corner, U2 aims, R U′ R′ inserts.', related: [{ id: 'f2l-ein-2', how: 'Other corner twist' }] },
  { id: 'f2l-ein-2', stage: 'f2l', family: 'f2l-edge-in', name: 'Edge in · corner other side', alg: "U R U R' U2 R U R'", cue: 'Edge solved in slot, corner twisted the other way.', why: 'Same extraction with R U R′.', related: [{ id: 'f2l-ein-1', how: 'Other corner twist' }] },
  { id: 'f2l-ein-3', stage: 'f2l', family: 'f2l-edge-in', name: 'Edge flipped in slot', alg: "U' R U R' U F' U' F", cue: 'Edge in slot but flipped, corner on top.', why: 'Extract with R, re-insert from the front to flip the edge.' },
  { id: 'f2l-ein-4', stage: 'f2l', family: 'f2l-edge-in', name: 'Edge in · white up', alg: "R U R' U' R U R' U' R U R'", cue: 'Edge solved, corner on top with white up.', why: 'Each sexy move twists the corner one step; the third insert finishes.' },

  // ---------------- F2L both in slot
  { id: 'f2l-both-1', stage: 'f2l', family: 'f2l-both-in', name: 'Both in · corner twisted A', alg: "R U' R' U' R U R' U2 R U' R'", alts: ["R U R' U' R U2 R' U' R U R'"], cue: 'Edge right, corner twisted.', why: 'Lift the pair, U moves twist it right, insert.' },
  { id: 'f2l-both-2', stage: 'f2l', family: 'f2l-both-in', name: 'Both in · corner twisted B', alg: "R U' R' U R U2 R' U R U' R'", cue: 'Edge right, corner twisted the other way.', why: 'Same plan, mirrored timing.' },
  { id: 'f2l-both-3', stage: 'f2l', family: 'f2l-both-in', name: 'Both in · edge flipped', alg: "R U2 R' U R U2 R' U F' U' F", cue: 'Corner solved, edge flipped.', why: 'Two R U2 R′ pull both out and re-pair; finish from the front.' },

];

// ---------------------------------------------------------------- full sets

/** Hand-written explanations for well-known last-layer cases. */
const LL_TEXT: Record<string, Partial<CaseDef>> = {
  'oll-27': { cue: 'One corner up (a fish); the other three point the same way.', why: 'R U R′ U carries a corner around; R U2 R′ returns it — three corners twist together.' },
  'oll-26': { cue: 'Fish pointing the other way.', why: 'Sune played backwards — corners twist the opposite direction.' },
  'oll-21': { cue: 'No corners up; headlights on two opposite sides.', why: 'A Sune with an extra R U′ R′ U inside — twists all four corners.' },
  'oll-22': { cue: 'No corners up; headlights on one side only.', why: 'R2 moves swing two corners at once — a compact double Sune.' },
  'oll-23': { cue: 'Two neighbouring corners up, headlights opposite them.', why: 'D moves hide a corner below while U2 swings the others.' },
  'oll-24': { cue: 'Two neighbouring corners up, side stickers facing out.', why: 'Wide sexy move, then a sledgehammer: two triggers.' },
  'oll-25': { cue: 'Two diagonal corners up.', why: 'The chameleon core wrapped in F′ … F.' },
  'oll-45': { cue: 'A T of yellow; a line of edges.', why: 'F tilts the edges into the R layer, the sexy move flips them, F′ brings them back.' },
  'oll-44': { cue: 'P shape facing left.', why: 'The wide f also moves the middle layer, so a different pair of edges flips.' },
  'oll-33': { cue: 'T shape with the bar on the side (a shoe).', why: 'Sexy breaks a pair, sledgehammer re-forms it oriented.' },
  'oll-37': { cue: 'Fish with an L of edges.', why: 'Hedgeslammer, then a sexy-like trigger: the same two tools in another order.' },
  'oll-57': { cue: 'All corners up; two opposite edges not.', why: 'Sexy then M′ flips two edges through the middle layer; the rest restores.' },
  'pll-ua': { cue: 'One solid side; three edges cycle.', why: 'R U R U moves drag three edges around while corners return home.' },
  'pll-ub': { cue: 'One solid side; edges cycle the other way.', why: 'Ua backwards.' },
  'pll-h': { cue: 'Every side shows the opposite edge colour.', why: 'M2 swaps two edges through the bottom; twice with U turns swaps both pairs.' },
  'pll-z': { cue: 'Edges swap with their neighbours.', why: 'M slice swaps edge pairs, U turns pick which ones.' },
  'pll-t': { cue: 'Headlights on one side, a 2-colour bar opposite.', why: 'Sexy move + sledgehammer pattern swaps two corners and two edges.' },
  'pll-jb': { cue: 'A 1×3 solid block on one side.', why: 'Swaps the same two corners as T but a different edge pair.' },
  'pll-ja': { cue: 'Solid block on the other side.', why: 'Left-handed Jb using L moves.' },
  'pll-aa': { cue: 'Headlights on one side, edges all solved.', why: 'A commutator: move a corner, swap through D2, undo — three corners rotate.' },
  'pll-ab': { cue: 'Same as Aa, opposite cycle.', why: 'Aa backwards.' },
  'pll-e': { cue: 'No headlights anywhere; edges solved.', why: 'Two corner swaps, each a commutator with D.' },
  'pll-y': { cue: 'No headlights; two diagonal corners swap.', why: 'First half is an OLL-like trigger set, second half sexy + sledgehammer.' },
};

function triggerWhy(alg: string): string {
  const named = chunkAlg(parseAlg(alg)).filter((c) => c.trigger).map((c) => c.trigger!.name);
  return named.length ? `Built from: ${Array.from(new Set(named)).join(' → ')}.` : 'Watch which pieces each move carries.';
}

function llCases(list: typeof OLL, stage: 'oll' | 'pll'): CaseDef[] {
  return list.map((d) => {
    const id = stage === 'oll' ? `oll-${d.n}` : `pll-${d.n.toLowerCase()}`;
    const name = stage === 'oll' ? `OLL ${d.n}${d.name ? ' · ' + d.name : ''}` : `${d.n} perm`;
    const t = LL_TEXT[id] ?? {};
    return { id, stage, family: d.family, name, alg: d.alg, cue: t.cue ?? '', why: t.why ?? triggerWhy(d.alg) };
  });
}

/** F2L family from the case's geometry (where the two pieces are). */
function f2lFamily(alg: string): string {
  const f = f2lFeatures(applyAlg(solvedState(), invertAlg(parseAlg(alg))));
  if (f.cornerLoc === 'slot' && f.edgeLoc === 'slot') return 'f2l-both-in';
  if (f.cornerLoc === 'slot') return 'f2l-corner-in';
  if (f.edgeLoc === 'slot') return 'f2l-edge-in';
  if (f.whiteFacing === 'up') return 'f2l-white-up';
  return parseAlg(alg).length <= 4 ? 'f2l-basic' : 'f2l-split';
}

function buildCases(): CaseDef[] {
  const out = BASE_CASES.slice();
  const keyOf = (c: CaseDef) => caseKeyOfAlg(c.stage, parseAlg(c.alg));
  // complete F2L with generated cases for every placement not covered yet
  const have = new Set(out.filter((c) => c.stage === 'f2l').map(keyOf));
  let n = 0;
  for (const alg of F2L_ALGS) {
    const k = caseKeyOfAlg('f2l', parseAlg(alg));
    if (have.has(k)) continue;
    have.add(k);
    const family = f2lFamily(alg);
    n++;
    out.push({ id: `f2l-x${n}`, stage: 'f2l', family, name: `${FAMILY_BY_TITLE[family]} · ${n}`, alg, cue: '', why: triggerWhy(alg) });
  }
  out.push(...llCases(OLL, 'oll'), ...llCases(PLL, 'pll'));

  // automatic relations: inverse and mirror cases
  const byKey = new Map<string, CaseDef>();
  for (const c of out) if (c.alg) byKey.set(c.stage + keyOf(c), c);
  for (const c of out) {
    if (!c.alg) continue;
    const rel = (c.related ??= []);
    const add = (other: CaseDef | undefined, how: string) => {
      if (other && other.id !== c.id && !rel.some((r) => r.id === other.id)) rel.push({ id: other.id, how });
    };
    const moves = parseAlg(c.alg);
    add(byKey.get(c.stage + caseKeyOfAlg(c.stage, invertAlg(moves))), `Inverse: ${algToString(invertAlg(moves))}`);
    const mirror = c.stage === 'f2l' ? mirrorFR(moves) : mirrorLR(moves);
    add(byKey.get(c.stage + caseKeyOfAlg(c.stage, mirror)), `Mirror: ${algToString(mirror)}`);
  }
  return out;
}

const FAMILY_BY_TITLE: Record<string, string> = {
  'f2l-basic': 'Basic', 'f2l-split': 'Split pair', 'f2l-white-up': 'White up',
  'f2l-corner-in': 'Corner in', 'f2l-edge-in': 'Edge in', 'f2l-both-in': 'Both in',
};

export const CASES: CaseDef[] = buildCases();

export const CASE_BY_ID: Record<string, CaseDef> = Object.fromEntries(CASES.map((c) => [c.id, c]));
export const FAMILY_BY_ID: Record<string, Family> = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));

export function casesOf(family: string) {
  return CASES.filter((c) => c.family === family);
}
export function familiesOf(stage: Stage) {
  return FAMILIES.filter((f) => f.stage === stage);
}

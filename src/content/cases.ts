/**
 * Curriculum content. Cases are grouped into *families* that share one idea,
 * so the learner studies a handful of concepts instead of a list of algs.
 * Every case state is generated as inverse(algorithm) applied to a solved
 * cube, so cases and solutions are consistent by construction (and tests
 * verify each algorithm only touches what its stage allows).
 */
import { Stage } from '../cube/analysis';

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
  // ---------------- OLL
  {
    id: 'oll-edges', stage: 'oll', glyph: '✚', title: 'Edge flips (yellow cross)',
    idea: 'F (sexy) F′ flips two edges. The wide version f flips a different pair.',
    steps: ['Count yellow edges on top: line, L, or dot', 'Line → F R U R′ U′ F′', 'L → wide f version', 'Dot → both, one after another'],
  },
  {
    id: 'oll-sune', stage: 'oll', glyph: '↻', title: 'The Sune family',
    idea: 'Every corner-only OLL is Sune-based: Sune twists three corners at once.',
    steps: ['Edges already form a cross', 'Count oriented corners: 0, 1 or 2', 'Look where the side yellow stickers face', 'Pick the Sune variation'],
  },
  {
    id: 'oll-triggers', stage: 'oll', glyph: '⚒', title: 'Trigger combos',
    idea: 'Many OLLs are two triggers glued together — learn the triggers, not the letters.',
    steps: ['Find the trigger chunks in the algorithm', 'Sexy + sledgehammer, or a "fat" Sune with r', 'Each chunk has a clear job'],
  },
  // ---------------- PLL
  {
    id: 'pll-edges', stage: 'pll', glyph: '⟲', title: 'Edges only',
    idea: 'Corners are already solved; only edges cycle or swap.',
    steps: ['All four corners form solid "headlights"', 'One solved side → U perm (3-cycle)', 'No solved side → H or Z (swaps)'],
  },
  {
    id: 'pll-corner-swap', stage: 'pll', glyph: '⇆', title: 'Adjacent corner swap',
    idea: 'One side has headlights: two neighbouring corners trade places (plus edges).',
    steps: ['Find the single pair of headlights', 'Put it on the left (T) or the back (J)', 'Run the swap'],
  },
  {
    id: 'pll-corner-cycle', stage: 'pll', glyph: '△', title: 'Corner 3-cycles & diagonals',
    idea: 'Three corners rotate (A perms) or two diagonal corners swap (Y, V).',
    steps: ['Headlights on one side + no solid edge block → A perm', 'No headlights → diagonal swap', 'Commutators: move – swap – undo'],
  },
];

export const CASES: CaseDef[] = [
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
  { id: 'f2l-both-1', stage: 'f2l', family: 'f2l-both-in', name: 'Both in · corner twisted A', alg: "R U' R' U' R U R' U2 R U' R'", cue: 'Edge right, corner twisted.', why: 'Lift the pair, U moves twist it right, insert.' },
  { id: 'f2l-both-2', stage: 'f2l', family: 'f2l-both-in', name: 'Both in · corner twisted B', alg: "R U' R' U R U2 R' U R U' R'", cue: 'Edge right, corner twisted the other way.', why: 'Same plan, mirrored timing.' },
  { id: 'f2l-both-3', stage: 'f2l', family: 'f2l-both-in', name: 'Both in · edge flipped', alg: "R U2 R' U R U2 R' U F' U' F", cue: 'Corner solved, edge flipped.', why: 'Two R U2 R′ pull both out and re-pair; finish from the front.' },
  { id: 'f2l-both-4', stage: 'f2l', family: 'f2l-both-in', name: 'Both in · all wrong', alg: "R U R' U' R U2 R' U' R U R'", cue: 'Edge solved, corner twisted in the slot.', why: 'Sexy extracts, U2 rebuilds the pair, insert.' },

  // ---------------- OLL
  { id: 'oll-line', stage: 'oll', family: 'oll-edges', name: 'Line', alg: "F R U R' U' F'", cue: 'Two opposite yellow edges (a line).', why: 'F tilts the line\'s edges into the R layer; the sexy move flips them; F′ brings them back oriented.', related: [{ id: 'oll-l', how: 'Same moves with a wide f' }, { id: 'oll-dot', how: 'Dot = line + L' }] },
  { id: 'oll-l', stage: 'oll', family: 'oll-edges', name: 'L shape', alg: "f R U R' U' f'", cue: 'Two adjacent yellow edges (an L).', why: 'Wide f also moves the middle layer, so a different pair of edges gets flipped.', related: [{ id: 'oll-line', how: 'Regular F version' }] },
  { id: 'oll-dot', stage: 'oll', family: 'oll-edges', name: 'Dot', alg: "F R U R' U' F' f R U R' U' f'", cue: 'No yellow edges on top.', why: 'Line algorithm creates an L, the L algorithm finishes the cross.', related: [{ id: 'oll-line', how: 'First half' }, { id: 'oll-l', how: 'Second half' }] },
  { id: 'oll-sune', stage: 'oll', family: 'oll-sune', name: 'Sune', alg: "R U R' U R U2 R'", cue: 'One corner up (a fish); the others face one way.', why: 'R U R′ U carries a corner around; R U2 R′ returns it — three corners twist together.', related: [{ id: 'oll-antisune', how: 'Inverse' }, { id: 'oll-fat-sune', how: 'Wide r version also flips edges' }] },
  { id: 'oll-antisune', stage: 'oll', family: 'oll-sune', name: 'Antisune', alg: "R U2 R' U' R U' R'", cue: 'Fish pointing the other way.', why: 'Sune played backwards — corners twist the opposite direction.', related: [{ id: 'oll-sune', how: 'Inverse' }] },
  { id: 'oll-h', stage: 'oll', family: 'oll-sune', name: 'H (double headlights)', alg: "R U R' U R U' R' U R U2 R'", cue: 'No corners up; headlights on two opposite sides.', why: 'It is a Sune with an extra R U′ R′ U inside — twists all four corners.', related: [{ id: 'oll-sune', how: 'Extended Sune' }] },
  { id: 'oll-pi', stage: 'oll', family: 'oll-sune', name: 'Pi', alg: "R U2 R2 U' R2 U' R2 U2 R", cue: 'No corners up; one side has headlights, the opposite side does not.', why: 'R2 moves swing two corners at once — a compact double Sune.' },
  { id: 'oll-u', stage: 'oll', family: 'oll-sune', name: 'Headlights (U)', alg: "R2 D R' U2 R D' R' U2 R'", cue: 'Two neighbouring corners up, headlights opposite them.', why: 'D moves hide the corner below while U2 swings the others.' },
  { id: 'oll-t', stage: 'oll', family: 'oll-sune', name: 'Chameleon (T)', alg: "r U R' U' r' F R F'", cue: 'Two neighbouring corners up, side stickers facing out on one side.', why: 'Wide sexy move then sledgehammer — two triggers.', related: [{ id: 'oll-bowtie', how: 'Same pieces, different order' }] },
  { id: 'oll-bowtie', stage: 'oll', family: 'oll-sune', name: 'Bowtie (L)', alg: "F' r U R' U' r' F R", cue: 'Two diagonal corners up.', why: 'A conjugated version of the chameleon (F′ … F wraps it).', related: [{ id: 'oll-t', how: 'Shares the r U R′ U′ r′ core' }] },
  { id: 'oll-sexy-sledge', stage: 'oll', family: 'oll-triggers', name: 'Sexy + Sledge', alg: "R U R' U' R' F R F'", cue: 'T-ish shape with an L of edges.', why: 'Sexy move breaks a pair, sledgehammer re-forms it oriented.', related: [{ id: 'oll-hedge-sexy', how: 'The reverse combo' }] },
  { id: 'oll-hedge-sexy', stage: 'oll', family: 'oll-triggers', name: 'Hedge + Sexy', alg: "F R' F' R U R U' R'", cue: 'Mirror-ish shape with an L of edges.', why: 'Hedgeslammer then a sexy-like trigger: the same two tools in another order.', related: [{ id: 'oll-sexy-sledge', how: 'Reverse combo' }] },
  { id: 'oll-p', stage: 'oll', family: 'oll-triggers', name: 'F reverse-sexy F′', alg: "F U R U' R' F'", cue: 'L of edges with a block of yellow.', why: 'Like the line algorithm, but reverse sexy inside.', related: [{ id: 'oll-line', how: 'Sexy vs reverse sexy' }] },
  { id: 'oll-fat-sune', stage: 'oll', family: 'oll-triggers', name: 'Fat Sune', alg: "r U R' U R U2 r'", cue: 'Lightning bolt shape.', why: 'A Sune with wide r: corners twist like Sune, the M slice flips two edges.', related: [{ id: 'oll-sune', how: 'Same rhythm' }, { id: 'oll-fat-antisune', how: 'Mirror' }] },
  { id: 'oll-fat-antisune', stage: 'oll', family: 'oll-triggers', name: 'Fat Antisune', alg: "r' U' R U' R' U2 r", cue: 'Lightning bolt, mirrored.', why: 'Left-leaning fat Sune.', related: [{ id: 'oll-fat-sune', how: 'Mirror' }] },
  { id: 'oll-arrow', stage: 'oll', family: 'oll-triggers', name: 'Arrow (all corners done)', alg: "R U R' U' M' U R U' r'", cue: 'All corners up, two edges not.', why: 'Sexy then M′ flips the two edges through the middle layer; the rest restores.' },

  // ---------------- PLL
  { id: 'pll-ua', stage: 'pll', family: 'pll-edges', name: 'Ua', alg: "R U' R U R U R U' R' U' R2", cue: 'One solid side; three edges cycle.', why: 'R U R U moves drag three edges around while corners return home.', related: [{ id: 'pll-ub', how: 'Inverse direction' }] },
  { id: 'pll-ub', stage: 'pll', family: 'pll-edges', name: 'Ub', alg: "R2 U R U R' U' R' U' R' U R'", cue: 'One solid side; edges cycle the other way.', why: 'Ua backwards.', related: [{ id: 'pll-ua', how: 'Inverse' }] },
  { id: 'pll-h', stage: 'pll', family: 'pll-edges', name: 'H', alg: 'M2 U M2 U2 M2 U M2', cue: 'Every side shows the opposite edge colour.', why: 'M2 swaps two edges through the bottom; doing it twice with U turns swaps both pairs.', related: [{ id: 'pll-z', how: 'Same M2 swaps, adjacent pairs' }] },
  { id: 'pll-z', stage: 'pll', family: 'pll-edges', name: 'Z', alg: "M' U M2 U M2 U M' U2 M2", cue: 'Edges swap with their neighbours.', why: 'M slice swaps edge pairs, U turns pick which ones.', related: [{ id: 'pll-h', how: 'Sibling' }] },
  { id: 'pll-t', stage: 'pll', family: 'pll-corner-swap', name: 'T', alg: "R U R' U' R' F R2 U' R' U' R U R' F'", cue: 'Headlights on one side, a 2-colour bar opposite them.', why: 'Sexy move + sledgehammer pattern swaps two corners and two edges.', related: [{ id: 'pll-jb', how: 'Same corner swap, different edges' }, { id: 'oll-sexy-sledge', how: 'Starts with the same triggers' }] },
  { id: 'pll-jb', stage: 'pll', family: 'pll-corner-swap', name: 'Jb', alg: "R U R' F' R U R' U' R' F R2 U' R'", cue: 'A 1×3 solid block on one side.', why: 'Swaps the same two corners as T but a different edge pair.', related: [{ id: 'pll-t', how: 'Close relative' }, { id: 'pll-ja', how: 'Mirror' }] },
  { id: 'pll-ja', stage: 'pll', family: 'pll-corner-swap', name: 'Ja', alg: "R' U L' U2 R U' R' U2 R L", cue: 'Solid block on the other side.', why: 'Left-handed Jb using L moves.', related: [{ id: 'pll-jb', how: 'Mirror' }] },
  { id: 'pll-aa', stage: 'pll', family: 'pll-corner-cycle', name: 'Aa', alg: "x R' U R' D2 R U' R' D2 R2 x'", cue: 'Headlights on one side, edges all solved.', why: 'A commutator: move a corner, swap through D2, undo — three corners rotate.', related: [{ id: 'pll-ab', how: 'Inverse' }] },
  { id: 'pll-ab', stage: 'pll', family: 'pll-corner-cycle', name: 'Ab', alg: "x R2 D2 R U R' D2 R U' R x'", cue: 'Same as Aa, opposite cycle.', why: 'Aa backwards.', related: [{ id: 'pll-aa', how: 'Inverse' }] },
  { id: 'pll-e', stage: 'pll', family: 'pll-corner-cycle', name: 'E', alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x", cue: 'No headlights anywhere; edges solved.', why: 'Two corner swaps, each a commutator with D.' },
  { id: 'pll-y', stage: 'pll', family: 'pll-corner-cycle', name: 'Y', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'", cue: 'No headlights; two diagonal corners swap.', why: 'First half is an OLL-like trigger set, second half sexy + sledgehammer.', related: [{ id: 'oll-sexy-sledge', how: 'Ends with the same trigger pair' }] },
  { id: 'pll-v', stage: 'pll', family: 'pll-corner-cycle', name: 'V', alg: "R' U R' U' y R' F' R2 U' R' U R' F R F", cue: 'Diagonal swap with a 2×2 block.', why: 'Diagonal corner swap that also preserves a block.' },
];

export const CASE_BY_ID: Record<string, CaseDef> = Object.fromEntries(CASES.map((c) => [c.id, c]));
export const FAMILY_BY_ID: Record<string, Family> = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));

export function casesOf(family: string) {
  return CASES.filter((c) => c.family === family);
}
export function familiesOf(stage: Stage) {
  return FAMILIES.filter((f) => f.stage === stage);
}

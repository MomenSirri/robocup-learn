/**
 * Full OLL (57) and PLL (21) sets. Every algorithm is checked by the tests:
 * it must keep F2L intact, produce a distinct case, and together they must
 * cover every last-layer case exactly once.
 */

export interface LLDef {
  n: string; // OLL number or PLL name
  family: string;
  alg: string;
  name?: string;
}

export const OLL: LLDef[] = [
  // dot — no edges oriented
  { n: '1', family: 'oll-dot', alg: "R U2 R2 F R F' U2 R' F R F'" },
  { n: '2', family: 'oll-dot', alg: "F R U R' U' F' f R U R' U' f'" },
  { n: '3', family: 'oll-dot', alg: "f R U R' U' f' U' F R U R' U' F'" },
  { n: '4', family: 'oll-dot', alg: "f R U R' U' f' U F R U R' U' F'" },
  { n: '17', family: 'oll-dot', alg: "R U R' U R' F R F' U2 R' F R F'" },
  { n: '18', family: 'oll-dot', alg: "r U R' U R U2 r2 U' R U' R' U2 r" },
  { n: '19', family: 'oll-dot', alg: "r' R U R U R' U' M' R' F R F'" },
  { n: '20', family: 'oll-dot', alg: "r U R' U' M2 U R U' R' U' M'" },
  // all corners oriented, edges not
  { n: '28', family: 'oll-corners-done', alg: "r U R' U' r' R U R U' R'", name: 'Stealth' },
  { n: '57', family: 'oll-corners-done', alg: "R U R' U' M' U R U' r'", name: 'H (Mohawk)' },
  // OCLL — cross done, corners not
  { n: '21', family: 'oll-sune', alg: "R U R' U R U' R' U R U2 R'", name: 'H' },
  { n: '22', family: 'oll-sune', alg: "R U2 R2 U' R2 U' R2 U2 R", name: 'Pi' },
  { n: '23', family: 'oll-sune', alg: "R2 D' R U2 R' D R U2 R", name: 'Headlights' },
  { n: '24', family: 'oll-sune', alg: "r U R' U' r' F R F'", name: 'Chameleon' },
  { n: '25', family: 'oll-sune', alg: "F' r U R' U' r' F R", name: 'Bowtie' },
  { n: '26', family: 'oll-sune', alg: "R U2 R' U' R U' R'", name: 'Antisune' },
  { n: '27', family: 'oll-sune', alg: "R U R' U R U2 R'", name: 'Sune' },
  // line shapes
  { n: '51', family: 'oll-line', alg: "f R U R' U' R U R' U' f'" },
  { n: '52', family: 'oll-line', alg: "R U R' U R U' B U' B' R'" },
  { n: '55', family: 'oll-line', alg: "R' F R U R U' R2 F' R2 U' R' U R U R'" },
  { n: '56', family: 'oll-line', alg: "r' U' r U' R' U R U' R' U R r' U r" },
  // T and C
  { n: '33', family: 'oll-tc', alg: "R U R' U' R' F R F'", name: 'T (shoe)' },
  { n: '45', family: 'oll-tc', alg: "F R U R' U' F'", name: 'T' },
  { n: '34', family: 'oll-tc', alg: "R U R2 U' R' F R U R U' F'", name: 'C' },
  { n: '46', family: 'oll-tc', alg: "R' U' R' F R F' U R", name: 'C' },
  // P shapes
  { n: '31', family: 'oll-p', alg: "R' U' F U R U' R' F' R" },
  { n: '32', family: 'oll-p', alg: "R U B' U' R' U R B R'" },
  { n: '43', family: 'oll-p', alg: "R' U' F' U F R" },
  { n: '44', family: 'oll-p', alg: "f R U R' U' f'" },
  // squares, lightning bolts
  { n: '5', family: 'oll-lightning', alg: "r' U2 R U R' U r", name: 'Square' },
  { n: '6', family: 'oll-lightning', alg: "r U2 R' U' R U' r'", name: 'Square' },
  { n: '7', family: 'oll-lightning', alg: "r U R' U R U2 r'", name: 'Lightning' },
  { n: '8', family: 'oll-lightning', alg: "l' U' L U' L' U2 l", name: 'Lightning' },
  { n: '11', family: 'oll-lightning', alg: "r U R' U R' F R F' R U2 r'", name: 'Lightning' },
  { n: '12', family: 'oll-lightning', alg: "M' R' U' R U' R' U2 R U' R r'", name: 'Lightning' },
  { n: '39', family: 'oll-lightning', alg: "L F' L' U' L U F U' L'", name: 'Big lightning' },
  { n: '40', family: 'oll-lightning', alg: "R' F R U R' U' F' U R", name: 'Big lightning' },
  // fish
  { n: '9', family: 'oll-fish', alg: "R U R' U' R' F R2 U R' U' F'" },
  { n: '10', family: 'oll-fish', alg: "R U R' U R' F R F' R U2 R'" },
  { n: '35', family: 'oll-fish', alg: "R U2 R2 F R F' R U2 R'" },
  { n: '37', family: 'oll-fish', alg: "F R' F' R U R U' R'" },
  // knight moves
  { n: '13', family: 'oll-knight', alg: "F U R U' R2 F' R U R U' R'" },
  { n: '14', family: 'oll-knight', alg: "R' F R U R' F' R F U' F'" },
  { n: '15', family: 'oll-knight', alg: "r' U' r R' U' R U r' U r" },
  { n: '16', family: 'oll-knight', alg: "r U r' R U R' U' r U' r'" },
  // awkward
  { n: '29', family: 'oll-awkward', alg: "R U R' U' R U' R' F' U' F R U R'" },
  { n: '30', family: 'oll-awkward', alg: "F R' F R2 U' R' U' R U R' F2" },
  { n: '41', family: 'oll-awkward', alg: "R U R' U R U2 R' F R U R' U' F'" },
  { n: '42', family: 'oll-awkward', alg: "R' U' R U' R' U2 R F R U R' U' F'" },
  // W
  { n: '36', family: 'oll-w', alg: "L' U' L U' L' U L U L F' L' F" },
  { n: '38', family: 'oll-w', alg: "R U R' U R U' R' U' R' F R F'" },
  // small L shapes
  { n: '47', family: 'oll-small-l', alg: "R' U' R' F R F' R' F R F' U R" },
  { n: '48', family: 'oll-small-l', alg: "F R U R' U' R U R' U' F'" },
  { n: '49', family: 'oll-small-l', alg: "r U' r2 U r2 U r2 U' r" },
  { n: '50', family: 'oll-small-l', alg: "r' U r2 U' r2 U' r2 U r'" },
  { n: '53', family: 'oll-small-l', alg: "r' U' R U' R' U R U' R' U2 r" },
  { n: '54', family: 'oll-small-l', alg: "r U R' U R U' R' U R U2 r'" },
];

export const PLL: LLDef[] = [
  { n: 'Ua', family: 'pll-edges', alg: "R U' R U R U R U' R' U' R2" },
  { n: 'Ub', family: 'pll-edges', alg: "R2 U R U R' U' R' U' R' U R'" },
  { n: 'H', family: 'pll-edges', alg: 'M2 U M2 U2 M2 U M2' },
  { n: 'Z', family: 'pll-edges', alg: "M' U M2 U M2 U M' U2 M2" },
  { n: 'Aa', family: 'pll-corners', alg: "x R' U R' D2 R U' R' D2 R2 x'" },
  { n: 'Ab', family: 'pll-corners', alg: "x R2 D2 R U R' D2 R U' R x'" },
  { n: 'E', family: 'pll-corners', alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x" },
  { n: 'T', family: 'pll-adjacent', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { n: 'F', family: 'pll-adjacent', alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { n: 'Ja', family: 'pll-adjacent', alg: "R' U L' U2 R U' R' U2 R L" },
  { n: 'Jb', family: 'pll-adjacent', alg: "R U R' F' R U R' U' R' F R2 U' R'" },
  { n: 'Ra', family: 'pll-adjacent', alg: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
  { n: 'Rb', family: 'pll-adjacent', alg: "R2 F R U R U' R' F' R U2 R' U2 R" },
  { n: 'Y', family: 'pll-diagonal', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { n: 'V', family: 'pll-diagonal', alg: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
  { n: 'Na', family: 'pll-diagonal', alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
  { n: 'Nb', family: 'pll-diagonal', alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
  { n: 'Ga', family: 'pll-g', alg: "R2 U R' U R' U' R U' R2 U' D R' U R D'" },
  { n: 'Gb', family: 'pll-g', alg: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { n: 'Gc', family: 'pll-g', alg: "R2 U' R U' R U R' U R2 U D' R U' R' D" },
  { n: 'Gd', family: 'pll-g', alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
];

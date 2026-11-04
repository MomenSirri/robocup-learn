/**
 * "My path": the 2-look last layer, the smallest set of algorithms that
 * takes a learner from a beginner method to full CFOP. 16 algorithms in
 * 4 steps, in learning order. Holding tips were checked against the cube
 * model (see tests/path.test.ts).
 */
export interface PathItem {
  caseId: string;
  label: string;
  /** how to hold the cube before starting */
  hold: string;
}

export interface PathStep {
  id: string;
  title: string;
  goal: string;
  how: string;
  items: PathItem[];
}

export const PATH: PathStep[] = [
  {
    id: 'yellow-cross',
    title: 'Yellow cross',
    goal: 'Make a yellow cross on top. Ignore the corners for now.',
    how: 'Look only at the 4 edges on top: do you see a line, an L, or just the centre (dot)?',
    items: [
      { caseId: 'oll-45', label: 'Line', hold: 'Hold the line left–right (yellow edges on the left and right).' },
      { caseId: 'oll-44', label: 'L shape', hold: 'Turn the top so the two yellow edges are at the front and the right.' },
      { caseId: 'oll-2', label: 'Dot', hold: 'Any angle. It is the line algorithm followed by the L algorithm.' },
    ],
  },
  {
    id: 'yellow-face',
    title: 'Yellow face',
    goal: 'With the cross done, turn the corners so the whole top is yellow.',
    how: 'Count the corners that already show yellow on top: 0, 1 or 2.',
    items: [
      { caseId: 'oll-27', label: 'Sune', hold: '1 corner up: put it at front-left.' },
      { caseId: 'oll-26', label: 'Antisune', hold: '1 corner up: put it at back-right.' },
      { caseId: 'oll-21', label: 'H (corners)', hold: '0 corners up: yellow side stickers face left and right.' },
      { caseId: 'oll-22', label: 'Pi', hold: '0 corners up: put the two yellows that face the same way on the left.' },
      { caseId: 'oll-23', label: 'Headlights', hold: '2 corners up: put them at the front.' },
      { caseId: 'oll-24', label: 'Chameleon', hold: '2 corners up: put them on the right.' },
      { caseId: 'oll-25', label: 'Bowtie', hold: '2 corners up, diagonal: put them at front-left and back-right.' },
    ],
  },
  {
    id: 'corners',
    title: 'Last-layer corners',
    goal: 'Put the 4 top corners in their places (edges can be wrong).',
    how: 'Look for headlights: two corner stickers on one side with the same colour.',
    items: [
      { caseId: 'pll-t', label: 'T perm', hold: 'Headlights on one side: put them on the left.' },
      { caseId: 'pll-y', label: 'Y perm', hold: 'No headlights: any angle.' },
    ],
  },
  {
    id: 'edges',
    title: 'Last-layer edges',
    goal: 'Corners are done; now move the edges home. The cube is solved!',
    how: 'Is one side fully solved? Then it is a U perm. If not, it is H or Z.',
    items: [
      { caseId: 'pll-ua', label: 'Ua perm', hold: 'Put the solved side at the back.' },
      { caseId: 'pll-ub', label: 'Ub perm', hold: 'Put the solved side at the back.' },
      { caseId: 'pll-h', label: 'H perm', hold: 'Any angle (middle stickers are the opposite colour).' },
      { caseId: 'pll-z', label: 'Z perm', hold: 'Match the picture before you start.' },
    ],
  },
];

export const PATH_CASE_IDS = PATH.flatMap((s) => s.items.map((i) => i.caseId));

/** Friendly names used on the path (e.g. 'Line' instead of 'OLL 45 · T'). */
export const PATH_LABEL: Record<string, string> = Object.fromEntries(PATH.flatMap((s) => s.items.map((i) => [i.caseId, i.label])));

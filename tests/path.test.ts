import { describe, it, expect } from 'vitest';
import { PATH, PATH_CASE_IDS } from '../src/content/path';
import { CASE_BY_ID } from '../src/content/cases';
import { makeCase } from '../src/content/caseState';
import { applyAlg, parseAlg, stickerDir, relPos, LAST_LAYER, CubeState, facelets, faceletAt } from '../src/cube/cube';

const up = (s: CubeState, kind: 2 | 3) => LAST_LAYER.filter((x) => x.length === kind && stickerDir(s, x, 'U')[1] === 1).map((x) => relPos(s, x).join(','));
const edgesUp = (s: CubeState) => up(s, 2).length;

describe('My path', () => {
  it('has 16 real cases', () => {
    expect(PATH_CASE_IDS.length).toBe(16);
    for (const id of PATH_CASE_IDS) expect(CASE_BY_ID[id], id).toBeTruthy();
  });
  it('holding tips match the cube', () => {
    const s = (id: string) => makeCase(CASE_BY_ID[id]).start;
    expect(up(s('oll-45'), 2).sort()).toEqual(['-1,1,0', '1,1,0']); // line left–right
    expect(up(s('oll-44'), 2).sort()).toEqual(['0,1,1', '1,1,0']); // L at front and right
    expect(up(s('oll-27'), 3)).toEqual(['-1,1,1']); // Sune: corner front-left
    expect(up(s('oll-26'), 3)).toEqual(['1,1,-1']); // Antisune: back-right
    expect(up(s('oll-23'), 3).sort()).toEqual(['-1,1,1', '1,1,1']); // front
    expect(up(s('oll-24'), 3).sort()).toEqual(['1,1,-1', '1,1,1']); // right
    expect(up(s('oll-25'), 3).sort()).toEqual(['-1,1,1', '1,1,-1']); // diagonal FL + BR
  });
  it('2-look edges: line and L algorithms finish the cross only from the stated angle', () => {
    const line = makeCase(CASE_BY_ID['oll-45']).start;
    expect(edgesUp(applyAlg(line, parseAlg("F R U R' U' F'")))).toBe(4);
    expect(edgesUp(applyAlg(applyAlg(line, parseAlg('U')), parseAlg("F R U R' U' F'")))).not.toBe(4);
  });
  it('T perm needs headlights on the left; Y works from any angle', () => {
    const f = (s: CubeState) => facelets(s);
    const leftHeadlights = (s: CubeState) => faceletAt(f(s), [-1, 1, -1], 'L') === faceletAt(f(s), [-1, 1, 1], 'L');
    expect(leftHeadlights(makeCase(CASE_BY_ID['pll-t']).start)).toBe(true);
    const back = makeCase(CASE_BY_ID['pll-ua']).start;
    const b = [[-1, 1, -1], [0, 1, -1], [1, 1, -1]].map((p) => faceletAt(f(back), p as [number, number, number], 'B'));
    expect(new Set(b).size).toBe(1); // Ua: solved side at the back
  });
  it('each step names distinct cases', () => {
    expect(new Set(PATH.flatMap((s) => s.items.map((i) => i.caseId))).size).toBe(16);
  });
});

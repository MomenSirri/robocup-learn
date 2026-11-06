import { describe, it, expect } from 'vitest';
import { faceName } from '../src/ui/scheme';
import { identify, distinctCases, SideColour } from '../src/training/pllId';

describe('colour scheme', () => {
  it('matches a standard cube: yellow top, green front → orange right, red left', () => {
    expect(faceName('U')).toBe('Yellow');
    expect(faceName('F')).toBe('Green');
    expect(faceName('R')).toBe('Orange');
    expect(faceName('L')).toBe('Red');
    expect(faceName('B')).toBe('Blue');
  });
  it('a real T perm entered by colour name is recognised', () => {
    // T perm on a standard cube, headlights on the left, held green-front:
    // front row: green green orange · right row: blue red green
    const byName: Record<string, SideColour> = { Green: 'F', Orange: 'R', Blue: 'B', Red: 'L' };
    const seen = ['Green', 'Green', 'Orange', 'Blue', 'Red', 'Green'].map((n) => byName[n]);
    expect(distinctCases(identify(seen)).map((c) => c?.id)).toEqual(['pll-t']);
  });
});

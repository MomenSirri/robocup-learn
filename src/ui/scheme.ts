/**
 * Cube colour scheme. The standard (Western) scheme, held with yellow on
 * top and green in front, has ORANGE on the right and RED on the left.
 * Some cubes are made the other way round, so the learner can switch;
 * the choice is saved on the device and applied everywhere.
 */
export type Scheme = 'standard' | 'mirrored';
type FaceKey = 'U' | 'D' | 'F' | 'B' | 'R' | 'L';

const KEY = 'cfop-coach/scheme';
const RED = '#e0303d';
const ORANGE = '#ff7a1a';
const BASE: Record<FaceKey, string> = { U: '#ffd23f', D: '#f5f5f0', F: '#15b85a', B: '#2563eb', R: ORANGE, L: RED };

let current: Scheme | null = null;

export function scheme(): Scheme {
  if (current) return current;
  try {
    current = localStorage.getItem(KEY) === 'mirrored' ? 'mirrored' : 'standard';
  } catch {
    current = 'standard';
  }
  return current;
}

/** Saves the choice and reloads, so every view picks up the new colours. */
export function setScheme(s: Scheme) {
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* storage blocked: keep for this visit only */
  }
  current = s;
  location.reload();
}

export function faceHex(face: FaceKey): string {
  if (scheme() === 'mirrored' && (face === 'R' || face === 'L')) return face === 'R' ? RED : ORANGE;
  return BASE[face];
}

export function faceName(face: FaceKey): string {
  const hex = faceHex(face);
  return { '#ffd23f': 'Yellow', '#f5f5f0': 'White', '#15b85a': 'Green', '#2563eb': 'Blue', [RED]: 'Red', [ORANGE]: 'Orange' }[hex]!;
}

export const faceHexNumber = (face: FaceKey) => parseInt(faceHex(face).slice(1), 16);

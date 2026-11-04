/**
 * Learner model: per-case performance, confusions and history, persisted in
 * localStorage. The scheduler weights cases by how much the learner struggles.
 */
import { CASES, CaseDef } from '../content/cases';
import { Stage } from '../cube/analysis';

export interface CaseRecord {
  seen: number;
  correct: number;
  wrong: number;
  recog: number[]; // last N recognition times (ms) for correct answers
  exec: number[]; // last N execution times (ms)
  hints: number; // total hints used
  lastSeen: number;
  streak: number;
  /** wrong answer case id → count */
  confusedWith: Record<string, number>;
  learned?: boolean;
}

export interface DayStat {
  date: string;
  attempts: number;
  correct: number;
  recogSum: number;
  recogN: number;
}

export interface Progress {
  cases: Record<string, CaseRecord>;
  days: DayStat[];
  mistakes: Record<string, number>; // mistake kind → count
  discoveries: { caseId: string; moves: number; ref: number; at: number }[];
  /** algorithms the learner says they already know (My path) */
  known: Record<string, boolean>;
}

const KEY = 'cfop-coach/progress/v1';
const N_KEEP = 20;

function empty(): Progress {
  return { cases: {}, days: [], mistakes: {}, discoveries: [], known: {} };
}

let cache: Progress | null = null;
let ver = 0;
const listeners = new Set<() => void>();

/** Monotonic version, bumps on every change (for React subscriptions). */
export function version() {
  return ver;
}

export function load(): Progress {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    cache = empty();
  }
  return cache!;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable: keep in memory */
  }
  ver++;
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function record(id: string): CaseRecord {
  const p = load();
  return (p.cases[id] ??= { seen: 0, correct: 0, wrong: 0, recog: [], exec: [], hints: 0, lastSeen: 0, streak: 0, confusedWith: {} });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dayStat(): DayStat {
  const p = load();
  const d = today();
  let s = p.days.find((x) => x.date === d);
  if (!s) {
    s = { date: d, attempts: 0, correct: 0, recogSum: 0, recogN: 0 };
    p.days.push(s);
    if (p.days.length > 120) p.days.shift();
  }
  return s;
}

export function logAnswer(caseId: string, answeredId: string, recogMs: number, hints = 0) {
  const r = record(caseId);
  const ok = caseId === answeredId;
  r.seen++;
  r.lastSeen = Date.now();
  r.hints += hints;
  const d = dayStat();
  d.attempts++;
  if (ok) {
    r.correct++;
    r.streak++;
    r.recog.push(recogMs);
    if (r.recog.length > N_KEEP) r.recog.shift();
    d.correct++;
    d.recogSum += recogMs;
    d.recogN++;
  } else {
    r.wrong++;
    r.streak = 0;
    r.confusedWith[answeredId] = (r.confusedWith[answeredId] ?? 0) + 1;
    const p = load();
    p.mistakes['misrecognised'] = (p.mistakes['misrecognised'] ?? 0) + 1;
  }
  save();
}

export function logExec(caseId: string, ms: number) {
  const r = record(caseId);
  r.exec.push(ms);
  if (r.exec.length > N_KEEP) r.exec.shift();
  save();
}

export function logMistake(kind: string) {
  const p = load();
  p.mistakes[kind] = (p.mistakes[kind] ?? 0) + 1;
  save();
}

export function logDiscovery(caseId: string, moves: number, ref: number) {
  const p = load();
  p.discoveries.push({ caseId, moves, ref, at: Date.now() });
  if (p.discoveries.length > 200) p.discoveries.shift();
  save();
}

export function markLearned(caseId: string) {
  record(caseId).learned = true;
  save();
}

export function isKnown(id: string) {
  return !!load().known[id];
}

export function setKnown(id: string, v: boolean) {
  load().known[id] = v;
  save();
}

export function resetProgress() {
  cache = empty();
  save();
}

// ---------------------------------------------------------------- metrics

export const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export function accuracy(r?: CaseRecord) {
  if (!r || r.seen === 0) return null;
  return r.correct / r.seen;
}

/** 0 (mastered) … 1+ (struggling). */
export function difficulty(id: string): number {
  const r = load().cases[id];
  if (!r || r.seen === 0) return 0.8; // unknown — worth showing
  const errRate = (r.wrong + 1) / (r.seen + 2);
  const slow = Math.min(1, avg(r.recog.slice(-5)) / 4000); // 4s+ is slow
  const hintRate = Math.min(1, r.hints / Math.max(1, r.seen) / 2);
  const streakBonus = Math.min(0.4, r.streak * 0.08);
  return Math.max(0.05, errRate * 1.6 + slow * 0.6 + hintRate * 0.4 - streakBonus);
}

/** Weighted random pick, favouring hard / stale cases, never repeating the last one. */
export function pickNext(pool: CaseDef[], lastId?: string): CaseDef {
  const now = Date.now();
  const p = load();
  const weights = pool.map((c) => {
    if (c.id === lastId && pool.length > 1) return 0;
    const r = p.cases[c.id];
    const stale = r ? Math.min(1, (now - r.lastSeen) / (1000 * 60 * 60 * 24)) : 1;
    return difficulty(c.id) + 0.25 * stale + 0.05;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i];
    if (x <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Answer options: the right case plus look-alikes (same family, past confusions). */
export function optionsFor(target: CaseDef, n = 4, within?: CaseDef[]): CaseDef[] {
  const sameStage = (within ?? CASES).filter((c) => c.stage === target.stage && c.id !== target.id && c.alg);
  const r = load().cases[target.id];
  const confused = Object.entries(r?.confusedWith ?? {}).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const ranked = sameStage
    .map((c) => ({ c, score: (confused.includes(c.id) ? 3 : 0) + (c.family === target.family ? 2 : 0) + Math.random() * 1.5 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n - 1)
    .map((x) => x.c);
  const out = [...ranked, target];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function hardestCases(stage?: Stage, n = 5) {
  const p = load();
  return Object.entries(p.cases)
    .filter(([id, r]) => r.seen > 0 && (!stage || id.startsWith(stage)))
    .map(([id]) => ({ id, d: difficulty(id) }))
    .sort((a, b) => b.d - a.d)
    .slice(0, n);
}

export function topConfusions(n = 5) {
  const p = load();
  const pairs: { a: string; b: string; n: number }[] = [];
  for (const [id, r] of Object.entries(p.cases)) for (const [o, k] of Object.entries(r.confusedWith)) pairs.push({ a: id, b: o, n: k });
  return pairs.sort((x, y) => y.n - x.n).slice(0, n);
}

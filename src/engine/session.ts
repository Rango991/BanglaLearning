import type { Chat, Lesson, Phrase } from '../content';
import { englishAnswers, norm, shuffle, tiles } from './text';

export type Exercise = { id: string } & (
  | { kind: 'guide'; title: string; body: string[] }
  | { kind: 'intro'; p: Phrase }
  /** See (and hear) Bangla, pick the English. */
  | { kind: 'pick-en'; p: Phrase; options: string[] }
  /** Hear Bangla only, pick the English. */
  | { kind: 'listen-pick'; p: Phrase; options: string[] }
  /** See English, pick the Bangla. */
  | { kind: 'pick-bn'; p: Phrase; options: Phrase[] }
  /** See English, build the Bangla from tiles. */
  | { kind: 'build-bn'; p: Phrase; bank: string[] }
  /** See and hear Bangla, build the English from tiles. */
  | { kind: 'build-en'; p: Phrase; bank: string[] }
  /** Hear Bangla only, build it from tiles. */
  | { kind: 'listen-build'; p: Phrase; bank: string[] }
  /** See the Sylheti, pick the standard Bangla. */
  | { kind: 'sylheti'; p: Phrase; options: string[] }
  | { kind: 'speak'; p: Phrase }
  | { kind: 'match'; pairs: Phrase[]; right: string[] }
  | { kind: 'chat'; chat: Chat }
);

export type ExerciseKind = Exercise['kind'];

export interface Abilities {
  /** Speaking exercises are switched on and the device can recognise speech. */
  speak: boolean;
  /** The learner can listen right now (not switched off for the session). */
  listen: boolean;
}

type Rand = () => number;

let counter = 0;
const nextId = () => `ex${++counter}`;

/** Two phrases are interchangeable if any accepted English answer overlaps. */
function sameMeaning(a: Phrase, b: Phrase): boolean {
  const x = new Set(englishAnswers(a));
  return englishAnswers(b).some((e) => x.has(e)) || norm(a.ro) === norm(b.ro);
}

/** Wrong options for a phrase: closest first (the given pool order), never another right answer. */
function distractors(p: Phrase, pool: Phrase[], n: number, rand: Rand): Phrase[] {
  const seen = new Set<string>();
  const out: Phrase[] = [];
  // Shuffle within the near part of the pool so options vary between sessions.
  const near = shuffle(pool.slice(0, 12), rand);
  const far = shuffle(pool.slice(12), rand);
  for (const q of [...near, ...far]) {
    if (out.length >= n) break;
    if (q === p || sameMeaning(p, q)) continue;
    const key = norm(q.en);
    if (seen.has(key) || seen.has(norm(q.ro))) continue;
    if (out.some((o) => sameMeaning(o, q))) continue;
    seen.add(key);
    seen.add(norm(q.ro));
    out.push(q);
  }
  return out;
}

function bank(answer: string[], others: string[][], rand: Rand): string[] {
  const used = new Set(answer.map((w) => w.toLowerCase()));
  const extra: string[] = [];
  const want = Math.min(5, Math.max(3, Math.ceil(answer.length * 0.8)));
  for (const words of shuffle(others, rand)) {
    for (const w of shuffle(words, rand)) {
      if (extra.length >= want) break;
      const k = w.toLowerCase();
      if (used.has(k)) continue;
      used.add(k);
      extra.push(w);
    }
    if (extra.length >= want) break;
  }
  return shuffle([...answer, ...extra], rand);
}

export function makeExercise(kind: ExerciseKind, p: Phrase, pool: Phrase[], rand: Rand = Math.random): Exercise {
  const id = nextId();
  const others = pool.filter((q) => !sameMeaning(p, q));
  switch (kind) {
    case 'pick-en':
    case 'listen-pick':
      return { id, kind, p, options: shuffle([p.en, ...distractors(p, pool, 3, rand).map((q) => q.en)], rand) };
    case 'pick-bn':
      return { id, kind, p, options: shuffle([p, ...distractors(p, pool, 2, rand)], rand) };
    case 'build-bn':
    case 'listen-build':
      return { id, kind, p, bank: bank(tiles(p.ro), others.map((q) => tiles(q.ro)), rand) };
    case 'build-en':
      return { id, kind, p, bank: bank(tiles(p.en), others.map((q) => tiles(q.en)), rand) };
    case 'sylheti':
      return { id, kind, p, options: shuffle([p.ro, ...distractors(p, pool, 2, rand).map((q) => q.ro)], rand) };
    case 'speak':
      return { id, kind, p };
    case 'intro':
      return { id, kind, p };
    default:
      throw new Error(`makeExercise can't build ${kind}`);
  }
}

export function makeMatch(phrases: Phrase[], rand: Rand = Math.random): Exercise {
  // Pairs must be unambiguous: no two with the same meaning.
  const pairs: Phrase[] = [];
  for (const p of shuffle(phrases, rand)) {
    if (pairs.length >= 5) break;
    if (pairs.some((q) => sameMeaning(p, q) || norm(q.en) === norm(p.en))) continue;
    pairs.push(p);
  }
  return { id: nextId(), kind: 'match', pairs, right: shuffle(pairs.map((p) => p.en), rand) };
}

const words = (s: string) => tiles(s).length;

/** The harder exercise types a phrase can be tested with. */
export function hardKinds(p: Phrase, can: Abilities): ExerciseKind[] {
  const kinds: ExerciseKind[] = [];
  if (words(p.ro) >= 2) kinds.push('build-bn');
  if (words(p.en) >= 2) kinds.push('build-en');
  if (can.listen) kinds.push('listen-pick');
  if (can.listen && words(p.ro) >= 2) kinds.push('listen-build');
  if (p.syl) kinds.push('sylheti');
  if (can.speak) kinds.push('speak');
  if (!kinds.length) kinds.push('pick-bn');
  return kinds;
}

/**
 * Give each phrase one harder exercise, spreading the types out so a lesson
 * doesn't become ten tile-builders in a row.
 */
function hardRound(phrases: Phrase[], pool: Phrase[], can: Abilities, rand: Rand): Exercise[] {
  const counts = new Map<ExerciseKind, number>();
  return shuffle(phrases, rand).map((p) => {
    const options = shuffle(hardKinds(p, can), rand).sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0));
    const kind = options[0];
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    return makeExercise(kind, p, pool, rand);
  });
}

export interface LessonOptions extends Abilities {
  /** First time through: teach each phrase before testing it. */
  firstTime: boolean;
  /** Other known phrases, nearest first, used for wrong options and spare tiles. */
  pool: Phrase[];
  rand?: Rand;
}

export function lessonSession(lesson: Lesson, opts: LessonOptions): Exercise[] {
  const rand = opts.rand ?? Math.random;
  const pool = [...lesson.phrases, ...opts.pool.filter((p) => !lesson.phrases.includes(p))];
  const out: Exercise[] = [];

  if (opts.firstTime) {
    if (lesson.guide) out.push({ id: nextId(), kind: 'guide', ...lesson.guide });
    // Teach two at a time, each followed straight away by an easy check.
    for (let i = 0; i < lesson.phrases.length; i += 2) {
      const chunk = lesson.phrases.slice(i, i + 2);
      chunk.forEach((p) => out.push(makeExercise('intro', p, pool, rand)));
      chunk.forEach((p, j) => out.push(makeExercise(j % 2 ? 'pick-bn' : 'pick-en', p, pool, rand)));
    }
    out.push(makeMatch(lesson.phrases, rand));
    out.push(...hardRound(lesson.phrases, pool, opts, rand).slice(0, 6));
  } else {
    out.push(makeMatch(lesson.phrases, rand));
    const first = hardRound(lesson.phrases, pool, opts, rand);
    const second = hardRound(lesson.phrases, pool, opts, rand);
    out.push(...shuffle([...first, ...second], rand).slice(0, 11));
  }

  if (lesson.chat) out.push({ id: nextId(), kind: 'chat', chat: lesson.chat });
  return out;
}

export type PracticeMode = 'mixed' | 'listen' | 'speak' | 'sylheti';

export function practiceSession(targets: Phrase[], pool: Phrase[], mode: PracticeMode, can: Abilities, rand: Rand = Math.random): Exercise[] {
  const out: Exercise[] = [];
  const kindsFor = (p: Phrase): ExerciseKind[] => {
    switch (mode) {
      case 'listen':
        return words(p.ro) >= 2 ? ['listen-pick', 'listen-build'] : ['listen-pick'];
      case 'speak':
        return ['speak'];
      case 'sylheti':
        return ['sylheti'];
      default:
        return hardKinds(p, can);
    }
  };
  if (mode === 'mixed' && targets.length >= 4) out.push(makeMatch(targets, rand));
  const counts = new Map<ExerciseKind, number>();
  for (const p of targets) {
    const options = shuffle(kindsFor(p), rand).sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0));
    counts.set(options[0], (counts.get(options[0]) ?? 0) + 1);
    out.push(makeExercise(options[0], p, pool, rand));
  }
  return out;
}

/** Is this the right answer for a graded single-answer exercise? */
export function checkAnswer(ex: Exercise, answer: string): boolean {
  switch (ex.kind) {
    case 'pick-en':
    case 'listen-pick':
    case 'build-en':
      return englishAnswers(ex.p).includes(norm(answer));
    case 'pick-bn':
    case 'build-bn':
    case 'listen-build':
    case 'sylheti':
      return norm(answer) === norm(ex.p.ro);
    default:
      return true;
  }
}

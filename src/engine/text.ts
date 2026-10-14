import type { Phrase } from '../content';

/** Lower-case, drop punctuation, collapse spaces. Used for every answer comparison. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a sentence into word tiles, keeping the original spelling but dropping punctuation. */
export function tiles(s: string): string[] {
  return s
    .replace(/[?!,.।"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Bengali words of a phrase, with the danda and other punctuation removed. */
export function bnWords(s: string): string[] {
  return s.replace(/[?!,.।"]/g, ' ').split(/\s+/).filter(Boolean);
}

export function englishAnswers(p: Phrase): string[] {
  return [p.en, ...(p.alt ?? [])].map(norm);
}

export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(items: readonly T[], rand: () => number = Math.random): T {
  return items[Math.floor(rand() * items.length)];
}

/** Similarity from 0 to 1, based on edit distance. Used to mark speaking attempts. */
export function similarity(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  if (!x.length && !y.length) return 1;
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length);
}

/** Normalise Bengali text for comparing what the speech recogniser heard. */
export function normBn(s: string): string {
  return s.replace(/[\s?!,.।"'\-]/g, '').replace(/়/g, '');
}

/** Did the recogniser hear something close enough to the target phrase? */
export function speechMatches(target: string, heard: string[]): { ok: boolean; best: string; score: number } {
  const t = normBn(target);
  let best = '';
  let score = 0;
  for (const h of heard) {
    const s = similarity(t, normBn(h));
    if (s > score) {
      score = s;
      best = h;
    }
  }
  return { ok: score >= 0.6, best, score };
}

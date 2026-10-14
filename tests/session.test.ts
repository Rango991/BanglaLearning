import { describe, expect, it } from 'vitest';
import { allPhrases, lessonList } from '../src/content';
import { checkAnswer, lessonSession, makeExercise, practiceSession } from '../src/engine/session';
import { englishAnswers, norm, similarity, speechMatches, tiles } from '../src/engine/text';
import { applyResult, defaultProgress, review, streak } from '../src/engine/progress';

const pool = allPhrases.map((e) => e.phrase);
const can = { speak: true, listen: true };

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe('lesson sessions', () => {
  it('builds a session for every lesson, first time and replay', () => {
    for (const { lesson } of lessonList) {
      for (const firstTime of [true, false]) {
        const s = lessonSession(lesson, { ...can, firstTime, pool, rand: seeded(7) });
        expect(s.length, lesson.id).toBeGreaterThan(5);
        if (firstTime) expect(s.filter((e) => e.kind === 'intro')).toHaveLength(lesson.phrases.length);
        if (lesson.chat) expect(s.at(-1)?.kind).toBe('chat');
      }
    }
  });

  it('always offers exactly one right option, and the right answer can be built from the tiles', () => {
    for (let seed = 1; seed < 6; seed++) {
      for (const { lesson } of lessonList) {
        for (const ex of lessonSession(lesson, { ...can, firstTime: true, pool, rand: seeded(seed) })) {
          if (ex.kind === 'pick-en' || ex.kind === 'listen-pick') {
            expect(ex.options.filter((o) => checkAnswer(ex, o)), `${ex.p.ro}: ${ex.options}`).toHaveLength(1);
            expect(ex.options.length).toBe(4);
          }
          if (ex.kind === 'pick-bn') expect(ex.options.filter((o) => checkAnswer(ex, o.ro))).toHaveLength(1);
          if (ex.kind === 'sylheti') expect(ex.options.filter((o) => checkAnswer(ex, o))).toHaveLength(1);
          if (ex.kind === 'build-bn' || ex.kind === 'listen-build') {
            expect(checkAnswer(ex, tiles(ex.p.ro).join(' '))).toBe(true);
            for (const t of tiles(ex.p.ro)) expect(ex.bank).toContain(t);
          }
          if (ex.kind === 'build-en') {
            for (const t of tiles(ex.p.en)) expect(ex.bank).toContain(t);
            expect(checkAnswer(ex, tiles(ex.p.en).join(' '))).toBe(true);
          }
          if (ex.kind === 'match') {
            const ens = ex.pairs.map((p) => norm(p.en));
            expect(new Set(ens).size).toBe(ens.length);
          }
        }
      }
    }
  });

  it('never puts a correct word in the tile bank twice when it could confuse the order', () => {
    const p = pool.find((q) => q.ro === 'ami ektu ektu Bangla bolte pari')!;
    const ex = makeExercise('build-bn', p, pool, seeded(3));
    if (ex.kind !== 'build-bn') throw new Error();
    expect(ex.bank.filter((t) => t === 'ektu')).toHaveLength(2);
    expect(checkAnswer(ex, 'ami ektu ektu Bangla bolte pari')).toBe(true);
    expect(checkAnswer(ex, 'ami Bangla ektu ektu bolte pari')).toBe(false);
  });

  it('accepts alternative English answers and ignores punctuation and case', () => {
    const p = pool.find((q) => q.ro === 'bhalo achi')!;
    const ex = makeExercise('build-en', p, pool);
    expect(checkAnswer(ex, "I'm well")).toBe(true);
    expect(checkAnswer(ex, 'i am fine')).toBe(true);
    expect(checkAnswer(ex, 'I am sad')).toBe(false);
    expect(englishAnswers(p)).toContain('im well');
  });

  it('builds practice sessions in every mode', () => {
    const targets = pool.filter((p) => p.syl).slice(0, 8);
    for (const mode of ['mixed', 'listen', 'speak', 'sylheti'] as const) {
      const s = practiceSession(targets, pool, mode, can, seeded(2));
      expect(s.length).toBeGreaterThanOrEqual(targets.length);
    }
  });
});

describe('speech marking', () => {
  it('accepts close matches and rejects different phrases', () => {
    expect(speechMatches('কেমন আছেন?', ['কেমন আছেন']).ok).toBe(true);
    expect(speechMatches('কেমন আছেন?', ['কেমন আছো']).ok).toBe(true);
    expect(speechMatches('কেমন আছেন?', ['ধন্যবাদ']).ok).toBe(false);
    expect(similarity('abc', 'abc')).toBe(1);
  });
});

describe('progress', () => {
  it('moves phrases up and down the review boxes', () => {
    const a = review(undefined, true, '2026-01-01');
    expect(a).toMatchObject({ box: 1, due: '2026-01-02' });
    const b = review({ ...a, box: 4 }, false, '2026-01-01');
    expect(b.box).toBe(2);
  });

  it('counts a streak of consecutive days', () => {
    const days = { '2026-03-01': 10, '2026-03-02': 20, '2026-03-03': 5 };
    expect(streak(days, '2026-03-03')).toBe(3);
    expect(streak(days, '2026-03-04')).toBe(3);
    expect(streak(days, '2026-03-05')).toBe(0);
  });

  it('applies a finished lesson', () => {
    const p = applyResult(defaultProgress(), { lessonId: 'hello-1', outcomes: { 'bhalo achi': true }, xp: 15, minutes: 4 }, '2026-03-03');
    expect(p.xp).toBe(15);
    expect(p.lessons['hello-1']).toBe(1);
    expect(p.days['2026-03-03']).toBe(15);
    expect(p.phrases['bhalo achi'].box).toBe(1);
  });
});

describe('backup codes', () => {
  it('round-trips progress, including non-ASCII text', async () => {
    const { backupCode, restoreCode } = await import('../src/engine/progress');
    const p = applyResult(defaultProgress(), { lessonId: 'hello-1', outcomes: { 'bhalo achi': true }, xp: 15, minutes: 4 }, '2026-03-03');
    const code = backupCode({ ...p, settings: { ...p.settings, reminderTime: '০৭:৩০' } });
    const back = restoreCode(`  ${code.slice(0, 20)}\n${code.slice(20)} `);
    expect(back?.xp).toBe(15);
    expect(back?.lessons['hello-1']).toBe(1);
    expect(back?.settings.reminderTime).toBe('০৭:৩০');
    expect(restoreCode('nonsense')).toBeNull();
    expect(restoreCode('KOTHA1:!!!')).toBeNull();
  });
});

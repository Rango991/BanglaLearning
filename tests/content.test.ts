import { describe, expect, it } from 'vitest';
import { allPhrases, CITIES, hasTokens, defaultProfile, HOMES, JOBS, lessonList, personaliseLesson, phraseKey, units, type Profile } from '../src/content';

/** A spread of learners, to check personalised content works for all of them. */
const PROFILES: Profile[] = [
  defaultProfile,
  { name: 'Fahim', nameBn: 'ফাহিম', gender: 'm', age: 30, city: 'london', home: 'beanibazar', job: 'it', married: 'single', brothers: 2, sisters: 1 },
  { name: 'Ayesha', nameBn: '', gender: 'f', age: 44, city: 'oldham', home: 'sylhettown', job: 'hospital', married: 'married', brothers: 0, sisters: 0 },
  { name: 'Rahim', nameBn: '', gender: 'm', age: 19, city: 'Glasgow', home: 'Comilla', job: 'student', married: 'engaged', brothers: 0, sisters: 3 },
  ...Object.keys(JOBS).map((job) => ({ ...defaultProfile, job })),
  ...Object.keys(CITIES).map((city) => ({ ...defaultProfile, city })),
  ...Object.keys(HOMES).map((home) => ({ ...defaultProfile, home })),
];
import { bnWords, englishAnswers, norm, tiles } from '../src/engine/text';

describe('course content', () => {
  it('has unique unit and lesson ids', () => {
    const ids = [...units.map((u) => u.id), ...lessonList.map((r) => r.lesson.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every phrase Bengali script, a spelling and a meaning', () => {
    for (const { phrase } of allPhrases) {
      if (!hasTokens(phrase.bn)) expect(phrase.bn, phrase.ro).toMatch(/[ঀ-৿]/);
      expect(phrase.ro.trim(), phrase.en).not.toBe('');
      expect(phrase.ro, 'romanised text should be Latin').not.toMatch(/[ঀ-৿]/);
      expect(phrase.en.trim()).not.toBe('');
      expect(phraseKey(phrase)).not.toBe('');
    }
  });

  it('does not repeat a phrase anywhere in the course', () => {
    const keys = allPhrases.map((e) => phraseKey(e.phrase));
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes).toEqual([]);
  });

  it('has at least four phrases per lesson so multiple choice works', () => {
    for (const { lesson } of lessonList) expect(lesson.phrases.length, lesson.id).toBeGreaterThanOrEqual(4);
  });

  it('only lists English alternatives that differ from the main answer', () => {
    for (const { phrase } of allPhrases) {
      const answers = englishAnswers(phrase);
      expect(new Set(answers).size, phrase.ro).toBe(answers.length);
    }
  });

  it('gives every chat reply a right answer and two wrong ones that differ from it, for every profile', () => {
    for (const profile of PROFILES) for (const { lesson: raw } of lessonList) {
      const lesson = personaliseLesson(raw, profile, phraseKey);
      if (!lesson.chat) continue;
      expect(lesson.chat.lines.some((l) => l.who === 'you'), lesson.id).toBe(true);
      for (const line of lesson.chat.lines) {
        expect(line.bn, line.ro).toMatch(/[ঀ-৿]/);
        if (line.who !== 'you') continue;
        expect(line.wrong?.length, line.ro).toBe(2);
        for (const w of line.wrong!) expect(norm(w.ro), line.ro).not.toBe(norm(line.ro));
      }
    }
  });

  it('fills in every personalisation token', () => {
    for (const profile of PROFILES) {
      for (const { lesson: raw } of lessonList) {
        const lesson = personaliseLesson(raw, profile, phraseKey);
        const texts = [
          ...lesson.phrases.flatMap((p) => [p.bn, p.ro, p.en, ...(p.alt ?? [])]),
          ...(lesson.chat ? [lesson.chat.with, lesson.chat.scene, ...lesson.chat.lines.flatMap((l) => [l.bn, l.ro, l.en, ...(l.wrong ?? []).flatMap((w) => [w.ro, w.en])])] : []),
        ];
        for (const t of texts) expect(t, `${lesson.id}: ${t}`).not.toMatch(/[{}]/);
        for (const p of lesson.phrases) {
          expect(p.bn, p.ro).toMatch(/[\u0980-\u09FF]/);
          expect(p.ro, p.ro).not.toMatch(/[\u0980-\u09FF]/);
        }
      }
    }
  });

  it('keeps review history stable when the profile changes', () => {
    const a = personaliseLesson(lessonList.find((r) => r.lesson.id === 'me-1')!.lesson, PROFILES[0], phraseKey);
    const b = personaliseLesson(lessonList.find((r) => r.lesson.id === 'me-1')!.lesson, PROFILES[1], phraseKey);
    expect(a.phrases.map(phraseKey)).toEqual(b.phrases.map(phraseKey));
    expect(b.phrases.some((p) => p.ro.includes('Fahim'))).toBe(true);
  });

  it('lines up most phrase words with their Bengali words, so tiles can be spoken', () => {
    const aligned = allPhrases.filter(({ phrase }) => tiles(phrase.ro).length === bnWords(phrase.bn).length).length;
    expect(aligned / allPhrases.length).toBeGreaterThan(0.85);
  });
});

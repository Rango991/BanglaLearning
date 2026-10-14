import { describe, expect, it } from 'vitest';
import { allPhrases, lessonList, phraseKey, units } from '../src/content';
import { bnWords, englishAnswers, norm, tiles } from '../src/engine/text';

describe('course content', () => {
  it('has unique unit and lesson ids', () => {
    const ids = [...units.map((u) => u.id), ...lessonList.map((r) => r.lesson.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every phrase Bengali script, a spelling and a meaning', () => {
    for (const { phrase } of allPhrases) {
      expect(phrase.bn, phrase.ro).toMatch(/[ঀ-৿]/);
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

  it('gives every chat reply a right answer and two wrong ones that differ from it', () => {
    for (const { lesson } of lessonList) {
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

  it('lines up most phrase words with their Bengali words, so tiles can be spoken', () => {
    const aligned = allPhrases.filter(({ phrase }) => tiles(phrase.ro).length === bnWords(phrase.bn).length).length;
    expect(aligned / allPhrases.length).toBeGreaterThan(0.85);
  });
});

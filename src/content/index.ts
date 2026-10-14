import type { Lesson, Phrase, Unit } from './types';
import { unitsA } from './units-a';
import { unitsB } from './units-b';
import { unitsC } from './units-c';
import { unitsD } from './units-d';
import { unitsE } from './units-e';

export * from './types';
export * from './profile';

export const units: Unit[] = [...unitsA, ...unitsB, ...unitsC, ...unitsD, ...unitsE];

export interface LessonRef {
  unit: Unit;
  lesson: Lesson;
  /** Position in the whole course, used to decide what's "next". */
  index: number;
}

export const lessonList: LessonRef[] = units.flatMap((unit) => unit.lessons.map((lesson) => ({ unit, lesson, index: 0 })));
lessonList.forEach((ref, i) => (ref.index = i));

export const lessonById = new Map(lessonList.map((ref) => [ref.lesson.id, ref]));

/** Stable id for a phrase, used to track how well it's known. */
export function phraseKey(p: Phrase): string {
  if (p.key) return p.key;
  return p.ro.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, ' ').trim();
}

export const allPhrases: { phrase: Phrase; lessonId: string; unitId: string }[] = lessonList.flatMap(({ unit, lesson }) =>
  lesson.phrases.map((phrase) => ({ phrase, lessonId: lesson.id, unitId: unit.id })),
);

export const phraseByKey = new Map(allPhrases.map((entry) => [phraseKey(entry.phrase), entry]));

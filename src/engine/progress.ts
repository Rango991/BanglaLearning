/** Everything the app remembers, saved on the phone. */

export interface PhraseStat {
  /** Leitner box 0–5: higher means better known and reviewed less often. */
  box: number;
  /** Day it should next come back for practice (YYYY-MM-DD). */
  due: string;
  right: number;
  wrong: number;
}

export interface Settings {
  /** Show the Bengali script under the romanised spelling. */
  script: boolean;
  /** Include speaking exercises (needs the microphone). */
  speak: boolean;
  sound: boolean;
  /** Text-to-speech speed for the normal (non-turtle) button. */
  rate: number;
  /** XP per day to hit the daily goal. */
  goal: number;
  /** Daily practice reminder notification. */
  reminder: boolean;
  /** Reminder time, "HH:MM" in local time. */
  reminderTime: string;
  /** Whether we've already offered the reminder, so we only ask once. */
  reminderAsked: boolean;
  /** In role-plays, say your reply out loud after choosing it. */
  chatSpeak: boolean;
}

import type { Profile } from '../content/profile';

export interface Progress {
  version: 1;
  started: boolean;
  xp: number;
  /** Times each lesson has been completed. */
  lessons: Record<string, number>;
  phrases: Record<string, PhraseStat>;
  /** XP earned per day. */
  days: Record<string, number>;
  /** Minutes studied per day. */
  minutes: Record<string, number>;
  settings: Settings;
  /** The learner's details, used to personalise role-plays. */
  profile?: Profile;
}

export const defaultProgress = (): Progress => ({
  version: 1,
  started: false,
  xp: 0,
  lessons: {},
  phrases: {},
  days: {},
  minutes: {},
  settings: { script: false, speak: true, sound: true, rate: 0.9, goal: 30, reminder: false, reminderTime: '19:00', reminderAsked: false, chatSpeak: true },
});

const KEY = 'kotha-progress-v1';

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const saved = JSON.parse(raw) as Partial<Progress>;
    const base = defaultProgress();
    return { ...base, ...saved, settings: { ...base.settings, ...saved.settings } };
  } catch {
    return defaultProgress();
  }
}

const BACKUP_PREFIX = 'KOTHA1:';

/** A copy-and-paste code holding all progress, for moving phones or reinstalling. */
export function backupCode(p: Progress): string {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return BACKUP_PREFIX + btoa(bin);
}

/** Reads a backup code. Returns null if it isn't a valid Kotha backup. */
export function restoreCode(code: string): Progress | null {
  try {
    const clean = code.trim().replace(/\s+/g, '');
    if (!clean.startsWith(BACKUP_PREFIX)) return null;
    const bin = atob(clean.slice(BACKUP_PREFIX.length));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const saved = JSON.parse(json) as Partial<Progress>;
    if (saved.version !== 1 || typeof saved.xp !== 'number' || typeof saved.lessons !== 'object') return null;
    const base = defaultProgress();
    return { ...base, ...saved, started: true, settings: { ...base.settings, ...saved.settings } };
  } catch {
    return null;
  }
}

export function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked: progress just won't persist */
  }
}

// ---------- dates (local time) ----------

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** Days in a row with some XP, counting today if done, or up to yesterday if not yet. */
export function streak(days: Record<string, number>, today = dayKey()): number {
  let day = (days[today] ?? 0) > 0 ? today : addDays(today, -1);
  let n = 0;
  while ((days[day] ?? 0) > 0) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

// ---------- spaced repetition ----------

/** Days until a phrase comes back, by box. */
export const INTERVALS = [0, 1, 3, 7, 14, 30];

export function review(stat: PhraseStat | undefined, correct: boolean, today = dayKey()): PhraseStat {
  const s = stat ?? { box: 0, due: today, right: 0, wrong: 0 };
  const box = correct ? Math.min(5, s.box + 1) : Math.max(0, s.box - 2);
  return {
    box,
    due: addDays(today, INTERVALS[box]),
    right: s.right + (correct ? 1 : 0),
    wrong: s.wrong + (correct ? 0 : 1),
  };
}

/** Phrases due for practice, most overdue and weakest first. */
export function dueKeys(phrases: Record<string, PhraseStat>, today = dayKey()): string[] {
  return Object.entries(phrases)
    .filter(([, s]) => s.due <= today)
    .sort(([, a], [, b]) => a.due.localeCompare(b.due) || a.box - b.box)
    .map(([k]) => k);
}

/** Weakest phrases overall, for when nothing is due. */
export function weakestKeys(phrases: Record<string, PhraseStat>): string[] {
  return Object.entries(phrases)
    .sort(([, a], [, b]) => a.box - b.box || b.wrong - a.wrong || a.due.localeCompare(b.due))
    .map(([k]) => k);
}

// ---------- results ----------

export interface SessionResult {
  lessonId?: string;
  /** Per phrase: was it right every time it came up this session? */
  outcomes: Record<string, boolean>;
  xp: number;
  minutes: number;
}

export function applyResult(p: Progress, r: SessionResult, today = dayKey()): Progress {
  const phrases = { ...p.phrases };
  for (const [key, ok] of Object.entries(r.outcomes)) phrases[key] = review(phrases[key], ok, today);
  return {
    ...p,
    xp: p.xp + r.xp,
    lessons: r.lessonId ? { ...p.lessons, [r.lessonId]: (p.lessons[r.lessonId] ?? 0) + 1 } : p.lessons,
    phrases,
    days: { ...p.days, [today]: (p.days[today] ?? 0) + r.xp },
    minutes: { ...p.minutes, [today]: (p.minutes[today] ?? 0) + r.minutes },
  };
}

/** XP for a finished session: a base amount plus a bonus for accuracy. */
export function sessionXp(kind: 'lesson' | 'practice', correct: number, total: number): number {
  const base = kind === 'lesson' ? 10 : 5;
  const accuracy = total ? correct / total : 1;
  const bonus = accuracy === 1 ? 5 : accuracy >= 0.8 ? 3 : 0;
  return base + Math.min(10, Math.round(correct / 2)) + bonus;
}

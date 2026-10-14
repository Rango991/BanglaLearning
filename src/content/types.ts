/**
 * Course content. The learner never has to write Bangla: they listen, read the
 * romanised spelling, tap word tiles and speak. The Bengali script is still
 * stored for every phrase because it is what the phone's voice reads aloud
 * (and learners can switch it on in Settings if they're curious).
 */

export interface Phrase {
  /** Bengali script. Read aloud by text-to-speech. */
  bn: string;
  /** Romanised standard Bangla, spaced into the word tiles used in exercises. */
  ro: string;
  /** English meaning. */
  en: string;
  /** Other English answers accepted when building the English sentence. */
  alt?: string[];
  /** How a Sylheti speaker would typically say it (romanised). */
  syl?: string;
  /** A short note shown on the intro card and after answering. */
  tip?: string;
  /** Casual or slang: fine with cousins and mates, not with elders. */
  slang?: boolean;
  /** Set on personalised copies so review history follows the original phrase. */
  key?: string;
}

export interface ChatLine {
  /** 'them' lines are spoken to you; 'you' lines are the replies you choose. */
  who: 'them' | 'you';
  bn: string;
  ro: string;
  en: string;
  /** For 'you' lines: plausible wrong replies (romanised + English). */
  wrong?: { ro: string; en: string }[];
}

export interface Chat {
  /** Who you are talking to, e.g. "Your khala in Dhaka". */
  with: string;
  emoji: string;
  scene: string;
  lines: ChatLine[];
}

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  /** Optional teaching card shown at the start of the lesson. */
  guide?: { title: string; body: string[] };
  phrases: Phrase[];
  /** A role-play conversation at the end of the lesson. */
  chat?: Chat;
}

export interface Unit {
  id: string;
  title: string;
  /** One-line summary under the unit banner. */
  blurb: string;
  colour: string;
  emoji: string;
  lessons: Lesson[];
}

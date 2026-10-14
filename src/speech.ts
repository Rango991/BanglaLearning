/**
 * Voice in and out. On the phone this uses Android's own text-to-speech and
 * speech recognition (Google's Bangla voice), so it works without an internet
 * connection once the Bangla voice is downloaded. In a browser it falls back to
 * the Web Speech API, which is handy for development.
 */
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const native = Capacitor.isNativePlatform();
const LANGS = ['bn-BD', 'bn-IN', 'bn'];

let ttsLang: string | null | undefined; // undefined = not checked yet, null = no Bangla voice
let baseRate = 0.9;

export function setSpeechRate(rate: number) {
  baseRate = rate;
}

function webVoice(): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === 'undefined') return undefined;
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'bn-BD') ?? voices.find((v) => v.lang.toLowerCase().startsWith('bn'));
}

/** Find which Bangla voice the phone has, if any. */
export async function checkVoice(): Promise<boolean> {
  if (native) {
    for (const lang of LANGS) {
      try {
        const { supported } = await TextToSpeech.isLanguageSupported({ lang });
        if (supported) {
          ttsLang = lang;
          return true;
        }
      } catch {
        /* try the next one */
      }
    }
    ttsLang = null;
    return false;
  }
  if (typeof speechSynthesis === 'undefined') return false;
  if (!speechSynthesis.getVoices().length) {
    // Chrome loads voices asynchronously.
    await new Promise((r) => {
      speechSynthesis.addEventListener('voiceschanged', r, { once: true });
      setTimeout(r, 1500);
    });
  }
  ttsLang = webVoice() ? 'bn-BD' : null;
  return ttsLang !== null;
}

export function hasVoice(): boolean | undefined {
  return ttsLang === undefined ? undefined : ttsLang !== null;
}

/** Say some Bengali text aloud. Resolves when it has finished (or failed). */
export async function speak(text: string, slow = false): Promise<void> {
  if (ttsLang === undefined) await checkVoice();
  const rate = slow ? 0.55 : baseRate;
  if (native) {
    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({ text, lang: ttsLang ?? 'bn-BD', rate, pitch: 1, volume: 1, category: 'playback' });
    } catch {
      /* no Bangla voice: the Settings screen explains how to get one */
    }
    return;
  }
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const voice = webVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'bn-BD';
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
    setTimeout(resolve, 8000);
  });
}

export function stopSpeaking() {
  if (native) void TextToSpeech.stop().catch(() => undefined);
  else if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/** Opens Android's screen for installing voice data. */
export async function openVoiceInstall() {
  if (native) await TextToSpeech.openInstall().catch(() => undefined);
}

// ---------- speech recognition ----------

type WebRecognition = {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function webRecognitionCtor(): (new () => WebRecognition) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => WebRecognition) | undefined;
}

let listenAvailable: boolean | undefined;

export async function canListen(): Promise<boolean> {
  if (listenAvailable !== undefined) return listenAvailable;
  if (native) {
    try {
      listenAvailable = (await SpeechRecognition.available()).available;
    } catch {
      listenAvailable = false;
    }
  } else {
    listenAvailable = !!webRecognitionCtor();
  }
  return listenAvailable;
}

export class ListenError extends Error {
  constructor(public reason: 'permission' | 'unavailable' | 'nothing') {
    super(reason);
  }
}

let activeWeb: WebRecognition | null = null;

/** Listen for one Bangla utterance. Resolves with what the recogniser thinks was said. */
export async function listen(): Promise<string[]> {
  if (native) {
    let perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== 'granted') perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== 'granted') throw new ListenError('permission');
    try {
      const { matches } = await SpeechRecognition.start({ language: 'bn-BD', maxResults: 5, partialResults: false, popup: false });
      if (!matches?.length) throw new ListenError('nothing');
      return matches;
    } catch (e) {
      if (e instanceof ListenError) throw e;
      // Android reports "No match" when it heard nothing it understood.
      throw new ListenError('nothing');
    }
  }
  const Ctor = webRecognitionCtor();
  if (!Ctor) throw new ListenError('unavailable');
  return new Promise((resolve, reject) => {
    const r = new Ctor();
    activeWeb = r;
    r.lang = 'bn-BD';
    r.maxAlternatives = 5;
    r.interimResults = false;
    let done = false;
    r.onresult = (e) => {
      done = true;
      const alts = e.results[0];
      resolve(Array.from({ length: alts.length }, (_, i) => alts[i].transcript));
    };
    r.onerror = (e) => {
      done = true;
      reject(new ListenError(e.error === 'not-allowed' ? 'permission' : 'nothing'));
    };
    r.onend = () => {
      activeWeb = null;
      if (!done) reject(new ListenError('nothing'));
    };
    r.start();
  });
}

export function stopListening() {
  if (native) void SpeechRecognition.stop().catch(() => undefined);
  else activeWeb?.stop();
}

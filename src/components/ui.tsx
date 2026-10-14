import { Fragment, useState, type ReactNode } from 'react';
import type { Phrase } from '../content';
import { speak } from '../speech';
import { useStore } from '../store';

/** Renders **bold** markers in content strings. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

export function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** 🔊 and 🐢 buttons that read Bengali text aloud. */
export function Say({ bn, big = false, slow = true }: { bn: string; big?: boolean; slow?: boolean }) {
  const [playing, setPlaying] = useState<'normal' | 'slow' | null>(null);
  const play = async (mode: 'normal' | 'slow') => {
    setPlaying(mode);
    await speak(bn, mode === 'slow');
    setPlaying(null);
  };
  return (
    <span className={`say ${big ? 'big' : ''}`}>
      <button type="button" className={`say-btn ${playing === 'normal' ? 'on' : ''}`} onClick={() => play('normal')} aria-label="Play">
        🔊
      </button>
      {slow && (
        <button type="button" className={`say-btn slow ${playing === 'slow' ? 'on' : ''}`} onClick={() => play('slow')} aria-label="Play slowly">
          🐢
        </button>
      )}
    </span>
  );
}

/** Romanised Bangla, with the Bengali script underneath if switched on. */
export function BnText({ p, className = '' }: { p: Pick<Phrase, 'ro' | 'bn'>; className?: string }) {
  const { progress } = useStore();
  return (
    <span className={`bn-text ${className}`}>
      <span className="ro">{p.ro}</span>
      {progress.settings.script && <span className="script">{p.bn}</span>}
    </span>
  );
}

/** Marks casual/slang phrases: fine with mates, not with elders. */
export function SlangTag() {
  return <span className="slang-tag">🔥 Slang · mates only</span>;
}

export function SylBridge({ syl }: { syl: string }) {
  return (
    <div className="bridge">
      <span className="bridge-tag">Sylheti</span>
      <span className="bridge-text">{syl}</span>
    </div>
  );
}

const CHEERS = [
  ['দারুণ!', 'darun!', 'Brilliant!'],
  ['শাবাশ!', 'shabash!', 'Well done!'],
  ['একদম ঠিক!', 'ekdom thik!', 'Exactly right!'],
  ['খুব ভালো!', 'khub bhalo!', 'Very good!'],
  ['চমৎকার!', 'chomotkar!', 'Excellent!'],
] as const;

const COMFORTS = [
  ['কোনো ব্যাপার না!', 'kono byapar na!', "Never mind!"],
  ['আবার চেষ্টা করো', 'abar cheshta koro', 'Try again'],
  ['প্রায় হয়েছে!', 'pray hoyeche!', 'Nearly!'],
] as const;

export function cheer(correct: boolean) {
  const list = correct ? CHEERS : COMFORTS;
  const [bn, ro, en] = list[Math.floor(Math.random() * list.length)];
  return { bn, ro, en };
}

export function Mascot({ mood = 'happy', children }: { mood?: 'happy' | 'cheer' | 'think'; children?: ReactNode }) {
  return (
    <div className="mascot-row">
      <div className={`mascot ${mood}`} aria-hidden>
        🐯
      </div>
      {children && <div className="bubble">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, colour }: { value: number; colour?: string }) {
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: colour }} />
    </div>
  );
}

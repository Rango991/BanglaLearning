import { useEffect, useMemo, useRef, useState } from 'react';
import { allPhrases, type Chat, type ChatLine, type Phrase } from '../content';
import type { Exercise } from '../engine/session';
import { bnWords, shuffle, speechMatches, tiles } from '../engine/text';
import { sfx } from '../sound';
import { canListen, listen, ListenError, speak, stopListening } from '../speech';
import { BnText, capital, Rich, Say, SlangTag, SylBridge } from './ui';

/** Romanised word → Bengali word, from phrases where the words line up one to one. */
const wordAudio = (() => {
  const map = new Map<string, string>();
  for (const { phrase } of allPhrases) {
    const ro = tiles(phrase.ro);
    const bn = bnWords(phrase.bn);
    if (ro.length !== bn.length) continue;
    ro.forEach((w, i) => {
      const k = w.toLowerCase();
      if (!map.has(k)) map.set(k, bn[i]);
    });
  }
  return map;
})();

export interface SelfResult {
  correct: number;
  total: number;
  /** Phrases answered wrongly (for spaced repetition). */
  wrong?: Phrase[];
  /** Phrases answered correctly. */
  right?: Phrase[];
  /** Skipped without penalty (e.g. couldn't speak right now). */
  skipped?: boolean;
}

export interface ExerciseProps {
  ex: Exercise;
  locked: boolean;
  onChange(answer: string | null): void;
  onDone(r: SelfResult): void;
  onCantListen(): void;
  onCantSpeak(): void;
  /** Ask the learner to say their chosen role-play replies out loud. */
  chatSpeak: boolean;
}

export function ExerciseView(props: ExerciseProps) {
  const { ex } = props;
  switch (ex.kind) {
    case 'guide':
      return <GuideCard title={ex.title} body={ex.body} />;
    case 'intro':
      return <IntroCard p={ex.p} />;
    case 'pick-en':
      return <PickEnglish {...props} p={ex.p} options={ex.options} listenOnly={false} />;
    case 'listen-pick':
      return <PickEnglish {...props} p={ex.p} options={ex.options} listenOnly />;
    case 'pick-bn':
      return <PickBangla {...props} p={ex.p} options={ex.options} />;
    case 'sylheti':
      return <SylhetiSwap {...props} p={ex.p} options={ex.options} />;
    case 'build-bn':
    case 'build-en':
    case 'listen-build':
      return <Builder {...props} key={ex.id} p={ex.p} bank={ex.bank} mode={ex.kind} />;
    case 'match':
      return <Match key={ex.id} pairs={ex.pairs} right={ex.right} onDone={props.onDone} />;
    case 'speak':
      return <Speak key={ex.id} p={ex.p} onDone={props.onDone} onCantSpeak={props.onCantSpeak} />;
    case 'chat':
      return <ChatView key={ex.id} chat={ex.chat} onDone={props.onDone} speakReplies={props.chatSpeak} onCantSpeak={props.onCantSpeak} />;
  }
}

function useAutoPlay(bn: string, id: string) {
  useEffect(() => {
    const t = setTimeout(() => void speak(bn), 250);
    return () => clearTimeout(t);
  }, [bn, id]);
}

// ---------- teaching cards ----------

function GuideCard({ title, body }: { title: string; body: string[] }) {
  return (
    <div className="ex guide-card pop-in">
      <div className="ex-kicker">💡 Tip</div>
      <h2>{title}</h2>
      {body.map((line, i) => (
        <p key={i}>
          <Rich text={line} />
        </p>
      ))}
    </div>
  );
}

function IntroCard({ p }: { p: Phrase }) {
  useAutoPlay(p.bn, p.ro);
  return (
    <div className="ex intro pop-in">
      <div className="ex-kicker">✨ New phrase</div>
      <div className="intro-main">
        <Say bn={p.bn} big />
        <BnText p={p} className="huge" />
      </div>
      <div className="intro-en">{capital(p.en)}</div>
      {p.slang && (
        <div className="center">
          <SlangTag />
        </div>
      )}
      {p.syl && <SylBridge syl={p.syl} />}
      {p.tip && (
        <p className="tip">
          <Rich text={p.tip} />
        </p>
      )}
    </div>
  );
}

// ---------- multiple choice ----------

function Options({ options, render, locked, onChange, onTap }: {
  options: string[];
  render?: (o: string) => React.ReactNode;
  locked: boolean;
  onChange(a: string | null): void;
  onTap?(o: string): void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="options">
      {options.map((o, i) => (
        <button
          key={o}
          type="button"
          className={`option ${picked === o ? 'picked' : ''}`}
          disabled={locked}
          onClick={() => {
            sfx.tap();
            setPicked(o);
            onChange(o);
            onTap?.(o);
          }}
        >
          <span className="option-num">{i + 1}</span>
          <span className="option-text">{render ? render(o) : capital(o)}</span>
        </button>
      ))}
    </div>
  );
}

function PickEnglish({ p, options, listenOnly, locked, onChange, onCantListen, ex }: ExerciseProps & { p: Phrase; options: string[]; listenOnly: boolean }) {
  useAutoPlay(p.bn, ex.id);
  return (
    <div className="ex" key={ex.id}>
      <h2 className="ex-title">{listenOnly ? 'What did you hear?' : 'What does this mean?'}</h2>
      {listenOnly ? (
        <div className="listen-box">
          <Say bn={p.bn} big />
        </div>
      ) : (
        <div className="prompt">
          <Say bn={p.bn} />
          <BnText p={p} className="large" />
        </div>
      )}
      <Options options={options} locked={locked} onChange={onChange} />
      {listenOnly && !locked && (
        <button type="button" className="btn link" onClick={onCantListen}>
          🎧 Can't listen now
        </button>
      )}
    </div>
  );
}

function PickBangla({ p, options, locked, onChange, ex }: ExerciseProps & { p: Phrase; options: Phrase[] }) {
  const byRo = new Map(options.map((o) => [o.ro, o]));
  return (
    <div className="ex" key={ex.id}>
      <h2 className="ex-title">How do you say…</h2>
      <div className="prompt en-prompt">"{capital(p.en)}"</div>
      <Options
        options={options.map((o) => o.ro)}
        locked={locked}
        onChange={onChange}
        render={(ro) => <BnText p={byRo.get(ro)!} />}
        onTap={(ro) => void speak(byRo.get(ro)!.bn)}
      />
    </div>
  );
}

function SylhetiSwap({ p, options, locked, onChange, ex }: ExerciseProps & { p: Phrase; options: string[] }) {
  return (
    <div className="ex" key={ex.id}>
      <h2 className="ex-title">Say it in standard Bangla</h2>
      <div className="prompt">
        <SylBridge syl={p.syl!} />
        <div className="muted small">"{capital(p.en)}"</div>
      </div>
      <Options options={options} locked={locked} onChange={onChange} render={(o) => o} />
    </div>
  );
}

// ---------- word tiles ----------

function Builder({ p, bank, mode, locked, onChange, onCantListen }: ExerciseProps & { p: Phrase; bank: string[]; mode: 'build-bn' | 'build-en' | 'listen-build' }) {
  const [chosen, setChosen] = useState<number[]>([]);
  const banglaTiles = mode !== 'build-en';
  // This phrase's own words first, so personalised words (like your name) have audio too.
  const ownWords = useMemo(() => {
    const ro = tiles(p.ro);
    const bn = bnWords(p.bn);
    return new Map(ro.length === bn.length ? ro.map((w, i) => [w.toLowerCase(), bn[i]] as const) : []);
  }, [p]);
  useEffect(() => {
    if (mode !== 'build-bn') {
      const t = setTimeout(() => void speak(p.bn), 250);
      return () => clearTimeout(t);
    }
  }, [mode, p.bn]);

  const update = (next: number[]) => {
    setChosen(next);
    onChange(next.length ? next.map((i) => bank[i]).join(' ') : null);
  };
  const tap = (i: number) => {
    if (locked) return;
    sfx.tap();
    if (chosen.includes(i)) {
      update(chosen.filter((c) => c !== i));
    } else {
      update([...chosen, i]);
      const bn = banglaTiles && (ownWords.get(bank[i].toLowerCase()) ?? wordAudio.get(bank[i].toLowerCase()));
      if (bn) void speak(bn);
    }
  };

  return (
    <div className="ex">
      <h2 className="ex-title">
        {mode === 'build-bn' ? 'Say this in Bangla' : mode === 'build-en' ? 'Translate this' : 'Tap what you hear'}
      </h2>
      <div className="prompt">
        {mode === 'build-bn' && <div className="en-prompt">"{capital(p.en)}"</div>}
        {mode === 'build-en' && (
          <>
            <Say bn={p.bn} />
            <BnText p={p} className="large" />
          </>
        )}
        {mode === 'listen-build' && (
          <div className="listen-box">
            <Say bn={p.bn} big />
          </div>
        )}
      </div>
      <div className="answer-line">
        {chosen.map((i) => (
          <button key={i} type="button" className="tile" onClick={() => tap(i)} disabled={locked}>
            {bank[i]}
          </button>
        ))}
      </div>
      <div className="bank">
        {bank.map((w, i) => (
          <button key={i} type="button" className={`tile ${chosen.includes(i) ? 'used' : ''}`} onClick={() => tap(i)} disabled={locked || chosen.includes(i)}>
            {w}
          </button>
        ))}
      </div>
      {mode === 'listen-build' && !locked && (
        <button type="button" className="btn link" onClick={onCantListen}>
          🎧 Can't listen now
        </button>
      )}
    </div>
  );
}

// ---------- match the pairs ----------

function Match({ pairs, right, onDone }: { pairs: Phrase[]; right: string[]; onDone(r: SelfResult): void }) {
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const [selL, setSelL] = useState<Phrase | null>(null);
  const [selR, setSelR] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<Phrase>>(new Set());
  const [wrongFlash, setWrongFlash] = useState(false);
  const wrong = useRef(new Set<Phrase>());

  useEffect(() => {
    if (!selL || selR === null) return;
    if (selL.en === selR) {
      sfx.correct();
      const next = new Set(matched).add(selL);
      setMatched(next);
      setSelL(null);
      setSelR(null);
      if (next.size === pairs.length) {
        const w = [...wrong.current];
        setTimeout(() => onDone({ correct: w.length ? 0 : 1, total: 1, wrong: w, right: pairs.filter((p) => !wrong.current.has(p)) }), 400);
      }
    } else {
      sfx.wrong();
      wrong.current.add(selL);
      setWrongFlash(true);
      const t = setTimeout(() => {
        setWrongFlash(false);
        setSelL(null);
        setSelR(null);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [selL, selR, matched, pairs, onDone]);

  const matchedEn = new Set([...matched].map((p) => p.en));
  return (
    <div className="ex">
      <h2 className="ex-title">Match the pairs</h2>
      <div className="match">
        <div className="match-col">
          {left.map((p) => (
            <button
              key={p.ro}
              type="button"
              disabled={matched.has(p)}
              className={`tile match-tile ${selL === p ? (wrongFlash ? 'bad' : 'sel') : ''} ${matched.has(p) ? 'done' : ''}`}
              onClick={() => {
                setSelL(p);
                void speak(p.bn);
              }}
            >
              <BnText p={p} />
            </button>
          ))}
        </div>
        <div className="match-col">
          {right.map((en) => (
            <button
              key={en}
              type="button"
              disabled={matchedEn.has(en)}
              className={`tile match-tile ${selR === en ? (wrongFlash ? 'bad' : 'sel') : ''} ${matchedEn.has(en) ? 'done' : ''}`}
              onClick={() => {
                sfx.tap();
                setSelR(en);
              }}
            >
              {capital(en)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- speaking ----------

type SpeechState = 'idle' | 'listening' | 'good' | 'bad' | 'error';

/** Listen for the learner saying a Bengali phrase and mark it. */
function useSpeechAttempt(bn: string) {
  const [state, setState] = useState<SpeechState>('idle');
  const [heard, setHeard] = useState('');
  const [message, setMessage] = useState('');
  const [tries, setTries] = useState(0);
  useEffect(() => () => stopListening(), []);

  const start = async () => {
    if (!(await canListen())) {
      setState('error');
      setMessage("Your phone's speech recognition isn't available. You can turn speaking off in Settings.");
      return;
    }
    setState('listening');
    setHeard('');
    try {
      const matches = await listen();
      const result = speechMatches(bn, matches);
      setHeard(result.best);
      setTries((t) => t + 1);
      if (result.ok) {
        sfx.correct();
        setState('good');
      } else {
        sfx.wrong();
        setState('bad');
      }
    } catch (e) {
      setState('error');
      const reason = e instanceof ListenError ? e.reason : 'nothing';
      setMessage(
        reason === 'permission'
          ? 'Kotha needs the microphone for speaking practice. Allow it in your phone settings, or tap "Can\'t speak now".'
          : reason === 'unavailable'
            ? "Speech recognition isn't available here."
            : "I didn't catch that. Try again, a little louder.",
      );
    }
  };
  const reset = () => {
    setState('idle');
    setHeard('');
    setTries(0);
  };
  return { state, heard, message, tries, start, reset };
}

function Speak({ p, onDone, onCantSpeak }: { p: Phrase; onDone(r: SelfResult): void; onCantSpeak(): void }) {
  const { state, heard, message, tries, start } = useSpeechAttempt(p.bn);
  useAutoPlay(p.bn, p.ro);

  return (
    <div className="ex">
      <h2 className="ex-title">Say this out loud</h2>
      <div className="prompt">
        <Say bn={p.bn} />
        <BnText p={p} className="large" />
        <div className="muted">"{capital(p.en)}"</div>
      </div>
      <div className="speak-area">
        <button type="button" className={`mic ${state}`} onClick={start} disabled={state === 'listening' || state === 'good'}>
          {state === 'listening' ? '👂' : state === 'good' ? '✅' : '🎤'}
        </button>
        <div className="speak-status">
          {state === 'idle' && 'Tap the mic and speak'}
          {state === 'listening' && 'Listening…'}
          {state === 'good' && <span className="good-text">Sounded great!</span>}
          {state === 'bad' && (
            <span>
              <span className="bad-text">Not quite.</span> Listen again and have another go.
            </span>
          )}
          {state === 'error' && message}
        </div>
        {heard && (state === 'good' || state === 'bad') && <div className="heard small muted">I heard: {heard}</div>}
      </div>
      <div className="speak-actions">
        {state === 'good' && (
          <button type="button" className="btn success wide" onClick={() => onDone({ correct: 1, total: 1, right: [p] })}>
            Continue
          </button>
        )}
        {state !== 'good' && (tries >= 2 || state === 'error') && (
          <button type="button" className="btn ghost wide" onClick={() => onDone({ correct: 0, total: 0, skipped: true })}>
            Skip this one
          </button>
        )}
        {state !== 'good' && (
          <button
            type="button"
            className="btn link"
            onClick={() => {
              stopListening();
              onCantSpeak();
            }}
          >
            🔇 Can't speak now
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- role-play chat ----------

/** After picking the right reply, say it out loud before the conversation moves on. */
function SayReply({ line, onDone, onCantSpeak }: { line: ChatLine; onDone(): void; onCantSpeak(): void }) {
  const { state, heard, message, tries, start } = useSpeechAttempt(line.bn);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (state === 'good') {
      const t = setTimeout(() => done.current(), 700);
      return () => clearTimeout(t);
    }
  }, [state]);
  return (
    <div className="chat-say pop-up">
      <div className="small muted">Now say it out loud:</div>
      <div className="chat-say-row">
        <button type="button" className={`mic small-mic ${state}`} onClick={start} disabled={state === 'listening' || state === 'good'} aria-label="Speak">
          {state === 'listening' ? '👂' : state === 'good' ? '✅' : '🎤'}
        </button>
        <div className="grow">
          <div className="msg-ro">{line.ro}</div>
          <div className="small">
            {state === 'idle' && <span className="muted">Tap the mic, then speak</span>}
            {state === 'listening' && 'Listening…'}
            {state === 'good' && <span className="good-text">Sounded great!</span>}
            {state === 'bad' && <span className="bad-text">Not quite. Listen and try again{heard ? ` (I heard: ${heard})` : ''}</span>}
            {state === 'error' && message}
          </div>
        </div>
        <Say bn={line.bn} />
      </div>
      <div className="row gap">
        {(tries >= 2 || state === 'error') && state !== 'good' && (
          <button type="button" className="btn ghost small-btn" onClick={onDone}>
            Skip
          </button>
        )}
        <button type="button" className="btn link small" onClick={onCantSpeak}>
          🔇 Can't speak now
        </button>
      </div>
    </div>
  );
}

function ChatView({ chat, onDone, speakReplies, onCantSpeak }: { chat: Chat; onDone(r: SelfResult): void; speakReplies: boolean; onCantSpeak(): void }) {
  const [shown, setShown] = useState(0); // lines revealed
  const [saying, setSaying] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [wrongPick, setWrongPick] = useState<{ ro: string; en: string } | null>(null);
  const [reveal, setReveal] = useState<Set<number>>(new Set());
  const bottom = useRef<HTMLDivElement>(null);
  const firstTry = useRef(0);
  const triedThisLine = useRef(false);
  const youLines = chat.lines.filter((l) => l.who === 'you').length;

  const current: ChatLine | undefined = chat.lines[shown];
  const options = useMemo(
    () => (current?.who === 'you' ? shuffle([{ ro: current.ro, en: current.en, ok: true }, ...(current.wrong ?? []).map((w) => ({ ...w, ok: false }))]) : []),
    [current],
  );

  // Their lines appear (and are spoken) one after another.
  useEffect(() => {
    if (!current) return;
    if (current.who === 'them') {
      // Leave time for the previous line to be spoken before the next one starts.
      const prev = chat.lines[shown - 1];
      const t = setTimeout(() => setShown((s) => s + 1), prev ? 700 + prev.bn.length * 75 : 300);
      return () => clearTimeout(t);
    }
  }, [current, shown, chat.lines]);

  useEffect(() => {
    const line = chat.lines[shown - 1];
    if (line?.who === 'them') void speak(line.bn);
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [shown, chat.lines]);

  const choose = (o: { ro: string; en: string; ok: boolean }) => {
    if (!current) return;
    if (o.ok) {
      sfx.correct();
      if (!triedThisLine.current) firstTry.current++;
      triedThisLine.current = false;
      setWrongPick(null);
      void speak(current.bn);
      if (speakReplies) setSaying(true);
      else setShown((s) => s + 1);
    } else {
      sfx.wrong();
      triedThisLine.current = true;
      setMistakes((m) => m + 1);
      setWrongPick(o);
    }
  };

  const finished = shown >= chat.lines.length;

  return (
    <div className="ex chat">
      <div className="chat-head">
        <span className="chat-avatar">{chat.emoji}</span>
        <div>
          <div className="chat-with">{chat.with}</div>
          <div className="small muted">{chat.scene}</div>
        </div>
      </div>
      <div className="chat-log">
        {chat.lines.slice(0, shown).map((l, i) => (
          <div key={i} className={`msg ${l.who} pop-up`}>
            <div className="msg-bubble" onClick={() => setReveal((r) => new Set(r).add(i))}>
              <div className="msg-ro">
                <BnText p={l} />
              </div>
              {(l.who === 'you' || reveal.has(i)) ? <div className="msg-en">{l.en}</div> : <div className="msg-en hint">Tap to translate</div>}
            </div>
            <Say bn={l.bn} slow={l.who === 'them'} />
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {current?.who === 'you' && saying && (
        <SayReply
          key={shown}
          line={current}
          onDone={() => {
            setSaying(false);
            setShown((s) => s + 1);
          }}
          onCantSpeak={() => {
            setSaying(false);
            setShown((s) => s + 1);
            onCantSpeak();
          }}
        />
      )}
      {current?.who === 'you' && !saying && (
        <div className="chat-choices pop-up">
          <div className="small muted">Your reply:</div>
          {options.map((o) => (
            <button key={o.ro} type="button" className={`option ${wrongPick?.ro === o.ro ? 'shake bad' : ''}`} onClick={() => choose(o)}>
              <span className="option-text">{o.ro}</span>
            </button>
          ))}
          {wrongPick && (
            <div className="chat-wrong small">
              ❌ That means "<i>{wrongPick.en}</i>". Try another.
            </div>
          )}
        </div>
      )}
      {finished && (
        <button type="button" className="btn success wide pop-in" onClick={() => onDone({ correct: firstTry.current, total: youLines })}>
          {mistakes === 0 ? 'Perfect chat! Continue' : 'Continue'}
        </button>
      )}
    </div>
  );
}

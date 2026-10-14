import { useCallback, useEffect, useRef, useState } from 'react';
import { phraseKey, type Phrase } from '../content';
import { ExerciseView, type SelfResult } from '../components/Exercises';
import { BnText, capital, cheer, ProgressBar, Rich, Say, SylBridge } from '../components/ui';
import { checkAnswer, makeExercise, type Exercise } from '../engine/session';
import { tiles } from '../engine/text';
import { sfx } from '../sound';
import { speak, stopSpeaking } from '../speech';

export interface SessionSummary {
  correct: number;
  total: number;
  seconds: number;
  outcomes: Record<string, boolean>;
  bestCombo: number;
}

interface Props {
  exercises: Exercise[];
  colour: string;
  pool: Phrase[];
  /** Ask for role-play replies to be spoken out loud. */
  chatSpeak: boolean;
  onExit(): void;
  onFinish(s: SessionSummary): void;
}

const SELF_GRADED = new Set(['match', 'speak', 'chat']);
const UNGRADED = new Set(['guide', 'intro']);
const LISTENING = new Set(['listen-pick', 'listen-build']);

/** A replacement for a listening or speaking exercise when the learner can't do it right now. */
function fallback(ex: Exercise, pool: Phrase[]): Exercise {
  if (!('p' in ex)) return ex;
  return makeExercise(tiles(ex.p.ro).length >= 2 ? 'build-bn' : 'pick-en', ex.p, pool);
}

export function Session({ exercises, colour, pool, chatSpeak: initialChatSpeak, onExit, onFinish }: Props) {
  const [chatSpeak, setChatSpeak] = useState(initialChatSpeak);
  const [queue, setQueue] = useState(exercises);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<null | { correct: boolean; ex: Exercise }>(null);
  const [cheerLine, setCheerLine] = useState(cheer(true));
  const [quitting, setQuitting] = useState(false);
  const [combo, setCombo] = useState(0);

  const tally = useRef({ correct: 0, total: 0, bestCombo: 0 });
  const outcomes = useRef<Record<string, boolean>>({});
  const retries = useRef(new Set<string>());
  const started = useRef(Date.now());

  const ex = queue[idx];
  const gradedCount = queue.filter((e) => !UNGRADED.has(e.kind)).length;
  const gradedDone = queue.slice(0, idx).filter((e) => !UNGRADED.has(e.kind)).length;

  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    // Android back button (see App) asks before leaving.
    const onBack = () => setQuitting((q) => !q);
    window.addEventListener('kotha-back', onBack);
    return () => window.removeEventListener('kotha-back', onBack);
  }, []);

  const record = (p: Phrase, ok: boolean) => {
    const k = phraseKey(p);
    outcomes.current[k] = (outcomes.current[k] ?? true) && ok;
  };

  const bumpCombo = (ok: boolean) => {
    setCombo((c) => {
      const next = ok ? c + 1 : 0;
      if (ok && next > 0 && next % 5 === 0) sfx.combo();
      tally.current.bestCombo = Math.max(tally.current.bestCombo, next);
      return next;
    });
  };

  const advance = useCallback(() => {
    setFeedback(null);
    setAnswer(null);
    if (idx + 1 >= queue.length) {
      // Phrases that were only introduced still count as seen.
      for (const e of queue) if (e.kind === 'intro') outcomes.current[phraseKey(e.p)] ??= true;
      onFinish({
        ...tally.current,
        seconds: Math.round((Date.now() - started.current) / 1000),
        outcomes: outcomes.current,
      });
    } else {
      setIdx(idx + 1);
    }
  }, [idx, queue, onFinish]);

  const check = () => {
    if (!ex || answer === null || !('p' in ex)) return;
    const ok = checkAnswer(ex, answer);
    const first = !retries.current.has(ex.id);
    if (first) {
      tally.current.total++;
      if (ok) tally.current.correct++;
    }
    record(ex.p, ok);
    bumpCombo(ok);
    setCheerLine(cheer(ok));
    if (ok) {
      sfx.correct();
      if (ex.kind !== 'pick-bn' && ex.kind !== 'sylheti') void speak(ex.p.bn);
    } else {
      sfx.wrong();
      // Wrong answers come back at the end, so every lesson ends on a right answer.
      const again = makeExercise(ex.kind, ex.p, pool);
      retries.current.add(again.id);
      setQueue((q) => [...q, again]);
    }
    if (ex.kind === 'pick-bn' || ex.kind === 'sylheti') void speak(ex.p.bn);
    setFeedback({ correct: ok, ex });
  };

  const onDone = useCallback(
    (r: SelfResult) => {
      tally.current.total += r.total;
      tally.current.correct += r.correct;
      r.wrong?.forEach((p) => record(p, false));
      r.right?.forEach((p) => record(p, true));
      if (!r.skipped && r.total) bumpCombo(r.correct === r.total);
      advance();
    },
    [advance],
  );

  const cantListen = () => {
    setAnswer(null);
    setQueue((q) => q.map((e, i) => (i >= idx && LISTENING.has(e.kind) ? fallback(e, pool) : e)));
  };
  const cantSpeak = () => {
    setChatSpeak(false);
    setQueue((q) => q.map((e, i) => (i >= idx && e.kind === 'speak' ? fallback(e, pool) : e)));
  };

  if (!ex) return null;
  const graded = !UNGRADED.has(ex.kind) && !SELF_GRADED.has(ex.kind);

  return (
    <div className="session" style={{ ['--unit' as string]: colour }}>
      <div className="session-top">
        <button type="button" className="icon-btn" onClick={() => setQuitting(true)} aria-label="Quit">
          ✕
        </button>
        <ProgressBar value={gradedCount ? gradedDone / gradedCount : 0} colour={colour} />
        {combo >= 3 && <span className="combo pop-in">🔥{combo}</span>}
      </div>

      <div className="session-body">
        {retries.current.has(ex.id) && <div className="retry-tag">↺ Let's try that one again</div>}
        <ExerciseView key={ex.id} ex={ex} locked={!!feedback} onChange={setAnswer} onDone={onDone} onCantListen={cantListen} onCantSpeak={cantSpeak} chatSpeak={chatSpeak} />
      </div>

      {UNGRADED.has(ex.kind) && (
        <div className="session-foot">
          <button type="button" className="btn unit big wide" onClick={advance}>
            Continue
          </button>
        </div>
      )}

      {graded && !feedback && (
        <div className="session-foot">
          <button type="button" className="btn success big wide" disabled={answer === null} onClick={check}>
            Check
          </button>
        </div>
      )}

      {feedback && 'p' in feedback.ex && (
        <div className={`feedback ${feedback.correct ? 'good' : 'bad'} pop-up`}>
          <div className="feedback-head">
            <span className="feedback-icon">{feedback.correct ? '✅' : '❌'}</span>
            {feedback.correct ? (
              <span>
                <b>{cheerLine.ro}</b> <span className="small">({cheerLine.en})</span>
              </span>
            ) : (
              <b>Correct answer:</b>
            )}
          </div>
          <div className="feedback-phrase">
            <Say bn={feedback.ex.p.bn} />
            <div>
              <BnText p={feedback.ex.p} className="large" />
              <div className="feedback-en">{capital(feedback.ex.p.en)}</div>
            </div>
          </div>
          {feedback.ex.p.syl && feedback.ex.kind !== 'sylheti' && <SylBridge syl={feedback.ex.p.syl} />}
          {!feedback.correct && feedback.ex.p.tip && (
            <p className="small tip">
              <Rich text={feedback.ex.p.tip} />
            </p>
          )}
          <button type="button" className={`btn big wide ${feedback.correct ? 'success' : 'danger'}`} onClick={advance}>
            Continue
          </button>
        </div>
      )}

      {quitting && (
        <div className="modal-back" onClick={() => setQuitting(false)}>
          <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="big-emoji">🐯</div>
            <h3>Leave this lesson?</h3>
            <p className="muted">You'll lose your progress in this lesson.</p>
            <button type="button" className="btn success wide" onClick={() => setQuitting(false)}>
              Keep learning
            </button>
            <button type="button" className="btn link wide bad-text" onClick={onExit}>
              Quit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

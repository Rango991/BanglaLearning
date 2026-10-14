import { useState } from 'react';
import { Mascot } from '../components/ui';
import { checkVoice, speak } from '../speech';
import { useStore } from '../store';
import { VoiceHelp } from './Me';

export function Welcome({ voice, onVoiceChecked }: { voice?: boolean; onVoiceChecked(v: boolean): void }) {
  const { updateSettings, update } = useStore();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(20);

  return (
    <div className="welcome">
      {step === 0 && (
        <div className="pop-in">
          <div className="welcome-logo">কথা</div>
          <h1 className="center">Kotha</h1>
          <p className="center lead">Standard Bangla for people who grew up with Sylheti.</p>
          <Mascot mood="cheer">
            You already know loads. Sylheti and standard Bangla share most of their words, so we'll focus on the <b>swaps</b> and on <b>speaking and listening</b>. No writing, ever.
          </Mascot>
          <ul className="welcome-list">
            <li>🔁 Sylheti → Standard bridges on every phrase</li>
            <li>🎧 Listening, 🎤 speaking and 🧩 tap-the-words exercises</li>
            <li>💬 Role-play chats: aunties, rickshaws, bazaars</li>
            <li>🔥 Streaks, XP and spaced review</li>
          </ul>
          <button type="button" className="btn success big wide" onClick={() => setStep(1)}>
            Let's go
          </button>
        </div>
      )}
      {step === 1 && (
        <div className="pop-in">
          <h2 className="center">Can you hear me?</h2>
          <p className="center muted">Kotha uses your phone's Bangla voice to read every phrase aloud.</p>
          <button
            type="button"
            className="btn ghost big wide"
            onClick={async () => {
              onVoiceChecked(await checkVoice());
              await speak('আসসালামু আলাইকুম! কেমন আছেন?');
            }}
          >
            🔊 Tap to hear "assalamu alaikum! kemon achen?"
          </button>
          {voice === false && (
            <div className="card warn-card">
              <b>No Bangla voice found.</b> You can still start, but it's much better with sound:
              <VoiceHelp />
            </div>
          )}
          <button type="button" className="btn success big wide" onClick={() => setStep(2)}>
            {voice ? 'I heard it!' : 'Continue'}
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="pop-in">
          <h2 className="center">Pick a daily goal</h2>
          <p className="center muted">One lesson is about 15–25 XP and takes about 5 minutes.</p>
          <div className="options">
            {[
              [10, 'Casual', '~3 min a day'],
              [20, 'Regular', '~5 min a day'],
              [30, 'Serious', '~10 min a day'],
              [50, 'Intense', '~15 min a day'],
            ].map(([xp, name, time]) => (
              <button key={xp} type="button" className={`option ${goal === xp ? 'picked' : ''}`} onClick={() => setGoal(xp as number)}>
                <span className="option-text">
                  <b>{name}</b> · {time}
                </span>
                <span className="muted small">{xp} XP</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn success big wide"
            onClick={() => {
              updateSettings({ goal });
              update((p) => ({ ...p, started: true }));
            }}
          >
            Start learning
          </button>
        </div>
      )}
    </div>
  );
}

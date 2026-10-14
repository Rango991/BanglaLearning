import { useEffect } from 'react';
import { Confetti } from '../components/Confetti';
import { Mascot } from '../components/ui';
import { sfx } from '../sound';
import { speak } from '../speech';

export interface ResultInfo {
  title: string;
  xp: number;
  correct: number;
  total: number;
  seconds: number;
  bestCombo: number;
  streak: number;
  goalJustMet: boolean;
  newPhrases: number;
}

export function Results({ info, goal, onDone }: { info: ResultInfo; goal: number; onDone(): void }) {
  const accuracy = info.total ? Math.round((info.correct / info.total) * 100) : 100;
  const perfect = accuracy === 100;
  useEffect(() => {
    void speak(perfect ? 'শাবাশ! একদম পারফেক্ট!' : 'শাবাশ!');
    if (info.goalJustMet) setTimeout(() => sfx.fanfare(), 900);
  }, [perfect, info.goalJustMet]);

  const mins = Math.floor(info.seconds / 60);
  const secs = info.seconds % 60;
  return (
    <div className="results">
      <Confetti />
      <Mascot mood="cheer">
        <b>shabash!</b> {perfect ? 'Not a single mistake. Ekdom perfect!' : 'Lesson complete. Well done!'}
      </Mascot>
      <h1 className="center">{info.title}</h1>
      <div className="stat-row">
        <div className="stat gold">
          <div className="stat-label">XP</div>
          <div className="stat-value">+{info.xp}</div>
        </div>
        <div className="stat green">
          <div className="stat-label">Accuracy</div>
          <div className="stat-value">{accuracy}%</div>
        </div>
        <div className="stat blue">
          <div className="stat-label">Time</div>
          <div className="stat-value">
            {mins}:{String(secs).padStart(2, '0')}
          </div>
        </div>
      </div>
      {info.newPhrases > 0 && <p className="center">📚 {info.newPhrases} new phrases added to your practice.</p>}
      {info.bestCombo >= 5 && <p className="center">🔥 Best streak of right answers: {info.bestCombo}</p>}
      {info.goalJustMet && (
        <div className="card goal-card pop-in">
          🎯 <b>Daily goal done!</b> {goal} XP today. Your streak is now <b>{info.streak}</b> day{info.streak === 1 ? '' : 's'}.
        </div>
      )}
      <button type="button" className="btn success big wide" onClick={onDone}>
        Continue
      </button>
    </div>
  );
}

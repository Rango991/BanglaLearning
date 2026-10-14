import { phraseByKey } from '../content';
import { dueKeys } from '../engine/progress';
import type { PracticeMode } from '../engine/session';
import { Mascot } from '../components/ui';
import { useStore } from '../store';
import { Hud } from './Path';

export function Practice({ onStart, canSpeak }: { onStart(mode: PracticeMode): void; canSpeak: boolean }) {
  const { progress } = useStore();
  const known = Object.keys(progress.phrases).filter((k) => phraseByKey.has(k));
  const due = dueKeys(progress.phrases).filter((k) => phraseByKey.has(k)).length;
  const sylheti = known.filter((k) => phraseByKey.get(k)!.phrase.syl).length;

  if (known.length < 4) {
    return (
      <div className="page">
        <Hud />
        <Mascot mood="think">Finish a lesson or two first. Then the phrases you've learned will come back here to keep them fresh.</Mascot>
      </div>
    );
  }

  const modes: { mode: PracticeMode; icon: string; title: string; text: string; show: boolean }[] = [
    { mode: 'mixed', icon: '🧠', title: 'Smart review', text: due ? `${due} phrase${due === 1 ? '' : 's'} due for review` : 'Strengthen your weakest phrases', show: true },
    { mode: 'listen', icon: '🎧', title: 'Listening', text: 'Train your ear for Dhaka speed', show: true },
    { mode: 'speak', icon: '🎤', title: 'Speaking', text: 'Say phrases out loud and get marked', show: canSpeak },
    { mode: 'sylheti', icon: '🔁', title: 'Sylheti → Standard', text: 'Turn what you\'d say at home into standard Bangla', show: sylheti >= 3 },
  ];

  return (
    <div className="page">
      <Hud />
      <h2>Practice</h2>
      <p className="muted">
        You know <b>{known.length}</b> phrases. Each one comes back after 1, 3, 7, 14 and 30 days, and sooner if you get it wrong.
      </p>
      <div className="practice-grid">
        {modes
          .filter((m) => m.show)
          .map((m) => (
            <button key={m.mode} type="button" className={`card practice-card ${m.mode === 'mixed' && due ? 'hot' : ''}`} onClick={() => onStart(m.mode)}>
              <span className="practice-icon">{m.icon}</span>
              <span>
                <b>{m.title}</b>
                <span className="small muted block">{m.text}</span>
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { addDays, backupCode, dayKey, defaultProgress, restoreCode, streak } from '../engine/progress';
import { askReminderPermission } from '../reminders';
import { Say } from '../components/ui';
import { checkVoice, openVoiceInstall } from '../speech';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store';

export function VoiceHelp() {
  return (
    <ol className="small voice-help">
      <li>
        Open <b>Settings</b> on your phone and search for <b>Text-to-speech</b>.
      </li>
      <li>
        Set the engine to <b>Speech Services by Google</b>. If it's missing, install it from the Play Store.
      </li>
      <li>
        Tap ⚙️ next to it, then <b>Install voice data</b>, then <b>Bangla (Bangladesh)</b>, and download it.
      </li>
      <li>Come back here and tap <b>Test voice</b>.</li>
    </ol>
  );
}

export function Me({ voice, onVoiceChecked, micOk }: { voice?: boolean; onVoiceChecked(v: boolean): void; micOk: boolean }) {
  const { progress, updateSettings, update } = useStore();
  const [resetting, setResetting] = useState(false);
  const [backup, setBackup] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [pasted, setPasted] = useState('');
  const [note, setNote] = useState('');
  const s = progress.settings;
  const today = dayKey();
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const maxXp = Math.max(s.goal, ...week.map((d) => progress.days[d] ?? 0));
  const minutes = week.reduce((sum, d) => sum + (progress.minutes[d] ?? 0), 0);
  const learned = Object.keys(progress.phrases).length;
  const strong = Object.values(progress.phrases).filter((p) => p.box >= 3).length;

  return (
    <div className="page">
      <h2>🐯 Your progress</h2>
      <div className="stat-row">
        <div className="stat orange">
          <div className="stat-label">Streak</div>
          <div className="stat-value">🔥 {streak(progress.days)}</div>
        </div>
        <div className="stat gold">
          <div className="stat-label">Total XP</div>
          <div className="stat-value">{progress.xp}</div>
        </div>
        <div className="stat green">
          <div className="stat-label">Phrases</div>
          <div className="stat-value">{learned}</div>
        </div>
      </div>
      <p className="small muted center">
        {strong} phrases well known · {Math.round(minutes)} min studied this week
      </p>

      <div className="card">
        <b>Last 7 days</b>
        <div className="week">
          {week.map((d) => {
            const xp = progress.days[d] ?? 0;
            return (
              <div key={d} className="week-col">
                <div className="week-bar-wrap">
                  <div className={`week-bar ${xp >= s.goal ? 'met' : ''}`} style={{ height: `${(xp / maxXp) * 100}%` }} />
                </div>
                <div className="small muted">{new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'narrow' })}</div>
              </div>
            );
          })}
        </div>
      </div>

      <h3>Voice</h3>
      <div className="card">
        <div className="row">
          <span className="grow">
            {voice === undefined ? 'Checking…' : voice ? '✅ Bangla voice found' : '🔇 No Bangla voice found'}
          </span>
          <Say bn="আসসালামু আলাইকুম, কেমন আছেন?" />
        </div>
        <div className="row gap">
          <button type="button" className="btn ghost small-btn" onClick={() => void checkVoice().then(onVoiceChecked)}>
            Test voice
          </button>
          {Capacitor.isNativePlatform() && (
            <button type="button" className="btn ghost small-btn" onClick={() => void openVoiceInstall()}>
              Install voice data
            </button>
          )}
        </div>
        {voice === false && <VoiceHelp />}
        <label className="setting">
          <span>Voice speed</span>
          <input type="range" min={0.6} max={1.2} step={0.05} value={s.rate} onChange={(e) => updateSettings({ rate: Number(e.target.value) })} />
        </label>
      </div>

      <h3>Settings</h3>
      <div className="card">
        <label className="setting">
          <span>
            Daily goal
            <span className="small muted block">XP per day to keep your streak happy</span>
          </span>
          <select value={s.goal} onChange={(e) => updateSettings({ goal: Number(e.target.value) })}>
            <option value={10}>Casual · 10</option>
            <option value={20}>Regular · 20</option>
            <option value={30}>Serious · 30</option>
            <option value={50}>Intense · 50</option>
          </select>
        </label>
        <label className="setting">
          <span>
            Show Bengali script
            <span className="small muted block">Optional: see the written form under the spelling</span>
          </span>
          <input type="checkbox" checked={s.script} onChange={(e) => updateSettings({ script: e.target.checked })} />
        </label>
        <label className="setting">
          <span>
            Speaking exercises
            <span className="small muted block">{micOk ? 'Uses the microphone and Google speech recognition' : "Speech recognition isn't available on this device"}</span>
          </span>
          <input type="checkbox" checked={s.speak && micOk} disabled={!micOk} onChange={(e) => updateSettings({ speak: e.target.checked })} />
        </label>
        <label className="setting">
          <span>
            Speak your replies in chats
            <span className="small muted block">After picking a reply in a role-play, say it out loud</span>
          </span>
          <input type="checkbox" checked={s.chatSpeak && s.speak && micOk} disabled={!micOk || !s.speak} onChange={(e) => updateSettings({ chatSpeak: e.target.checked })} />
        </label>
        <label className="setting">
          <span>Sound effects</span>
          <input type="checkbox" checked={s.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} />
        </label>
      </div>

      {Capacitor.isNativePlatform() && (
        <>
          <h3>Reminders</h3>
          <div className="card">
            <label className="setting">
              <span>
                Daily reminder
                <span className="small muted block">With a phrase of the day. Skips days you've hit your goal.</span>
              </span>
              <input
                type="checkbox"
                checked={s.reminder}
                onChange={async (e) => {
                  if (!e.target.checked) return updateSettings({ reminder: false, reminderAsked: true });
                  const ok = await askReminderPermission();
                  updateSettings({ reminder: ok, reminderAsked: true });
                  if (!ok) setNote('Notifications are blocked. Allow them for Kotha in your phone settings.');
                }}
              />
            </label>
            {s.reminder && (
              <label className="setting">
                <span>Remind me at</span>
                <input type="time" className="time-input" value={s.reminderTime} onChange={(e) => e.target.value && updateSettings({ reminderTime: e.target.value })} />
              </label>
            )}
          </div>
        </>
      )}

      <h3>Back up progress</h3>
      <div className="card">
        <p className="small muted">
          Save this code somewhere safe (e.g. email it to yourself). Paste it back here after reinstalling or on a new phone to get your progress back.
        </p>
        <div className="row gap">
          <button
            type="button"
            className="btn ghost small-btn"
            onClick={async () => {
              const code = backupCode(progress);
              setBackup(code);
              try {
                await navigator.clipboard.writeText(code);
                setNote('Backup code copied. Paste it somewhere safe.');
              } catch {
                setNote('Copy the code below and keep it somewhere safe.');
              }
            }}
          >
            📋 Copy backup code
          </button>
          <button type="button" className="btn ghost small-btn" onClick={() => setRestoring((r) => !r)}>
            ♻️ Restore
          </button>
        </div>
        {backup && <textarea className="code-box" readOnly value={backup} onFocus={(e) => e.target.select()} />}
        {restoring && (
          <>
            <textarea className="code-box" placeholder="Paste your KOTHA1:… code here" value={pasted} onChange={(e) => setPasted(e.target.value)} />
            <button
              type="button"
              className="btn success small-btn"
              disabled={!pasted.trim()}
              onClick={() => {
                const restored = restoreCode(pasted);
                if (!restored) return setNote("That code doesn't look right. Check you copied all of it.");
                update(() => restored);
                setRestoring(false);
                setPasted('');
                setNote(`Restored! ${restored.xp} XP and ${Object.keys(restored.phrases).length} phrases are back.`);
              }}
            >
              Restore this code
            </button>
          </>
        )}
      </div>
      {note && <p className="small center good-text">{note}</p>}

      <h3>About</h3>
      <div className="card small">
        <p>
          Kotha teaches the standard spoken Bangla of Bangladesh (the kind you hear in Dhaka and on TV) to people who grew up speaking Sylheti.
        </p>
        <p className="muted">
          Sylheti varies from village to village, so the "Sylheti" forms shown are typical ones. Your family might say things a little differently, and that's fine!
        </p>
      </div>

      {!resetting ? (
        <button type="button" className="btn link wide" onClick={() => setResetting(true)}>
          Reset all progress
        </button>
      ) : (
        <div className="card center">
          <p>
            <b>Delete all your progress?</b> This can't be undone.
          </p>
          <div className="row gap">
            <button type="button" className="btn ghost grow" onClick={() => setResetting(false)}>
              Cancel
            </button>
            <button type="button" className="btn danger grow" onClick={() => update(() => ({ ...defaultProgress(), started: true, settings: s }))}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

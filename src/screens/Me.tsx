import { useState } from 'react';
import { addDays, dayKey, defaultProgress, streak } from '../engine/progress';
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
          <span>Sound effects</span>
          <input type="checkbox" checked={s.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} />
        </label>
      </div>

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

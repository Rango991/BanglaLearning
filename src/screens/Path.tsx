import { useState } from 'react';
import { units, type Lesson, type Unit } from '../content';
import { dayKey, streak } from '../engine/progress';
import { Mascot, ProgressBar } from '../components/ui';
import { askReminderPermission } from '../reminders';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store';

export function Hud() {
  const { progress } = useStore();
  const today = progress.days[dayKey()] ?? 0;
  const s = streak(progress.days);
  const goal = progress.settings.goal;
  return (
    <header className="hud">
      <div className="hud-brand">
        <span className="logo">কথা</span>
        <span className="logo-ro">Kotha</span>
      </div>
      <div className={`hud-chip ${s > 0 && today > 0 ? 'fire' : ''}`} title="Day streak">
        🔥 {s}
      </div>
      <div className="hud-goal" title="Today's goal">
        <span>⚡ {Math.min(today, goal)}/{goal}</span>
        <ProgressBar value={today / goal} colour="var(--gold)" />
      </div>
    </header>
  );
}

const OFFSETS = [0, 52, 76, 52, 0, -52, -76, -52];

function ReminderOffer() {
  const { progress, updateSettings } = useStore();
  const done = Object.keys(progress.lessons).length;
  if (!Capacitor.isNativePlatform() || progress.settings.reminderAsked || progress.settings.reminder || done < 2) return null;
  return (
    <div className="card offer-card pop-in">
      <b>🔔 Want a daily nudge?</b>
      <p className="small">A little reminder each evening with a phrase of the day. It skips days you've already hit your goal.</p>
      <div className="row gap">
        <button
          type="button"
          className="btn success small-btn"
          onClick={async () => {
            const ok = await askReminderPermission();
            updateSettings({ reminderAsked: true, reminder: ok });
          }}
        >
          Yes, at 7pm
        </button>
        <button type="button" className="btn ghost small-btn" onClick={() => updateSettings({ reminderAsked: true })}>
          No thanks
        </button>
      </div>
    </div>
  );
}

export function Path({ onStart, next, voice, onFixVoice, onSetupProfile }: {
  onStart(id: string): void;
  next?: string;
  voice?: boolean;
  onFixVoice(): void;
  onSetupProfile(): void;
}) {
  const { progress } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  let n = 0;

  return (
    <div className="page">
      <Hud />
      {voice === false && (
        <div className="card warn-card" onClick={onFixVoice}>
          <b>🔇 No Bangla voice on this phone yet</b>
          <p className="small">Lessons need it to read phrases aloud. Tap to see how to switch it on (it takes a minute).</p>
        </div>
      )}
      {!progress.profile && Object.keys(progress.lessons).length > 0 && (
        <div className="card profile-card pop-in" onClick={onSetupProfile}>
          <b>🪪 Make the role-plays about you</b>
          <p className="small">Add your name, age, where you live and where your family's from. The conversations and a whole new unit will use them.</p>
        </div>
      )}
      <ReminderOffer />
      {!Object.keys(progress.lessons).length && (
        <Mascot mood="cheer">
          <b>Assalamu alaikum!</b> You already speak Sylheti, so you're halfway there. Let's swap it for standard Bangla. Tap <b>Start</b>.
        </Mascot>
      )}
      {units.map((unit) => (
        <UnitBlock key={unit.id} unit={unit}>
          <div className="path">
            {unit.lessons.map((lesson) => {
              const offset = OFFSETS[n++ % OFFSETS.length];
              return (
                <LessonNode
                  key={lesson.id}
                  unit={unit}
                  lesson={lesson}
                  offset={offset}
                  done={progress.lessons[lesson.id] ?? 0}
                  isNext={lesson.id === next}
                  open={open === lesson.id}
                  onToggle={() => setOpen(open === lesson.id ? null : lesson.id)}
                  onStart={() => onStart(lesson.id)}
                />
              );
            })}
          </div>
        </UnitBlock>
      ))}
      <div className="path-end">
        <Mascot>That's the whole course. Keep it fresh in <b>Practice</b>, and go and chat to your khala!</Mascot>
      </div>
    </div>
  );
}

function UnitBlock({ unit, children }: { unit: Unit; children: React.ReactNode }) {
  const { progress } = useStore();
  const done = unit.lessons.filter((l) => progress.lessons[l.id]).length;
  return (
    <section className="unit" style={{ ['--unit' as string]: unit.colour }}>
      <div className="unit-banner">
        <div className="unit-text">
          <div className="unit-title">
            {unit.emoji} {unit.title}
          </div>
          <div className="unit-blurb">{unit.blurb}</div>
        </div>
        <div className="unit-count">
          {done}/{unit.lessons.length}
        </div>
      </div>
      {children}
    </section>
  );
}

function LessonNode({ unit, lesson, offset, done, isNext, open, onToggle, onStart }: {
  unit: Unit;
  lesson: Lesson;
  offset: number;
  done: number;
  isNext: boolean;
  open: boolean;
  onToggle(): void;
  onStart(): void;
}) {
  return (
    <div className="node-wrap" style={{ transform: `translateX(${offset}px)` }}>
      {isNext && !open && <div className="node-start">START</div>}
      <button type="button" className={`node ${done ? 'done' : ''} ${isNext ? 'next' : ''}`} onClick={onToggle} aria-label={lesson.title}>
        <span className="node-emoji">{lesson.emoji}</span>
        {done > 0 && <span className="node-badge">{done > 1 ? `×${done}` : '✓'}</span>}
      </button>
      {open && (
        <div className="node-pop pop-in" style={{ ['--unit' as string]: unit.colour }}>
          <div className="node-pop-title">{lesson.title}</div>
          <div className="small">
            {lesson.phrases.length} phrases{lesson.chat ? ' · 💬 role-play' : ''}
          </div>
          <button type="button" className="btn ghost wide" onClick={onStart}>
            {done ? 'Practise again (+XP)' : 'Start'}
          </button>
        </div>
      )}
    </div>
  );
}

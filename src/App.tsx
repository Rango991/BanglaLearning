import { useCallback, useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { lessonById, lessonList, personaliseLesson, personalisePhrase, phraseByKey, phraseKey, type Phrase, type Profile } from './content';
import { dayKey, dueKeys, sessionXp, streak, weakestKeys } from './engine/progress';
import { lessonSession, practiceSession, type Abilities, type Exercise, type PracticeMode } from './engine/session';
import { shuffle } from './engine/text';
import { Session, type SessionSummary } from './screens/Session';
import { Results, type ResultInfo } from './screens/Results';
import { Path } from './screens/Path';
import { Practice } from './screens/Practice';
import { Phrasebook } from './screens/Phrasebook';
import { Me } from './screens/Me';
import { Welcome } from './screens/Welcome';
import { sfx } from './sound';
import { canListen, checkVoice } from './speech';
import { scheduleReminders } from './reminders';
import { useStore } from './store';

export type Tab = 'learn' | 'practice' | 'phrases' | 'me';

interface ActiveSession {
  exercises: Exercise[];
  colour: string;
  pool: Phrase[];
  lessonId?: string;
  title: string;
}

/** Phrases to draw wrong options and spare tiles from: same unit first, then everything already learned. */
function poolFor(lessonId: string | undefined, learned: Set<string>, profile: Profile | undefined): Phrase[] {
  const ref = lessonId ? lessonById.get(lessonId) : undefined;
  const sameUnit = ref ? ref.unit.lessons.flatMap((l) => l.phrases) : [];
  const learnedPhrases = lessonList.filter((r) => learned.has(r.lesson.id)).flatMap((r) => r.lesson.phrases);
  const rest = lessonList.flatMap((r) => r.lesson.phrases);
  return [...new Set([...sameUnit, ...shuffle(learnedPhrases), ...shuffle(rest)])].map((p) => personalisePhrase(p, profile, phraseKey(p)));
}

export function App() {
  const { progress, finishSession } = useStore();
  const [tab, setTab] = useState<Tab>('learn');
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [voice, setVoice] = useState<boolean | undefined>(undefined);
  const [micOk, setMicOk] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    void checkVoice().then(setVoice);
    void canListen().then(setMicOk);
  }, []);

  // Re-plan the week's reminders whenever progress changes (e.g. today's goal is met).
  useEffect(() => {
    void scheduleReminders(progress);
  }, [progress]);

  const abilities: Abilities = { speak: progress.settings.speak && micOk, listen: voice !== false };
  const learned = new Set(Object.keys(progress.lessons).filter((id) => progress.lessons[id] > 0));

  // Android back button: leave a lesson (after confirming), go back to the path, then exit.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapApp.addListener('backButton', () => {
      if (active) window.dispatchEvent(new Event('kotha-back'));
      else if (result) setResult(null);
      else if (tab !== 'learn') setTab('learn');
      else void CapApp.exitApp();
    });
    return () => void handle.then((h) => h.remove());
  }, [active, result, tab]);

  const startLesson = (lessonId: string) => {
    const ref = lessonById.get(lessonId);
    if (!ref) return;
    const pool = poolFor(lessonId, learned, progress.profile);
    const lesson = personaliseLesson(ref.lesson, progress.profile, phraseKey);
    const exercises = lessonSession(lesson, {
      ...abilities,
      firstTime: !progress.lessons[lessonId],
      pool,
      isKnown: (p) => !!progress.phrases[phraseKey(p)],
    });
    setActive({ exercises, pool, colour: ref.unit.colour, lessonId, title: ref.lesson.title });
  };

  const startPractice = (mode: PracticeMode) => {
    const known = Object.keys(progress.phrases).filter((k) => phraseByKey.has(k));
    const eligible = (k: string) => {
      const p = phraseByKey.get(k)!.phrase;
      return mode === 'sylheti' ? !!p.syl : true;
    };
    const due = dueKeys(progress.phrases).filter((k) => known.includes(k) && eligible(k));
    const weak = weakestKeys(progress.phrases).filter((k) => known.includes(k) && eligible(k) && !due.includes(k));
    const keys = [...due, ...weak].slice(0, mode === 'mixed' ? 10 : 8);
    const targets = shuffle(keys.map((k) => personalisePhrase(phraseByKey.get(k)!.phrase, progress.profile, k)));
    if (!targets.length) return;
    const pool = poolFor(undefined, learned, progress.profile);
    setActive({
      exercises: practiceSession(targets, pool, mode, abilities),
      pool,
      colour: '#0b8a5b',
      title: 'Practice',
    });
  };

  const onFinish = useCallback(
    (s: SessionSummary) => {
      if (!active) return;
      const kind = active.lessonId ? 'lesson' : 'practice';
      const xp = sessionXp(kind, s.correct, s.total);
      const today = dayKey();
      const before = progress.days[today] ?? 0;
      finishSession({ lessonId: active.lessonId, outcomes: s.outcomes, xp, minutes: Math.min(30, s.seconds / 60) });
      const goal = progress.settings.goal;
      sfx.complete();
      setResult({
        title: active.title,
        xp,
        correct: s.correct,
        total: s.total,
        seconds: s.seconds,
        bestCombo: s.bestCombo,
        streak: streak({ ...progress.days, [today]: before + xp }),
        goalJustMet: before < goal && before + xp >= goal,
        newPhrases: Object.keys(s.outcomes).filter((k) => !progress.phrases[k]).length,
      });
      setActive(null);
    },
    [active, progress, finishSession],
  );

  if (!progress.started) return <Welcome voice={voice} onVoiceChecked={setVoice} />;

  if (active) {
    return <Session exercises={active.exercises} colour={active.colour} pool={active.pool} chatSpeak={abilities.speak && progress.settings.chatSpeak} onExit={() => setActive(null)} onFinish={onFinish} />;
  }

  if (result) return <Results info={result} goal={progress.settings.goal} onDone={() => setResult(null)} />;

  const nextLesson = lessonList.find((r) => !progress.lessons[r.lesson.id]);

  return (
    <div className="app">
      <main className="main">
        {tab === 'learn' && (
          <Path
            onStart={startLesson}
            next={nextLesson?.lesson.id}
            voice={voice}
            onFixVoice={() => setTab('me')}
            onSetupProfile={() => {
              setEditingProfile(true);
              setTab('me');
            }}
          />
        )}
        {tab === 'practice' && <Practice onStart={startPractice} canSpeak={abilities.speak} />}
        {tab === 'phrases' && <Phrasebook />}
        {tab === 'me' && <Me voice={voice} onVoiceChecked={setVoice} micOk={micOk} editingProfile={editingProfile} setEditingProfile={setEditingProfile} />}
      </main>
      <nav className="tabs">
        {(
          [
            ['learn', '🏠', 'Learn'],
            ['practice', '🏋🏽', 'Practice'],
            ['phrases', '📖', 'Phrases'],
            ['me', '🐯', 'Me'],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            className={`tab ${tab === id ? 'on' : ''}`}
            onClick={() => {
              setEditingProfile(false);
              setTab(id);
            }}
          >
            <span className="tab-icon">{icon}</span>
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}


import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyResult, load, save, type Progress, type SessionResult, type Settings } from './engine/progress';
import { setSoundEnabled } from './sound';
import { setSpeechRate } from './speech';

interface Store {
  progress: Progress;
  finishSession(r: SessionResult): void;
  updateSettings(s: Partial<Settings>): void;
  update(fn: (p: Progress) => Progress): void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(load);

  useEffect(() => save(progress), [progress]);
  useEffect(() => {
    setSoundEnabled(progress.settings.sound);
    setSpeechRate(progress.settings.rate);
  }, [progress.settings.sound, progress.settings.rate]);

  const update = useCallback((fn: (p: Progress) => Progress) => setProgress(fn), []);
  const finishSession = useCallback((r: SessionResult) => setProgress((p) => applyResult(p, r)), []);
  const updateSettings = useCallback(
    (s: Partial<Settings>) => setProgress((p) => ({ ...p, settings: { ...p.settings, ...s } })),
    [],
  );

  const value = useMemo(() => ({ progress, finishSession, updateSettings, update }), [progress, finishSession, updateSettings, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

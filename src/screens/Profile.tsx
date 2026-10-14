import { useState } from 'react';
import { CITIES, defaultProfile, HOMES, JOBS, nameToBengali, type Married, type Profile } from '../content';
import { Say } from '../components/ui';

const OTHER = '__other';

function PlacePicker({ value, options, onChange, otherLabel }: { value: string; options: Record<string, { en: string }>; onChange(v: string): void; otherLabel: string }) {
  const known = value in options;
  const [other, setOther] = useState(!known);
  return (
    <>
      <select
        value={other ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOther(true);
            onChange('');
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v.en}
          </option>
        ))}
        <option value={OTHER}>Somewhere else…</option>
      </select>
      {other && <input type="text" placeholder={otherLabel} value={known ? '' : value} onChange={(e) => onChange(e.target.value)} />}
    </>
  );
}

function Stepper({ value, onChange }: { value: number; onChange(n: number): void }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label="Fewer">
        −
      </button>
      <b>{value}</b>
      <button type="button" onClick={() => onChange(Math.min(6, value + 1))} aria-label="More">
        +
      </button>
    </span>
  );
}

/** The learner's details, used to make role-plays and the "About you" unit personal. */
export function ProfileEditor({ initial, onSave, onCancel, saveLabel = 'Save' }: { initial?: Profile; onSave(p: Profile): void; onCancel?(): void; saveLabel?: string }) {
  const [p, setP] = useState<Profile>(initial ?? { ...defaultProfile, name: '', nameBn: '' });
  const set = (patch: Partial<Profile>) => setP((old) => ({ ...old, ...patch }));
  const nameBn = nameToBengali(p.name);
  const valid = p.name.trim() && p.city.trim() && p.home.trim() && p.age >= 10 && p.age <= 99;

  return (
    <div className="profile-form">
      <label className="field">
        <span>Your name</span>
        <input type="text" value={p.name} placeholder="e.g. Fahim" onChange={(e) => set({ name: e.target.value })} />
        {p.name.trim() && (
          <span className="name-preview small">
            <Say bn={nameBn} slow={false} />
            <span>
              <span className="script">{nameBn}</span>
              <span className="muted block">Tap to hear it. If it sounds off, try another spelling (e.g. Faheem).</span>
            </span>
          </span>
        )}
      </label>
      <div className="field">
        <span>Relatives would call you…</span>
        <div className="chips">
          <button type="button" className={`chip ${p.gender === 'm' ? 'on' : ''}`} onClick={() => set({ gender: 'm' })}>
            bhaiya (a son)
          </button>
          <button type="button" className={`chip ${p.gender === 'f' ? 'on' : ''}`} onClick={() => set({ gender: 'f' })}>
            apu (a daughter)
          </button>
        </div>
      </div>
      <label className="field">
        <span>Age</span>
        <input type="number" min={10} max={99} value={p.age || ''} onChange={(e) => set({ age: Number(e.target.value) })} />
      </label>
      <label className="field">
        <span>Where you live in the UK</span>
        <PlacePicker value={p.city} options={CITIES} onChange={(city) => set({ city })} otherLabel="Town or city, e.g. Glasgow" />
      </label>
      <label className="field">
        <span>Where your family is from</span>
        <PlacePicker value={p.home} options={HOMES} onChange={(home) => set({ home })} otherLabel="e.g. Comilla" />
      </label>
      <label className="field">
        <span>What you do</span>
        <select value={p.job} onChange={(e) => set({ job: e.target.value })}>
          {Object.entries(JOBS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span>Married?</span>
        <div className="chips">
          {(['single', 'engaged', 'married'] as Married[]).map((m) => (
            <button key={m} type="button" className={`chip ${p.married === m ? 'on' : ''}`} onClick={() => set({ married: m })}>
              {m === 'single' ? 'Not yet' : m === 'engaged' ? 'Engaged' : 'Married'}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Brothers and sisters</span>
        <div className="row gap">
          <span className="grow">Brothers</span>
          <Stepper value={p.brothers} onChange={(brothers) => set({ brothers })} />
        </div>
        <div className="row gap">
          <span className="grow">Sisters</span>
          <Stepper value={p.sisters} onChange={(sisters) => set({ sisters })} />
        </div>
      </div>
      <p className="small muted">This stays on your phone. It's only used to make the lessons about you.</p>
      <button type="button" className="btn success wide" disabled={!valid} onClick={() => onSave({ ...p, name: p.name.trim(), nameBn, city: p.city.trim(), home: p.home.trim() })}>
        {saveLabel}
      </button>
      {onCancel && (
        <button type="button" className="btn link wide" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}

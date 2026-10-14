import { useMemo, useState } from 'react';
import { personalisePhrase, phraseKey, units } from '../content';
import { norm } from '../engine/text';
import { BnText, capital, Rich, Say, SlangTag } from '../components/ui';
import { useStore } from '../store';

/** Every phrase in the course, searchable, with audio: a pocket phrasebook for real conversations. */
export function Phrasebook() {
  const { progress } = useStore();
  const [q, setQ] = useState('');
  const [learnedOnly, setLearnedOnly] = useState(false);
  const [slangOnly, setSlangOnly] = useState(false);
  const [view, setView] = useState<'phrases' | 'grammar'>('phrases');
  const query = norm(q);

  const sections = useMemo(
    () =>
      units
        .map((unit) => ({
          unit,
          phrases: unit.lessons
            .flatMap((l) => l.phrases)
            .map((p) => personalisePhrase(p, progress.profile, phraseKey(p)))
            .filter((p) => !learnedOnly || progress.phrases[phraseKey(p)])
            .filter((p) => !slangOnly || p.slang)
            .filter((p) => !query || [p.ro, p.en, p.syl ?? '', ...(p.alt ?? [])].some((s) => norm(s).includes(query))),
        }))
        .filter((s) => s.phrases.length),
    [query, learnedOnly, slangOnly, progress.phrases, progress.profile],
  );

  const toggle = (
    <div className="seg">
      <button type="button" className={view === 'phrases' ? 'on' : ''} onClick={() => setView('phrases')}>
        💬 Phrases
      </button>
      <button type="button" className={view === 'grammar' ? 'on' : ''} onClick={() => setView('grammar')}>
        💡 Grammar notes
      </button>
    </div>
  );

  if (view === 'grammar') {
    return (
      <div className="page">
        <h2>📖 Phrasebook</h2>
        {toggle}
        <p className="small muted">Every tip from the lessons in one place. Handy before a phone call home.</p>
        {units.map((unit) => {
          const guides = unit.lessons.filter((l) => l.guide);
          if (!guides.length) return null;
          return (
            <section key={unit.id} className="pb-section">
              <h3 style={{ color: unit.colour }}>
                {unit.emoji} {unit.title}
              </h3>
              {guides.map((l) => (
                <details key={l.id} className="card grammar-card">
                  <summary>
                    <b>{l.guide!.title}</b>
                  </summary>
                  {l.guide!.body.map((line, i) => (
                    <p key={i} className="small">
                      <Rich text={line} />
                    </p>
                  ))}
                </details>
              ))}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="page">
      <h2>📖 Phrasebook</h2>
      {toggle}
      <input className="search" placeholder="Search English, Bangla or Sylheti…" value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="check-row small">
        <input type="checkbox" checked={learnedOnly} onChange={(e) => setLearnedOnly(e.target.checked)} /> Only phrases I've learned
      </label>
      <label className="check-row small">
        <input type="checkbox" checked={slangOnly} onChange={(e) => setSlangOnly(e.target.checked)} /> 🔥 Only slang
      </label>
      {!sections.length && <p className="muted center">Nothing found.</p>}
      {sections.map(({ unit, phrases }) => (
        <section key={unit.id} className="pb-section">
          <h3 style={{ color: unit.colour }}>
            {unit.emoji} {unit.title}
          </h3>
          {phrases.map((p) => {
            const stat = progress.phrases[phraseKey(p)];
            return (
              <div key={p.ro} className="pb-row">
                <Say bn={p.bn} />
                <div className="grow">
                  <BnText p={p} />
                  <div className="small muted">{capital(p.en)}</div>
                  {p.syl && <div className="small syl-inline">Sylheti: {p.syl}</div>}
                  {p.slang && <SlangTag />}
                </div>
                {stat && (
                  <span className="strength" title="How well you know it">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <i key={i} className={i <= Math.max(1, stat.box) ? 'on' : ''} />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

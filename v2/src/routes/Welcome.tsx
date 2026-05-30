import { Link } from 'react-router-dom';
import { useMatchStore } from '@/store';

export function WelcomeRoute() {
  const status = useMatchStore((s) => s.status);
  const engine = useMatchStore((s) => s.engine);
  const resumeTo =
    status === 'active' && engine ? `/hole/${engine.currentHole}` : status === 'finished' ? '/settlement' : null;
  return (
    <div className="pt-6 sm:pt-10">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-brass-deep)] mb-2">
          Established 2026
        </p>
        <h1 className="text-[40px] sm:text-[52px] leading-[0.95] font-[var(--font-display)] font-semibold tracking-[-0.02em]">
          The Millbrook
          <br />
          <span className="text-[var(--color-fairway)]">scorekeeper.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-ink-soft)] max-w-prose">
          A faithful, offline-first ledger for the side match, junk, and the Big Game —
          built to settle in pencil what used to take a spreadsheet.
        </p>
      </header>

      <section className="grid gap-3">
        <Link
          to="/setup"
          className="paper-card group flex items-center justify-between px-5 py-4 hover:shadow-[var(--shadow-lift)] transition"
        >
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-brass-deep)]">
              Start
            </div>
            <div className="font-[var(--font-display)] text-2xl">New round</div>
          </div>
          <Chevron />
        </Link>

        {resumeTo ? (
          <Link
            to={resumeTo}
            className="paper-card flex items-center justify-between px-5 py-4 hover:shadow-[var(--shadow-lift)] transition"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-brass-deep)]">
                In progress
              </div>
              <div className="font-[var(--font-display)] text-2xl">
                {status === 'finished'
                  ? 'Settle the round'
                  : `Resume — hole ${engine?.currentHole ?? 1}`}
              </div>
            </div>
            <Chevron />
          </Link>
        ) : null}

        <div className="grid grid-cols-3 gap-2 mt-2">
          <Link
            to="/roster"
            className="paper-card px-3 py-3 hover:shadow-[var(--shadow-lift)] transition"
          >
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
              Players
            </div>
            <div className="font-[var(--font-display)] text-base">Roster</div>
          </Link>
          <Link
            to="/courses"
            className="paper-card px-3 py-3 hover:shadow-[var(--shadow-lift)] transition"
          >
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
              Library
            </div>
            <div className="font-[var(--font-display)] text-base">Courses</div>
          </Link>
          <Link
            to="/history"
            className="paper-card px-3 py-3 hover:shadow-[var(--shadow-lift)] transition"
          >
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
              Archive
            </div>
            <div className="font-[var(--font-display)] text-base">History</div>
          </Link>
        </div>
      </section>

      <footer className="mt-10 pt-6 border-t border-dashed border-[var(--color-rule)] text-xs text-[var(--color-ink-muted)]">
        <p>
          Rules of record:{' '}
          <code className="text-[var(--color-ink-soft)]">
            Millbrook-Game-and-Big-Game-Rulebooks.md
          </code>
          . Version 1.2 (29 Apr 2025).
        </p>
      </footer>
    </div>
  );
}

function Chevron() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="var(--color-fairway)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

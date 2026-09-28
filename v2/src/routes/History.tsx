import { Link } from 'react-router-dom';
import { matchesRepo, playersRepo, coursesRepo, useLiveQuery } from '@/persistence';
import { Money } from '@/ui/components/Money';
import type { Course, Player } from '@/domain/types';
import type { MatchRecord } from '@/persistence';

const NO_MATCHES: MatchRecord[] = [];
const NO_PLAYERS: Player[] = [];
const NO_COURSES: Course[] = [];

export function HistoryRoute() {
  const matches = useLiveQuery(() => matchesRepo.all(), [], NO_MATCHES);
  const players = useLiveQuery(() => playersRepo.all(), [], NO_PLAYERS);
  const courses = useLiveQuery(() => coursesRepo.all(), [], NO_COURSES);

  const playerById = new Map(players.map((p) => [p.id, p]));
  const courseById = new Map(courses.map((c) => [c.id, c]));

  return (
    <div className="pt-6 space-y-6">
      <Link
        to="/"
        className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-fairway)] transition"
      >
        ← Back
      </Link>
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-brass-deep)]">
          Past rounds
        </p>
        <h1 className="font-[var(--font-display)] text-3xl mt-1">History</h1>
      </header>

      {matches.length === 0 ? (
        <div className="paper-card px-5 py-8 text-center text-[var(--color-ink-muted)] text-sm">
          No finished rounds yet. Settle one to see it here.
        </div>
      ) : (
        <ul className="grid gap-3">
          {matches.map((m) => {
            const course = courseById.get(m.courseId);
            const lineup = m.playerIds
              .map((id) => playerById.get(id))
              .filter((p): p is NonNullable<typeof p> => Boolean(p));
            const totals = m.finalRunningTotals;
            return (
              <li key={m.id} className="paper-card px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <div className="font-[var(--font-display)] text-lg">
                    {course?.name ?? 'Unknown course'}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] num">
                    {m.date}
                  </div>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-y-1 text-[13px]">
                  {lineup.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {p.firstName} {p.lastName[0]}.
                      </span>
                      <Money
                        value={totals[p.id] ?? 0}
                        tone={
                          (totals[p.id] ?? 0) > 0
                            ? 'win'
                            : (totals[p.id] ?? 0) < 0
                              ? 'loss'
                              : 'mute'
                        }
                      />
                    </li>
                  ))}
                </ul>
                {m.bigGame ? (
                  <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--color-brass-deep)]">
                    Big Game: <span className="num text-[var(--color-ink)]">{m.bigGameTotal}</span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

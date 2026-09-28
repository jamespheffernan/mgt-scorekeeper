import { Link } from 'react-router-dom';
import { coursesRepo, useLiveQuery } from '@/persistence';
import type { Course } from '@/domain/types';

const NO_COURSES: Course[] = [];

export function CoursesRoute() {
  const courses = useLiveQuery(() => coursesRepo.all(), [], NO_COURSES);

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
          Library
        </p>
        <h1 className="font-[var(--font-display)] text-3xl mt-1">Courses</h1>
        <p className="text-[var(--color-ink-soft)] mt-1 text-sm">
          Millbrook is built-in. Add others by importing a course JSON (v2.1).
        </p>
      </header>

      <section className="grid gap-3">
        {courses.map((c) => (
          <div key={c.id} className="paper-card px-5 py-4">
            <div className="flex items-baseline justify-between">
              <div className="font-[var(--font-display)] text-xl">{c.name}</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                {c.tees.length} tees
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {c.tees.map((t) => {
                const totalPar = t.holes.reduce((a, h) => a + h.par, 0);
                const totalYards = t.holes.reduce((a, h) => a + h.yards, 0);
                return (
                  <div key={t.id} className="border border-[var(--color-rule)] rounded-[var(--radius-sm)] px-3 py-2">
                    <div className="text-[12px]">{t.name}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)] num mt-0.5">
                      Par {totalPar} · {totalYards.toLocaleString()} yd
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

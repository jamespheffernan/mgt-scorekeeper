import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { coursesRepo, playersRepo, useLiveQuery } from '@/persistence';
import { useMatchStore } from '@/store';
import type { Course, Player, Team } from '@/domain/types';
import { Button } from '@/ui/components/Button';
import { PillToggle } from '@/ui/components/PillToggle';
import { Checkbox } from '@/ui/components/Checkbox';
import { cn } from '@/lib/cn';

interface DraftPlayer {
  player: Player;
  team: Team;
  teeId: string;
}

const NO_PLAYERS: Player[] = [];
const NO_COURSES: Course[] = [];

export function SetupRoute() {
  const navigate = useNavigate();
  const players = useLiveQuery(() => playersRepo.all(), [], NO_PLAYERS);
  const courses = useLiveQuery(() => coursesRepo.all(), [], NO_COURSES);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const course = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? courses[0],
    [courses, selectedCourseId],
  );

  const [drafts, setDrafts] = useState<DraftPlayer[]>([]);
  const [bigGame, setBigGame] = useState(false);
  const [bigGameBaseIndex, setBigGameBaseIndex] = useState<string>('');

  const startMatch = useMatchStore((s) => s.startMatch);

  function toggleSelectPlayer(player: Player) {
    setDrafts((existing) => {
      if (existing.some((d) => d.player.id === player.id)) {
        return existing.filter((d) => d.player.id !== player.id);
      }
      if (existing.length >= 4) return existing;
      const team: Team = existing.filter((d) => d.team === 'Red').length < 2 ? 'Red' : 'Blue';
      const teeId = course?.tees[0]?.id ?? '';
      return [...existing, { player, team, teeId }];
    });
  }

  function updateDraft(playerId: string, patch: Partial<DraftPlayer>) {
    setDrafts((existing) =>
      existing.map((d) => (d.player.id === playerId ? { ...d, ...patch } : d)),
    );
  }

  function start() {
    if (!course || drafts.length !== 4) return;
    const baseIndex = Number(bigGameBaseIndex);
    startMatch({
      course,
      players: drafts.map((d) => ({
        playerId: d.player.id,
        firstName: d.player.firstName,
        lastName: d.player.lastName,
        index: d.player.index,
        team: d.team,
        teeId: d.teeId,
      })),
      bigGame,
      ...(bigGame && !Number.isNaN(baseIndex) && bigGameBaseIndex.trim() !== ''
        ? { bigGameBaseIndex: baseIndex }
        : {}),
    });
    navigate('/hole/1');
  }

  const redCount = drafts.filter((d) => d.team === 'Red').length;
  const blueCount = drafts.filter((d) => d.team === 'Blue').length;
  const teamsBalanced = redCount === 2 && blueCount === 2;
  const ready = drafts.length === 4 && teamsBalanced && Boolean(course);

  return (
    <div className="pt-6 space-y-7">
      <Link
        to="/"
        className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-fairway)] transition"
      >
        ← Back
      </Link>
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-brass-deep)]">
          New round
        </p>
        <h1 className="font-[var(--font-display)] text-3xl mt-1">Setup</h1>
      </header>

      <section>
        <SectionHeader index="01" title="Course" />
        <div className="grid grid-cols-1 gap-2">
          {courses.length === 0 ? (
            <Empty text="No courses yet — go to Courses to add one." />
          ) : (
            courses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                active={c.id === course?.id}
                onSelect={() => setSelectedCourseId(c.id)}
              />
            ))
          )}
        </div>
      </section>

      <section>
        <SectionHeader index="02" title="Players" subtitle={`${drafts.length} of 4 selected`} />
        {players.length < 4 ? (
          <Empty text="Add at least four players in Roster to start a round.">
            <Link
              to="/roster"
              className="inline-block mt-2 text-[12px] uppercase tracking-[0.18em] text-[var(--color-fairway)] hover:underline"
            >
              → Go to Roster
            </Link>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {players.map((p) => {
              const draft = drafts.find((d) => d.player.id === p.id);
              const selected = Boolean(draft);
              return (
                <div
                  key={p.id}
                  className={cn(
                    'paper-card transition px-4 py-3',
                    selected
                      ? 'ring-1 ring-[var(--color-fairway)] shadow-[var(--shadow-lift)]'
                      : 'hover:bg-[var(--color-paper-deep)]',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelectPlayer(p)}
                      className="flex-1 text-left"
                    >
                      <div className="text-[15px]">
                        {p.firstName} {p.lastName}
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] num">
                        Index {p.index.toFixed(1)}
                      </div>
                    </button>
                    {draft && course ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <PillToggle
                          options={[
                            { value: 'Red', label: 'Red', tone: 'red' },
                            { value: 'Blue', label: 'Blue', tone: 'blue' },
                          ]}
                          value={draft.team}
                          onChange={(team) => updateDraft(p.id, { team })}
                        />
                        <select
                          value={draft.teeId}
                          onChange={(e) => updateDraft(p.id, { teeId: e.target.value })}
                          className="text-[12px] bg-[var(--color-card)] border border-[var(--color-rule)] rounded-[var(--radius-sm)] px-2 py-1"
                        >
                          {course.tees.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader index="03" title="Big Game" />
        <Checkbox
          id="big-game-toggle"
          label="Big Game (optional)"
          description="Track the two best net scores per hole. Junk does not apply (§3)."
          checked={bigGame}
          onChange={(e) => setBigGame(e.currentTarget.checked)}
        />
        {bigGame ? (
          <div className="mt-3 paper-card p-4">
            <label
              htmlFor="bg-base"
              className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]"
            >
              Field's lowest index (optional)
            </label>
            <p className="text-[12px] text-[var(--color-ink-muted)] mt-1">
              Big Game §2 — handicap strokes use the lowest index in the entire field, not just this
              foursome. Leave blank to use our foursome's low.
            </p>
            <input
              id="bg-base"
              type="text"
              inputMode="decimal"
              value={bigGameBaseIndex}
              onChange={(e) => setBigGameBaseIndex(e.target.value)}
              placeholder="e.g. 2.1"
              className="mt-2 w-32 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-card)] num"
            />
          </div>
        ) : null}
      </section>

      <div className="sticky bottom-16 pb-2">
        <Button
          size="lg"
          className="w-full"
          disabled={!ready}
          onClick={start}
          aria-disabled={!ready}
        >
          {ready ? 'Start round' : `Need ${4 - drafts.length} more · 2 per team`}
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="font-[var(--font-display)] text-[var(--color-brass-deep)] text-sm num">
        {index}
      </span>
      <h2 className="font-[var(--font-display)] text-xl">{title}</h2>
      {subtitle ? (
        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}

function CourseCard({
  course,
  active,
  onSelect,
}: {
  course: Course;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'paper-card flex items-center justify-between px-4 py-3 text-left transition',
        active
          ? 'ring-1 ring-[var(--color-fairway)] shadow-[var(--shadow-lift)]'
          : 'hover:bg-[var(--color-paper-deep)]',
      )}
    >
      <div>
        <div className="text-[15px]">{course.name}</div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          {course.tees.length} tee {course.tees.length === 1 ? 'option' : 'options'}
        </div>
      </div>
      <span
        className={cn(
          'h-5 w-5 rounded-full border-2 transition',
          active
            ? 'bg-[var(--color-fairway)] border-[var(--color-fairway)]'
            : 'border-[var(--color-rule)]',
        )}
      />
    </button>
  );
}

function Empty({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="paper-card px-5 py-6 text-center text-[var(--color-ink-muted)] text-sm">
      <p>{text}</p>
      {children}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMatchStore } from '@/store';
import type { MatchPlayerView } from '@/store';
import type { LedgerRow, Team } from '@/domain/types';
import { Money } from '@/ui/components/Money';
import { cn } from '@/lib/cn';

export function LedgerRoute() {
  const status = useMatchStore((s) => s.status);
  const engine = useMatchStore((s) => s.engine);
  const players = useMatchStore((s) => s.players);
  const course = useMatchStore((s) => s.course);

  if (status === 'idle' || !engine || !course || players.length !== 4) {
    return <Navigate to="/" replace />;
  }

  return <LedgerView />;
}

function LedgerView() {
  const engine = useMatchStore((s) => s.engine)!;
  const players = useMatchStore((s) => s.players);
  const setup = useMatchStore((s) => s.setup)!;
  const course = useMatchStore((s) => s.course)!;
  const firstTee = course.tees.find((t) => t.id === players[0]!.teeId)!;

  const [expanded, setExpanded] = useState<number | null>(null);

  const teamRunning = useMemo(() => {
    const last = engine.ledger.at(-1);
    if (!last) return { Red: 0, Blue: 0 };
    return players.reduce(
      (acc, p) => {
        const v = last.runningTotals[p.playerId] ?? 0;
        acc[p.team] += v;
        return acc;
      },
      { Red: 0, Blue: 0 } as Record<Team, number>,
    );
  }, [engine.ledger, players]);

  return (
    <div className="pt-3 space-y-4">
      <Link
        to="/"
        className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-fairway)] transition"
      >
        ← Back
      </Link>

      <TotalsRibbon
        red={teamRunning.Red}
        blue={teamRunning.Blue}
        bigGame={setup.bigGame ? engine.bigGameTotal : undefined}
        bigGameHoles={engine.bigGameRows.length}
      />

      <section className="paper-card overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_72px_64px_56px] px-3 py-2 border-b border-[var(--color-rule)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          <span>Hole</span>
          <span>Outcome</span>
          <span className="text-right">Payout</span>
          <span className="text-right">Carry</span>
          <span className="text-right">Base</span>
        </div>
        <ul>
          {Array.from({ length: 18 }, (_, i) => i + 1).map((holeNumber) => {
            const row = engine.ledger.find((r) => r.hole === holeNumber);
            const open = expanded === holeNumber;
            return (
              <li key={holeNumber} className="border-b border-[var(--color-rule)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : holeNumber)}
                  className={cn(
                    'w-full grid grid-cols-[40px_1fr_72px_64px_56px] items-center px-3 py-2 text-left transition',
                    row ? 'hover:bg-[var(--color-paper-deep)]' : 'opacity-50 cursor-default',
                  )}
                  aria-expanded={open}
                >
                  <span className="font-[var(--font-display)] num text-[15px]">{holeNumber}</span>
                  <span className="text-[13px]">
                    {row ? (
                      <ResultBadge result={row.result} junk={row.junk.length} />
                    ) : (
                      <span className="text-[var(--color-ink-muted)] text-[12px] uppercase tracking-[0.16em]">
                        — not yet —
                      </span>
                    )}
                  </span>
                  {row ? (
                    <>
                      <Money
                        className="text-[14px]"
                        value={row.payout}
                        tone={row.payout === 0 ? 'mute' : 'neutral'}
                      />
                      <Money
                        className="text-[14px]"
                        value={row.carryOut}
                        tone={row.carryOut === 0 ? 'mute' : 'neutral'}
                      />
                      <span className="text-right num text-[13px]">${row.base}</span>
                    </>
                  ) : (
                    <>
                      <span />
                      <span />
                      <span />
                    </>
                  )}
                </button>
                {open && row ? <PaperTrail row={row} players={players} par={firstTee.holes[holeNumber - 1]!.par} /> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function TotalsRibbon({
  red,
  blue,
  bigGame,
  bigGameHoles,
}: {
  red: number;
  blue: number;
  bigGame?: number;
  bigGameHoles: number;
}) {
  return (
    <div className="paper-card grid grid-cols-2 sm:grid-cols-3 divide-x divide-[var(--color-rule)] sticky top-14 z-10">
      <TeamCell label="Red" value={red} tone="red" />
      <TeamCell label="Blue" value={blue} tone="blue" />
      {typeof bigGame === 'number' ? (
        <div className="px-4 py-3 col-span-2 sm:col-span-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-brass-deep)]">
            Big Game
          </div>
          <div className="font-[var(--font-display)] text-2xl num">{bigGame}</div>
          <div className="text-[11px] text-[var(--color-ink-muted)]">{bigGameHoles}/18 holes</div>
        </div>
      ) : null}
    </div>
  );
}

function TeamCell({ label, value, tone }: { label: string; value: number; tone: 'red' | 'blue' }) {
  return (
    <div className="px-4 py-3">
      <div
        className={cn(
          'text-[11px] uppercase tracking-[0.18em]',
          tone === 'red' ? 'text-[var(--color-red)]' : 'text-[var(--color-blue)]',
        )}
      >
        {label}
      </div>
      <Money className="font-[var(--font-display)] text-2xl" value={value} tone={value > 0 ? 'win' : value < 0 ? 'loss' : 'mute'} />
    </div>
  );
}

function ResultBadge({ result, junk }: { result: 'Red' | 'Blue' | 'Push'; junk: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          'inline-block px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] uppercase tracking-[0.18em]',
          result === 'Red' && 'bg-[var(--color-red-soft)] text-[var(--color-red)]',
          result === 'Blue' && 'bg-[var(--color-blue-soft)] text-[var(--color-blue)]',
          result === 'Push' && 'bg-[var(--color-paper-deep)] text-[var(--color-ink-muted)]',
        )}
      >
        {result === 'Push' ? 'Push' : `${result} wins`}
      </span>
      {junk > 0 ? (
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-brass-deep)]">
          + {junk} junk
        </span>
      ) : null}
    </span>
  );
}

/** Per-hole "paper trail" — the audit drawer beneath each row. */
function PaperTrail({
  row,
  players,
  par,
}: {
  row: LedgerRow;
  players: MatchPlayerView[];
  par: number;
}) {
  return (
    <div className="px-4 py-4 bg-[var(--color-paper-deep)]/60 border-t border-dashed border-[var(--color-rule)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <SectionTitle>Players</SectionTitle>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                <th className="text-left font-normal">Name</th>
                <th className="text-right font-normal">Gross</th>
                <th className="text-right font-normal">Strk</th>
                <th className="text-right font-normal">Net</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const total = row.runningTotals[p.playerId] ?? 0;
                return (
                  <tr key={p.playerId}>
                    <td className="py-1.5">
                      <span
                        className={cn(
                          'inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle',
                          p.team === 'Red' ? 'bg-[var(--color-red)]' : 'bg-[var(--color-blue)]',
                        )}
                      />
                      {p.firstName} {p.lastName[0]}.
                    </td>
                    <td className="text-right num">—</td>
                    <td className="text-right num text-[var(--color-ink-muted)]">
                      {p.strokes[row.hole - 1] ?? 0}
                    </td>
                    <td className="text-right num">—</td>
                    <td className="text-right num pl-3">
                      <Money value={total} tone={total > 0 ? 'win' : total < 0 ? 'loss' : 'mute'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div>
          <SectionTitle>Money trail</SectionTitle>
          <ul className="text-[13px] space-y-1">
            <li className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">Carry in</span>
              <Money value={row.carryIn} tone={row.carryIn === 0 ? 'mute' : 'neutral'} />
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">Base × doubles</span>
              <span className="num">
                ${row.base} {row.doubles > 0 ? `(×${2 ** row.doubles})` : ''}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">Win bonus</span>
              <span className="num">{row.result === 'Push' ? '—' : `$${row.base}`}</span>
            </li>
            <li className="flex justify-between border-t border-dashed border-[var(--color-rule)] pt-1 mt-1">
              <span>Hole payout</span>
              <Money value={row.payout} />
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">Carry out</span>
              <Money value={row.carryOut} tone={row.carryOut === 0 ? 'mute' : 'neutral'} />
            </li>
          </ul>
          {row.junk.length > 0 ? (
            <>
              <SectionTitle className="mt-3">Junk</SectionTitle>
              <ul className="text-[13px] space-y-1">
                {row.junk.map((j, i) => {
                  const player = players.find((p) => p.playerId === j.playerId);
                  return (
                    <li key={`${j.type}-${i}`} className="flex justify-between">
                      <span>
                        <span
                          className={cn(
                            'inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle',
                            j.team === 'Red' ? 'bg-[var(--color-red)]' : 'bg-[var(--color-blue)]',
                          )}
                        />
                        {j.type}
                        {player ? ` · ${player.firstName}` : ''}
                      </span>
                      <Money value={j.value} tone={j.value < 0 ? 'loss' : 'neutral'} />
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
          {row.bigGame ? (
            <>
              <SectionTitle className="mt-3">Big Game</SectionTitle>
              <div className="text-[13px] flex justify-between">
                <span className="text-[var(--color-ink-muted)]">Best two nets</span>
                <span className="num">
                  {row.bigGame.bestNet.join(' + ')} = {row.bigGame.subtotal}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
        Par {par} · hole {row.hole}
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'text-[10px] uppercase tracking-[0.18em] text-[var(--color-brass-deep)] mb-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

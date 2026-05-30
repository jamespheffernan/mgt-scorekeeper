import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMatchStore } from '@/store';
import { Button } from '@/ui/components/Button';
import { Money } from '@/ui/components/Money';
import { cn } from '@/lib/cn';
import { buildLedgerCsv, capturePng, downloadBlob } from '@/lib/exports';
import { parsForTee } from '@/courses/millbrook';
import type { Team } from '@/domain/types';

export function SettlementRoute() {
  const status = useMatchStore((s) => s.status);
  const engine = useMatchStore((s) => s.engine);
  const players = useMatchStore((s) => s.players);
  const course = useMatchStore((s) => s.course);
  const setup = useMatchStore((s) => s.setup);

  if (status === 'idle' || !engine || !course || !setup || players.length !== 4) {
    return <Navigate to="/" replace />;
  }
  // We allow viewing the settlement mid-round too — it just shows the running
  // standing rather than the final settle-up.
  return <SettlementView />;
}

function SettlementView() {
  const navigate = useNavigate();
  const engine = useMatchStore((s) => s.engine)!;
  const players = useMatchStore((s) => s.players);
  const course = useMatchStore((s) => s.course)!;
  const setup = useMatchStore((s) => s.setup)!;
  const resetMatch = useMatchStore((s) => s.resetMatch);

  const captureRef = useRef<HTMLDivElement>(null);

  const finalTotals = useMemo(() => {
    const last = engine.ledger.at(-1);
    const map = new Map<string, number>();
    for (const p of players) {
      map.set(p.playerId, last?.runningTotals[p.playerId] ?? 0);
    }
    return map;
  }, [engine.ledger, players]);

  const redPlayers = players.filter((p) => p.team === 'Red');
  const bluePlayers = players.filter((p) => p.team === 'Blue');
  const sumTeam = (team: Team) =>
    players
      .filter((p) => p.team === team)
      .reduce((acc, p) => acc + (finalTotals.get(p.playerId) ?? 0), 0);
  const redTotal = sumTeam('Red');
  const blueTotal = sumTeam('Blue');
  const winningTeam: Team | 'Tied' =
    redTotal === blueTotal ? 'Tied' : redTotal > blueTotal ? 'Red' : 'Blue';

  const winners = players.filter((p) => p.team === winningTeam);
  const losers = players.filter((p) => p.team !== winningTeam);

  // §7 — each player on the losing team pays one opponent. Default mapping is
  // index-based; the user can swap who pays whom.
  const [swap, setSwap] = useState(false);
  const pairings =
    winners.length === 2 && losers.length === 2
      ? losers.map((loser, i) => ({
          loser,
          winner: swap ? winners[1 - i]! : winners[i]!,
          amount: Math.abs(finalTotals.get(loser.playerId) ?? 0),
        }))
      : [];

  const isFinished = engine.finished;

  function onExportCsv() {
    const csv = buildLedgerCsv({
      engine,
      players,
      bigGame: setup.bigGame,
      par: parsForTee(course, players[0]!.teeId),
      date: setup.date,
      courseName: course.name,
    });
    downloadBlob(`millbrook-${setup.date}.csv`, csv);
  }

  async function onExportPng() {
    if (!captureRef.current) return;
    await capturePng(captureRef.current, `millbrook-${setup.date}.png`);
  }

  function onNewRound() {
    resetMatch();
    navigate('/setup');
  }

  return (
    <div className="pt-3 space-y-4">
      <Link
        to="/"
        className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-fairway)] transition"
      >
        ← Back
      </Link>

      <div ref={captureRef} className="space-y-4 pb-2">
        <header className="paper-card px-5 py-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-brass-deep)]">
                {isFinished ? 'Round complete' : 'Standing'}
              </p>
              <h1 className="font-[var(--font-display)] text-3xl mt-1">Settlement</h1>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                {course.name}
              </div>
              <div className="text-[12px] num">{setup.date}</div>
            </div>
          </div>
          <p className="text-[13px] text-[var(--color-ink-soft)] mt-2">
            Side match · {redTeamName(redPlayers)} (Red) vs {redTeamName(bluePlayers)} (Blue).
            {setup.bigGame ? ' Big Game on.' : ''}
          </p>
        </header>

        <section className="paper-card overflow-hidden">
          <SectionHeader title="Side match">
            <TeamPill team="Red" amount={redTotal} winning={winningTeam === 'Red'} />
            <TeamPill team="Blue" amount={blueTotal} winning={winningTeam === 'Blue'} />
          </SectionHeader>
          <ul className="divide-y divide-[var(--color-rule)]">
            {players.map((p) => {
              const total = finalTotals.get(p.playerId) ?? 0;
              return (
                <li
                  key={p.playerId}
                  className="flex items-center px-5 py-3 gap-3"
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      p.team === 'Red' ? 'bg-[var(--color-red)]' : 'bg-[var(--color-blue)]',
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 text-[15px]">
                    {p.firstName} {p.lastName}
                    <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] num">
                      idx {p.index.toFixed(1)}
                    </span>
                  </span>
                  <Money
                    className="font-[var(--font-display)] text-xl"
                    value={total}
                    tone={total > 0 ? 'win' : total < 0 ? 'loss' : 'mute'}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        {setup.bigGame ? (
          <section className="paper-card px-5 py-4">
            <SectionHeader title="Big Game" />
            <div className="flex items-baseline gap-4 mt-1">
              <div className="font-[var(--font-display)] text-4xl num">{engine.bigGameTotal}</div>
              <div className="text-[12px] text-[var(--color-ink-muted)]">
                Best two nets, summed across {engine.bigGameRows.length}/18 holes
              </div>
            </div>
            <p className="text-[12px] text-[var(--color-ink-muted)] mt-2">
              Text this number to the Big Game Commissioner. Tied totals roll the purse to the next
              Big Game (Big Game §7).
            </p>
          </section>
        ) : null}

        {isFinished && pairings.length === 2 ? (
          <section className="paper-card px-5 py-4">
            <SectionHeader title="Settle up">
              <button
                type="button"
                onClick={() => setSwap((s) => !s)}
                className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-fairway)] hover:underline"
              >
                Swap pairings
              </button>
            </SectionHeader>
            <p className="text-[12px] text-[var(--color-ink-muted)] mt-1">
              §7 — Each loser pays one winner the full amount. The teams choose who pays whom.
            </p>
            <ul className="mt-3 space-y-2">
              {pairings.map((p) => (
                <li
                  key={`${p.loser.playerId}-${p.winner.playerId}`}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-rule)] px-4 py-2 bg-[var(--color-paper-deep)]/40"
                >
                  <div className="flex items-center gap-2 text-[14px]">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        p.loser.team === 'Red' ? 'bg-[var(--color-red)]' : 'bg-[var(--color-blue)]',
                      )}
                      aria-hidden
                    />
                    {p.loser.firstName} {p.loser.lastName[0]}.
                    <span className="mx-1 text-[var(--color-ink-muted)]">pays</span>
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        p.winner.team === 'Red' ? 'bg-[var(--color-red)]' : 'bg-[var(--color-blue)]',
                      )}
                      aria-hidden
                    />
                    {p.winner.firstName} {p.winner.lastName[0]}.
                  </div>
                  <Money className="font-[var(--font-display)] text-lg" value={p.amount} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!isFinished ? (
          <section className="paper-card px-5 py-4 text-[12px] text-[var(--color-ink-muted)] flex items-center justify-between">
            <span>
              Round in progress — settlement finalises after hole 18 (currently on hole{' '}
              <span className="num text-[var(--color-ink)]">{engine.currentHole}</span>).
            </span>
            <Link
              to={`/hole/${engine.currentHole}`}
              className="text-[var(--color-fairway)] uppercase tracking-[0.18em] text-[11px] hover:underline"
            >
              Resume →
            </Link>
          </section>
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="md" onClick={onExportCsv}>
          Export CSV
        </Button>
        <Button variant="secondary" size="md" onClick={onExportPng}>
          Save image
        </Button>
      </section>

      {isFinished ? (
        <Button variant="primary" size="lg" className="w-full" onClick={onNewRound}>
          Start a new round
        </Button>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 pt-4 pb-2 flex items-baseline justify-between border-b border-[var(--color-rule)]">
      <h2 className="font-[var(--font-display)] text-lg">{title}</h2>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function TeamPill({ team, amount, winning }: { team: Team; amount: number; winning: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded-[var(--radius-pill)] text-[11px] uppercase tracking-[0.18em]',
        team === 'Red' ? 'bg-[var(--color-red-soft)] text-[var(--color-red)]' : 'bg-[var(--color-blue-soft)] text-[var(--color-blue)]',
        winning && 'ring-1 ring-[var(--color-brass)]',
      )}
    >
      {team}
      <Money value={amount} className="text-[12px]" />
    </span>
  );
}

function redTeamName(players: { lastName: string }[]): string {
  if (players.length === 0) return '—';
  return players.map((p) => p.lastName).join(' & ');
}

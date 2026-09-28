import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery, playersRepo } from '@/persistence';
import { Field } from '@/ui/components/Field';
import { Button } from '@/ui/components/Button';
import type { Player } from '@/domain/types';

const NO_PLAYERS: Player[] = [];

export function RosterRoute() {
  const players = useLiveQuery(() => playersRepo.all(), [], NO_PLAYERS);

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
          Players
        </p>
        <h1 className="font-[var(--font-display)] text-3xl mt-1">Roster</h1>
        <p className="text-[var(--color-ink-soft)] mt-1 text-sm">
          Local-only — kept on this device until you opt in to cloud sync.
        </p>
      </header>

      <AddPlayerForm />

      <section className="paper-card divide-y divide-[var(--color-rule)]">
        {players.length === 0 ? (
          <div className="px-5 py-8 text-center text-[var(--color-ink-muted)] text-sm">
            No players yet. Add four to start a round.
          </div>
        ) : (
          players.map((p) => <PlayerRow key={p.id} player={p} />)
        )}
      </section>
    </div>
  );
}

function AddPlayerForm() {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [idx, setIdx] = useState('');
  const [ghin, setGhin] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(idx);
    if (!first.trim() || !last.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (Number.isNaN(parsed) || parsed < -10 || parsed > 54) {
      setError('Index must be a number between -10 and 54.');
      return;
    }
    const player: Player = {
      id: makeId(),
      firstName: first.trim(),
      lastName: last.trim(),
      index: parsed,
      ...(ghin.trim() ? { ghin: ghin.trim() } : {}),
    };
    playersRepo.put(player);
    setFirst('');
    setLast('');
    setIdx('');
    setGhin('');
    setError(null);
  }

  return (
    <form onSubmit={onSubmit} className="paper-card p-4 space-y-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-brass-deep)]">
        Add a player
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="First name"
          autoComplete="given-name"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
        />
        <Field
          label="Last name"
          autoComplete="family-name"
          value={last}
          onChange={(e) => setLast(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Handicap index"
          inputMode="decimal"
          value={idx}
          onChange={(e) => setIdx(e.target.value)}
          trailing="HCP"
        />
        <Field
          label="GHIN (optional)"
          value={ghin}
          onChange={(e) => setGhin(e.target.value)}
          inputMode="numeric"
        />
      </div>
      {error ? <p className="text-[12px] text-[var(--color-red)]">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="md">
          Save player
        </Button>
      </div>
    </form>
  );
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center px-5 py-3 gap-3">
      <div className="flex-1">
        <div className="text-[15px] text-[var(--color-ink)]">
          {player.firstName} {player.lastName}
        </div>
        {player.ghin ? (
          <div className="text-[11px] text-[var(--color-ink-muted)] tracking-wide num">
            GHIN {player.ghin}
          </div>
        ) : null}
      </div>
      <div className="text-right">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
          Index
        </div>
        <div className="font-[var(--font-display)] text-xl num leading-none mt-0.5">
          {player.index.toFixed(1)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => playersRepo.remove(player.id)}
        className="ml-3 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-red)] transition"
        aria-label={`Remove ${player.firstName} ${player.lastName}`}
      >
        Remove
      </button>
    </div>
  );
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

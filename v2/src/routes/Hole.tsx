import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { useMatchStore } from '@/store';
import { Button } from '@/ui/components/Button';
import { Stepper } from '@/ui/components/Stepper';
import { JunkChips } from '@/ui/components/JunkChips';
import { Money } from '@/ui/components/Money';
import { cn } from '@/lib/cn';
import { baseForHole, canCallDouble } from '@/engine/base';
import { holePayout } from '@/engine/payout';
import { PAR3_HOLES } from '@/rules/rulebook';
import type { JunkFlags, PlayerHoleInput, Team } from '@/domain/types';

export function HoleRoute() {
  const { holeNumber } = useParams();
  const status = useMatchStore((s) => s.status);
  const engine = useMatchStore((s) => s.engine);
  const players = useMatchStore((s) => s.players);
  const course = useMatchStore((s) => s.course);

  const targetHole = Math.min(18, Math.max(1, Number(holeNumber) || 1));

  if (status === 'idle' || !engine || !course || players.length !== 4) {
    return <Navigate to="/" replace />;
  }
  if (status === 'finished') {
    return <Navigate to="/settlement" replace />;
  }
  if (targetHole !== engine.currentHole) {
    return <Navigate to={`/hole/${engine.currentHole}`} replace />;
  }

  return <ActiveHoleView />;
}

/**
 * Inner view, mounted only when we have a valid active match on the right
 * hole. Splitting this out keeps the hook order stable.
 */
function ActiveHoleView() {
  const navigate = useNavigate();
  const engine = useMatchStore((s) => s.engine)!;
  const players = useMatchStore((s) => s.players);
  const course = useMatchStore((s) => s.course)!;
  const submitHole = useMatchStore((s) => s.submitHole);
  const callDouble = useMatchStore((s) => s.callDouble);

  const hole = engine.currentHole;
  const isPar3 = (PAR3_HOLES as readonly number[]).includes(hole);
  const is17th = hole === 17;

  // Par for the scoring card uses the first player's tee — the engine has the
  // same uniform-par assumption. Per-player par for multi-tee birdie detection
  // is a v2.1 concern; right now we expect a foursome on a single tee mix
  // (which is how Millbrook practice works).
  const firstTee = course.tees.find((t) => t.id === players[0]!.teeId)!;
  const par = firstTee.holes[hole - 1]!.par;
  const yards = firstTee.holes[hole - 1]!.yards;

  // Local input state.
  const [scores, setScores] = useState<number[]>([par, par, par, par]);
  const [flags, setFlags] = useState<JunkFlags[]>([{}, {}, {}, {}]);
  const [pickups, setPickups] = useState<boolean[]>([false, false, false, false]);
  const [ld10Active, setLd10Active] = useState<boolean>(engine.ld10Accepted);

  // Reset local state when the hole changes (after a submit).
  useEffect(() => {
    setScores([par, par, par, par]);
    setFlags([{}, {}, {}, {}]);
    setPickups([false, false, false, false]);
  }, [hole, par]);

  // Preview computation — show the outcome before they hit Save.
  const preview = useMemo(() => {
    const nets = players.map((p, i) => {
      if (pickups[i]) return par + 2; // net double-bogey on pickup
      const stroke = p.strokes[hole - 1] ?? 0;
      return (scores[i] ?? par) - stroke;
    });
    const minNet = (team: Team) =>
      Math.min(
        ...players
          .map((p, i) => (p.team === team ? nets[i]! : Number.POSITIVE_INFINITY))
          .filter((n) => Number.isFinite(n)),
      );
    const r = minNet('Red');
    const b = minNet('Blue');
    const result: 'Red' | 'Blue' | 'Push' = r === b ? 'Push' : r < b ? 'Red' : 'Blue';
    const base = baseForHole(hole, engine.doubles);
    const { payout, carryOut } = holePayout({ result, base, carryIn: engine.carryIn });
    return { result, base, payout, carryOut, nets };
  }, [scores, pickups, players, hole, par, engine.carryIn, engine.doubles]);

  const trailingTeam: Team | null =
    engine.leadingTeam === 'Red' ? 'Blue' : engine.leadingTeam === 'Blue' ? 'Red' : null;
  const canDouble =
    trailingTeam !== null &&
    canCallDouble({
      team: trailingTeam,
      hole,
      leadingTeam: engine.leadingTeam,
      doubleAlreadyCalledThisHole: engine.doubleCalledThisHole,
    });

  function onSave() {
    const inputs: PlayerHoleInput[] = players.map((_, i) =>
      pickups[i]
        ? { pickedUp: true, flags: flags[i] }
        : { gross: scores[i]!, flags: flags[i]! },
    );
    submitHole(hole, inputs, ld10Active && is17th);
    if (hole >= 18) {
      navigate('/settlement');
    } else {
      navigate(`/hole/${hole + 1}`);
    }
  }

  return (
    <div className="pt-3 space-y-4">
      <HoleHeader hole={hole} par={par} yards={yards} si={firstTee.holes[hole - 1]!.strokeIndex} />

      <PotStrip
        base={preview.base}
        carryIn={engine.carryIn}
        doubles={engine.doubles}
        previewResult={preview.result}
        previewPayout={preview.payout}
      />

      {is17th && !engine.ld10Accepted ? (
        <LD10Prompt active={ld10Active} onChange={setLd10Active} />
      ) : null}

      <div className="grid gap-3">
        {players.map((p, i) => (
          <PlayerCard
            key={p.playerId}
            name={`${p.firstName} ${p.lastName}`}
            team={p.team}
            strokes={p.strokes[hole - 1] ?? 0}
            net={preview.nets[i] ?? par}
            score={scores[i] ?? par}
            pickedUp={pickups[i] ?? false}
            flags={flags[i] ?? {}}
            par={par}
            isPar3={isPar3}
            is17th={is17th}
            ld10Active={ld10Active && is17th}
            onScoreChange={(next) => {
              const copy = scores.slice();
              copy[i] = next;
              setScores(copy);
            }}
            onPickupChange={(next) => {
              const copy = pickups.slice();
              copy[i] = next;
              setPickups(copy);
            }}
            onFlagsChange={(next) => {
              const copy = flags.slice();
              copy[i] = next;
              setFlags(copy);
            }}
          />
        ))}
      </div>

      <div className="sticky bottom-16 pt-2 pb-2 bg-[color-mix(in_srgb,var(--color-paper)_92%,transparent)] backdrop-blur-sm">
        <div className="flex gap-2">
          {canDouble && trailingTeam ? (
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => callDouble(trailingTeam)}
            >
              Call double · {trailingTeam}
            </Button>
          ) : null}
          <Button variant="primary" size="md" className="flex-1" onClick={onSave}>
            {hole >= 18 ? 'Finish round' : 'Save hole · Next'}
          </Button>
        </div>
        <div className="flex justify-between mt-2 text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
          <Link to="/ledger" className="hover:text-[var(--color-fairway)] transition">
            Open ledger
          </Link>
          <span>Hole {hole} of 18</span>
        </div>
      </div>
    </div>
  );
}

function HoleHeader({
  hole,
  par,
  yards,
  si,
}: {
  hole: number;
  par: number;
  yards: number;
  si: number;
}) {
  return (
    <div className="paper-card px-5 py-4 flex items-end gap-5">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-brass-deep)]">
          Hole
        </div>
        <div className="font-[var(--font-display)] text-5xl leading-none num">{hole}</div>
      </div>
      <Divider />
      <Stat label="Par" value={par.toString()} />
      <Stat label="Yds" value={yards.toString()} />
      <Stat label="SI" value={si.toString()} />
    </div>
  );
}

function Divider() {
  return <div className="w-px self-stretch bg-[var(--color-rule)]" aria-hidden />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
        {label}
      </div>
      <div className="font-[var(--font-display)] text-2xl leading-none num">{value}</div>
    </div>
  );
}

function PotStrip({
  base,
  carryIn,
  doubles,
  previewResult,
  previewPayout,
}: {
  base: number;
  carryIn: number;
  doubles: number;
  previewResult: 'Red' | 'Blue' | 'Push';
  previewPayout: number;
}) {
  return (
    <div className="paper-card px-4 py-3 flex items-center gap-3 text-[12px]">
      <Stat label="Base" value={`$${base}`} />
      <Divider />
      <Stat label="Carry" value={`$${carryIn}`} />
      <Divider />
      <Stat label="Dbl" value={`×${2 ** doubles}`} />
      <div className="flex-1" />
      <div
        className={cn(
          'px-2.5 py-1 rounded-[var(--radius-pill)] text-[11px] uppercase tracking-[0.18em]',
          previewResult === 'Red' && 'bg-[var(--color-red-soft)] text-[var(--color-red)]',
          previewResult === 'Blue' && 'bg-[var(--color-blue-soft)] text-[var(--color-blue)]',
          previewResult === 'Push' && 'bg-[var(--color-paper-deep)] text-[var(--color-ink-muted)]',
        )}
      >
        {previewResult === 'Push' ? 'Push' : `${previewResult} +`}
        {previewResult !== 'Push' ? <Money className="ml-1" value={previewPayout} /> : null}
      </div>
    </div>
  );
}

function LD10Prompt({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="paper-card px-4 py-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-brass-deep)]">
          17th tee
        </div>
        <div className="font-[var(--font-display)] text-lg">Long-drive ten?</div>
        <p className="text-[12px] text-[var(--color-ink-muted)] mt-0.5 max-w-md">
          Either team may propose LD10. Drives in upper fairway, collar, or green qualify; valley,
          rough, bunker do not.
        </p>
      </div>
      <Button variant={active ? 'primary' : 'secondary'} size="sm" onClick={() => onChange(!active)}>
        {active ? 'Accepted' : 'Accept'}
      </Button>
    </div>
  );
}

interface PlayerCardProps {
  name: string;
  team: Team;
  strokes: number;
  net: number;
  score: number;
  pickedUp: boolean;
  flags: JunkFlags;
  par: number;
  isPar3: boolean;
  is17th: boolean;
  ld10Active: boolean;
  onScoreChange: (next: number) => void;
  onPickupChange: (next: boolean) => void;
  onFlagsChange: (next: JunkFlags) => void;
}

function PlayerCard({
  name,
  team,
  strokes,
  net,
  score,
  pickedUp,
  flags,
  par,
  isPar3,
  is17th,
  ld10Active,
  onScoreChange,
  onPickupChange,
  onFlagsChange,
}: PlayerCardProps) {
  return (
    <div
      className={cn(
        'paper-card px-4 py-3',
        team === 'Red'
          ? 'border-l-[3px] border-l-[var(--color-red)]'
          : 'border-l-[3px] border-l-[var(--color-blue)]',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-[var(--color-ink)]">{name}</span>
            {strokes > 0 ? (
              <span
                className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-brass-deep)]"
                title={`${strokes} handicap stroke${strokes > 1 ? 's' : ''}`}
              >
                {'•'.repeat(strokes)} stroke
              </span>
            ) : null}
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
            Net{' '}
            <span className="num text-[var(--color-ink)]">{Number.isFinite(net) ? net : '—'}</span>
          </div>
        </div>
        <Stepper
          value={score}
          onChange={onScoreChange}
          disabled={pickedUp}
          min={1}
          max={15}
          label={`${name} score`}
          tone={team === 'Red' ? 'red' : 'blue'}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <JunkChips
          flags={flags}
          par={par}
          isPar3={isPar3}
          is17th={is17th}
          ld10Active={ld10Active}
          disabled={pickedUp}
          onChange={onFlagsChange}
        />
        <button
          type="button"
          onClick={() => onPickupChange(!pickedUp)}
          aria-pressed={pickedUp}
          className={cn(
            'text-[11px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-[var(--radius-pill)] transition border',
            pickedUp
              ? 'bg-[var(--color-paper-deep)] text-[var(--color-ink)] border-[var(--color-rule)]'
              : 'bg-transparent text-[var(--color-ink-muted)] border-transparent hover:text-[var(--color-ink)]',
          )}
        >
          {pickedUp ? 'Picked up · net dbl' : 'Pick up'}
        </button>
      </div>
    </div>
  );
}

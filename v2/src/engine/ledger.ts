/**
 * Ledger composer — orchestrates strokes, base, payout, junk, and Big Game
 * into a single per-hole transition. Pure: same inputs → same outputs.
 *
 * The engine state is everything that changes from hole to hole. The store
 * persists it; the engine reads and returns a new copy.
 */

import { HOLE_COUNT, PICKUP_NET_OVER_PAR } from '@/rules/rulebook';
import type {
  BigGameRow,
  HoleResult,
  JunkEvent,
  LedgerRow,
  PlayerHoleInput,
  PlayerHoleScore,
  PlayerId,
  Team,
} from '@/domain/types';
import { baseForHole, canCallDouble } from './base';
import { holePayout, applyPayoutToTotals } from './payout';
import { evaluateJunk, applyJunkToTotals } from './junk';
import { bigGameRow } from './bigGame';

export interface PlayerSlot {
  id: PlayerId;
  team: Team;
  /** Strokes per hole for this player from `allocateStrokes`. Length 18. */
  strokes: number[];
}

export interface CourseSlice {
  /** Par per hole, length 18. */
  par: number[];
}

export interface EngineState {
  /** 1..18. The hole that is about to be played / scored next. */
  currentHole: number;
  /** Cumulative count of doubles called so far in the round. */
  doubles: number;
  /** Whether the trailing team has already called a double on `currentHole`. */
  doubleCalledThisHole: boolean;
  /** Money carrying INTO `currentHole`. */
  carryIn: number;
  /** Team that is currently ahead in money. */
  leadingTeam: Team | 'Tied';
  /** Per-player running side-match totals (includes junk). */
  runningTotals: Record<PlayerId, number>;
  /** Accumulated greenie carry pool (§6A). */
  greenieCarry: number;
  /** Players who have already been paid a birdie (§6). */
  birdiePaid: Set<PlayerId>;
  /** True once both sides have accepted LD10 (the prompt happens on hole 17). */
  ld10Accepted: boolean;
  /** Big Game subtotal accumulating across the round. */
  bigGameTotal: number;
  /** Big Game rows accumulated so far, in hole order. */
  bigGameRows: BigGameRow[];
  /** Junk events accumulated so far, in chronological order. */
  junkEvents: JunkEvent[];
  /** Ledger rows accumulated so far, in hole order. */
  ledger: LedgerRow[];
  /** True once hole 18 has been recorded. */
  finished: boolean;
}

export function initialEngineState(players: PlayerSlot[]): EngineState {
  const totals: Record<PlayerId, number> = {};
  for (const p of players) totals[p.id] = 0;
  return {
    currentHole: 1,
    doubles: 0,
    doubleCalledThisHole: false,
    carryIn: 0,
    leadingTeam: 'Tied',
    runningTotals: totals,
    greenieCarry: 0,
    birdiePaid: new Set(),
    ld10Accepted: false,
    bigGameTotal: 0,
    bigGameRows: [],
    junkEvents: [],
    ledger: [],
    finished: false,
  };
}

/**
 * Record a valid double call on the current hole. Returns the same state if
 * the call isn't legal — callers should check `canCallDouble` first and present
 * the UI accordingly; this is the safety net.
 */
export function applyDouble(state: EngineState, callingTeam: Team): EngineState {
  if (
    !canCallDouble({
      team: callingTeam,
      hole: state.currentHole,
      leadingTeam: state.leadingTeam,
      doubleAlreadyCalledThisHole: state.doubleCalledThisHole,
    })
  ) {
    return state;
  }
  return {
    ...state,
    doubles: state.doubles + 1,
    doubleCalledThisHole: true,
  };
}

export interface HoleSubmission {
  hole: number;
  /** Inputs per player, in the same order as the `players` argument. */
  inputs: PlayerHoleInput[];
  /** Hole 17 LD10 was offered/accepted? Only meaningful for hole 17. */
  ld10AcceptedForThisHole?: boolean;
}

export interface ApplyHoleArgs {
  state: EngineState;
  players: PlayerSlot[];
  course: CourseSlice;
  bigGame: boolean;
  submission: HoleSubmission;
}

/**
 * Apply a completed hole to the engine state. Returns the new state and the
 * ledger row that was just produced.
 */
export function applyHole(args: ApplyHoleArgs): { state: EngineState; row: LedgerRow } {
  const { state, players, course, bigGame, submission } = args;
  const hole = submission.hole;

  if (hole !== state.currentHole) {
    throw new Error(`applyHole: hole ${hole} does not match currentHole ${state.currentHole}`);
  }
  if (submission.inputs.length !== players.length) {
    throw new Error('applyHole: inputs length must match players length');
  }

  const par = course.par[hole - 1];
  if (par === undefined) throw new Error(`applyHole: missing par for hole ${hole}`);

  // 1) Resolve per-player scores (gross/net/strokes/pickup).
  const scores: PlayerHoleScore[] = players.map((p, i) => {
    const input = submission.inputs[i]!;
    const strokes = p.strokes[hole - 1] ?? 0;
    if (input.pickedUp) {
      // §3A pickup: net double-bogey relative to par.
      const net = par + PICKUP_NET_OVER_PAR;
      const gross = net + strokes;
      return {
        playerId: p.id,
        team: p.team,
        gross,
        net,
        strokes,
        pickedUp: true,
        flags: input.flags ?? {},
      };
    }
    const gross = input.gross ?? 0;
    if (gross <= 0) {
      throw new Error(`applyHole: player ${p.id} has no gross score on hole ${hole}`);
    }
    return {
      playerId: p.id,
      team: p.team,
      gross,
      net: gross - strokes,
      strokes,
      pickedUp: false,
      flags: input.flags ?? {},
    };
  });

  // 2) Team nets (lower of the two).
  const teamNet = {
    Red: minNetForTeam(scores, 'Red'),
    Blue: minNetForTeam(scores, 'Blue'),
  };
  const result: HoleResult =
    teamNet.Red === teamNet.Blue ? 'Push' : teamNet.Red < teamNet.Blue ? 'Red' : 'Blue';

  // 3) Base + payout (§4, §5).
  const base = baseForHole(hole, state.doubles);
  const { payout, carryOut } = holePayout({ result, base, carryIn: state.carryIn });

  // 4) Update running totals with side-match money.
  const teamSlots = players.map((p) => ({ id: p.id, team: p.team }));
  let totals = applyPayoutToTotals(state.runningTotals, result, payout, teamSlots);

  // 5) Junk (side match only — Big Game §3 excludes junk).
  const ld10Active =
    hole === 17 && (state.ld10Accepted || Boolean(submission.ld10AcceptedForThisHole));

  const junkOutcome = evaluateJunk({
    hole,
    par,
    base,
    scores,
    greenieCarry: state.greenieCarry,
    birdiePaidPlayers: state.birdiePaid,
    ld10Active,
  });
  totals = applyJunkToTotals(totals, junkOutcome.events, teamSlots);

  // 6) Big Game row (§3 of Big Game book).
  let big: BigGameRow | undefined;
  if (bigGame) big = bigGameRow(hole, scores);

  // 7) Build the row.
  const row: LedgerRow = {
    hole,
    base,
    doubles: state.doubles,
    carryIn: state.carryIn,
    carryOut,
    payout,
    result,
    runningTotals: totals,
    junk: junkOutcome.events,
    ...(big ? { bigGame: big } : {}),
  };

  // 8) Recompute leading team (by team-sum of running totals).
  const leadingTeam = computeLeadingTeam(totals, teamSlots);

  // 9) Advance state.
  const finished = hole >= HOLE_COUNT;
  const nextHole = finished ? hole : hole + 1;

  const newState: EngineState = {
    currentHole: nextHole,
    doubles: state.doubles,
    doubleCalledThisHole: false,
    carryIn: carryOut,
    leadingTeam,
    runningTotals: totals,
    greenieCarry: junkOutcome.greenieCarryOut,
    birdiePaid: junkOutcome.birdiePaidOut,
    ld10Accepted: ld10Active ? true : state.ld10Accepted,
    bigGameTotal: big ? state.bigGameTotal + big.subtotal : state.bigGameTotal,
    bigGameRows: big ? [...state.bigGameRows, big] : state.bigGameRows,
    junkEvents: [...state.junkEvents, ...junkOutcome.events],
    ledger: [...state.ledger, row],
    finished,
  };

  return { state: newState, row };
}

function minNetForTeam(scores: PlayerHoleScore[], team: Team): number {
  const team_scores = scores.filter((s) => s.team === team).map((s) => s.net);
  if (team_scores.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...team_scores);
}

function computeLeadingTeam(
  totals: Record<PlayerId, number>,
  teamSlots: { id: PlayerId; team: Team }[],
): Team | 'Tied' {
  const sum = (team: Team) =>
    teamSlots.filter((p) => p.team === team).reduce((acc, p) => acc + (totals[p.id] ?? 0), 0);
  const red = sum('Red');
  const blue = sum('Blue');
  if (red > blue) return 'Red';
  if (blue > red) return 'Blue';
  return 'Tied';
}

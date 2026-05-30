/**
 * Domain types — entities the app reasons about.
 *
 * Pure data shapes. No methods, no React, no IO.
 */

import type { HoleResult, Team } from '@/rules/rulebook';

export type { HoleResult, Team };

export type PlayerId = string;
export type CourseId = string;
export type TeeId = string;
export type MatchId = string;

/** Player record (kept locally; cloud sync is opt-in). */
export interface Player {
  id: PlayerId;
  firstName: string;
  lastName: string;
  /** USGA handicap index, e.g. 8.4. */
  index: number;
  ghin?: string;
  defaultTeam?: Team;
}

export interface CourseHole {
  /** 1-18. */
  number: number;
  par: number;
  yards: number;
  /** 1-18, lower = harder. */
  strokeIndex: number;
}

export interface CourseTee {
  id: TeeId;
  name: string;
  /** Exactly 18 holes, in order 1..18. */
  holes: CourseHole[];
}

export interface Course {
  id: CourseId;
  name: string;
  tees: CourseTee[];
}

/** A player assigned to a team and a tee for one match. */
export interface MatchPlayer {
  playerId: PlayerId;
  team: Team;
  teeId: TeeId;
}

/** Inputs that don't change during the round. */
export interface MatchSetup {
  id: MatchId;
  date: string; // ISO date
  courseId: CourseId;
  players: [MatchPlayer, MatchPlayer, MatchPlayer, MatchPlayer];
  bigGame: boolean;
  /** Big Game uses the lowest index in the field; pass it in when known. */
  bigGameBaseIndex?: number;
}

/** Per-player score input for one hole. */
export interface PlayerHoleInput {
  /** Strokes taken (gross). For a pick-up, leave undefined and set `pickedUp`. */
  gross?: number;
  pickedUp?: boolean;
  /** Junk-eligibility flags the scorer toggled for this player on this hole. */
  flags?: JunkFlags;
}

export interface JunkFlags {
  /** §6 Sandie — played from a bunker on this hole. */
  hadBunkerShot?: boolean;
  /** §6 Greenie — tee shot finished on the green (par-3 only). */
  onGreenFromTee?: boolean;
  /** §6 Greenie penalty — three or more putts after being a greenie candidate. */
  threePutts?: boolean;
  /** §6 LD10 — longest drive in upper fairway / collar / green on hole 17. */
  ld10Winner?: boolean;
}

/** Resolved per-player score for a single hole. */
export interface PlayerHoleScore {
  playerId: PlayerId;
  team: Team;
  /** Gross strokes; for pickups this is `par + strokesGiven + 2` capped at net double-bogey. */
  gross: number;
  /** Net strokes after handicap. */
  net: number;
  /** Handicap strokes received on this hole. */
  strokes: number;
  pickedUp: boolean;
  flags: JunkFlags;
}

export interface HoleScore {
  hole: number;
  players: PlayerHoleScore[];
  /** Lower net per team — Red total, Blue total. */
  teamNet: { Red: number; Blue: number };
  result: HoleResult;
}

export type JunkType = 'Birdie' | 'Sandie' | 'Greenie' | 'GreeniePenalty' | 'LD10';

export interface JunkEvent {
  hole: number;
  playerId: PlayerId;
  team: Team;
  type: JunkType;
  /** Dollar amount paid to the player's team. Carries (greenie) record value 0 with `carry: true`. */
  value: number;
  /** True if this event is a roll-over (greenie carry), not yet paid. */
  carry?: boolean;
}

export interface LedgerRow {
  hole: number;
  /** Base in dollars for THIS hole (after any double called on this hole). */
  base: number;
  /** Doubles in effect after this hole. */
  doubles: number;
  /** Carry going INTO this hole (from previous halves). */
  carryIn: number;
  /** Carry going OUT of this hole (0 unless this hole was halved). */
  carryOut: number;
  /** Side-match payout in dollars for this hole, 0 if halved. */
  payout: number;
  result: HoleResult;
  /** Per-player running side-match totals after this hole. */
  runningTotals: Record<PlayerId, number>;
  /** Junk events that resolved on this hole. */
  junk: JunkEvent[];
  /** If Big Game is on, the row for this hole. */
  bigGame?: BigGameRow;
}

export interface BigGameRow {
  hole: number;
  /** The two lowest net scores from the foursome, ascending. */
  bestNet: [number, number];
  /** Sum of the two best nets. */
  subtotal: number;
  /** The player ids contributing the two best nets. */
  contributors: [PlayerId, PlayerId];
}

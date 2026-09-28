/**
 * Millbrook Rulebook — frozen constants.
 *
 * The canonical text lives in `../../../Millbrook-Game-and-Big-Game-Rulebooks.md`.
 * Every value below cites the section it implements. If the rulebook changes,
 * update this file first; the engine reads only from here.
 */

/** §4.1 — Hole 1 base is fixed at $1. */
export const BASE_HOLE_1 = 1;

/** §4.2 / §4.3 — Hole 2 base is $2; holes 3+ remain $2 until a double is called. */
export const BASE_HOLE_2_PLUS = 2;

/** §6 — LD10 is a fixed $10 stake, independent of the hole base. */
export const LD10_STAKE = 10;

/** §6A — The Millbrook par-3 holes. Greenie carry runs through these in order. */
export const PAR3_HOLES = [2, 7, 9, 11, 16, 18] as const;

/** §6A — Capturing all six par-3 greenies in a round is the "greenie grandé". */
export const GREENIE_GRANDE_COUNT = PAR3_HOLES.length;

/** §6 — Junk only applies to the side match, never to the Big Game (§3). */
export const JUNK_APPLIES_TO_BIG_GAME = false;

/** §3A — Side-match pick-up records a net double-bogey. */
export const PICKUP_NET_OVER_PAR = 2;

/** Big Game §6 — Entry fee per player; pool goes to the winning foursome. */
export const BIG_GAME_ENTRY_FEE = 20;

/** §6 — Birdie pays once per player per round. */
export const BIRDIE_ONCE_PER_PLAYER_PER_ROUND = true;

/** Engine-wide sanity constant — every Millbrook round is 18 holes. */
export const HOLE_COUNT = 18;

/** Number of players in a Millbrook foursome. */
export const FOURSOME_SIZE = 4;

/** Result a hole can produce in the side match. */
export type HoleResult = 'Red' | 'Blue' | 'Push';

/** Team identifier. */
export type Team = 'Red' | 'Blue';

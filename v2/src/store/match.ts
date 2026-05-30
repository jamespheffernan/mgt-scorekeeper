/**
 * Match store — the single mutable surface for the in-flight match. Wraps the
 * pure engine with imperative actions the UI can call, and persists through
 * Dexie so a refresh resumes the round on the same hole.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// The engine state carries a Set<PlayerId> (birdie-once-per-player ledger).
// Immer needs the MapSet plugin to draft Sets safely.
enableMapSet();
import {
  allocateStrokes,
  applyDouble as engineApplyDouble,
  applyHole as engineApplyHole,
  initialEngineState,
  type EngineState,
  type PlayerSlot,
} from '@/engine';
import { parsForTee, strokeIndexesForTee } from '@/courses/millbrook';
import type { Course, MatchSetup, PlayerHoleInput, Team } from '@/domain/types';
import { dexieStorage } from './dexieStorage';
import { stateReplacer, stateReviver, serialize } from './serialize';
import { matchesRepo } from '@/persistence/repos';

export type MatchStatus = 'idle' | 'active' | 'finished';

export interface MatchPlayerView {
  playerId: string;
  firstName: string;
  lastName: string;
  index: number;
  team: Team;
  teeId: string;
  strokes: number[];
}

export interface MatchState {
  status: MatchStatus;
  setup: MatchSetup | null;
  course: Course | null;
  players: MatchPlayerView[];
  engine: EngineState | null;

  startMatch: (input: StartMatchInput) => void;
  callDouble: (team: Team) => void;
  submitHole: (hole: number, inputs: PlayerHoleInput[], ld10AcceptedForThisHole?: boolean) => void;
  resetMatch: () => void;
}

export interface StartMatchInput {
  date?: string;
  course: Course;
  players: {
    playerId: string;
    firstName: string;
    lastName: string;
    index: number;
    team: Team;
    teeId: string;
  }[];
  bigGame: boolean;
  bigGameBaseIndex?: number;
}

function makeSlots(input: StartMatchInput): MatchPlayerView[] {
  const indexes = input.players.map((p) => p.index);
  const strokeIndexes = input.players.map((p) => strokeIndexesForTee(input.course, p.teeId));
  const matrix = allocateStrokes({
    indexes,
    strokeIndexes,
    ...(typeof input.bigGameBaseIndex === 'number' ? { baseIndex: input.bigGameBaseIndex } : {}),
  });
  return input.players.map((p, i) => ({
    playerId: p.playerId,
    firstName: p.firstName,
    lastName: p.lastName,
    index: p.index,
    team: p.team,
    teeId: p.teeId,
    strokes: matrix[i] ?? new Array(18).fill(0),
  }));
}

export const useMatchStore = create<MatchState>()(
  persist(
    immer((set, get) => ({
      status: 'idle',
      setup: null,
      course: null,
      players: [],
      engine: null,

      startMatch: (input) => {
        if (input.players.length !== 4) {
          throw new Error('startMatch: need exactly four players');
        }
        const players = makeSlots(input);
        const engineSlots: PlayerSlot[] = players.map((p) => ({
          id: p.playerId,
          team: p.team,
          strokes: p.strokes,
        }));
        const engine = initialEngineState(engineSlots);
        set((s) => {
          s.status = 'active';
          s.setup = {
            id: cryptoId(),
            date: input.date ?? new Date().toISOString().slice(0, 10),
            courseId: input.course.id,
            players: input.players.map((p) => ({
              playerId: p.playerId,
              team: p.team,
              teeId: p.teeId,
            })) as MatchSetup['players'],
            bigGame: input.bigGame,
            ...(typeof input.bigGameBaseIndex === 'number'
              ? { bigGameBaseIndex: input.bigGameBaseIndex }
              : {}),
          };
          s.course = input.course;
          s.players = players;
          s.engine = engine;
        });
        void get;
      },

      callDouble: (team) => {
        set((s) => {
          if (!s.engine) return;
          s.engine = engineApplyDouble(s.engine, team);
        });
      },

      submitHole: (hole, inputs, ld10) => {
        set((s) => {
          if (!s.engine || !s.course || !s.setup || s.players.length !== 4) return;
          const slots: PlayerSlot[] = s.players.map((p) => ({
            id: p.playerId,
            team: p.team,
            strokes: p.strokes,
          }));
          const par = parsForTee(s.course, s.players[0]!.teeId);
          // NB: par-per-hole depends on tee, but we use the first player's tee
          // as the "card par" used for outcome scoring. Per-player tee yardage
          // doesn't affect par for the hole result; that's the way the rulebook
          // describes it ("course's stroke-index holes") — par is a property of
          // the card the foursome plays. Net is computed per player using each
          // player's own strokes from their own tee.
          const { state: next } = engineApplyHole({
            state: s.engine,
            players: slots,
            course: { par },
            bigGame: s.setup.bigGame,
            submission: { hole, inputs, ...(ld10 ? { ld10AcceptedForThisHole: ld10 } : {}) },
          });
          s.engine = next;
          if (next.finished) {
            s.status = 'finished';
            void saveFinishedMatch(s.setup, s.players, next);
          }
        });
      },

      resetMatch: () => {
        set((s) => {
          s.status = 'idle';
          s.setup = null;
          s.course = null;
          s.players = [];
          s.engine = null;
        });
      },
    })),
    {
      name: 'mgt:match',
      storage: createJSONStorage(() => dexieStorage, {
        replacer: stateReplacer,
        reviver: stateReviver,
      }),
      partialize: (s) => ({
        status: s.status,
        setup: s.setup,
        course: s.course,
        players: s.players,
        engine: s.engine,
      }),
    },
  ),
);

function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/**
 * Write a finished match to the durable `matches` table for history. Fire and
 * forget — UI doesn't block on it.
 */
async function saveFinishedMatch(
  setup: MatchSetup,
  players: MatchPlayerView[],
  engine: EngineState,
): Promise<void> {
  const last = engine.ledger.at(-1);
  await matchesRepo.put({
    id: setup.id,
    date: setup.date,
    courseId: setup.courseId,
    bigGame: setup.bigGame,
    playerIds: players.map((p) => p.playerId),
    bigGameTotal: engine.bigGameTotal,
    finalRunningTotals: last?.runningTotals ?? {},
    finishedAt: new Date().toISOString(),
    state: serialize(engine),
  });
}

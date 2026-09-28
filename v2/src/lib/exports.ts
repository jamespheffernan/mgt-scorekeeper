/**
 * Export helpers — CSV ledger and PNG snapshot of the settlement card.
 *
 * The CSV layout intentionally mirrors the visible ledger row-for-row so the
 * scorer can paste it into a spreadsheet and the numbers line up with what
 * everyone saw on screen during the round.
 */

import type { EngineState } from '@/engine';
import type { JunkEvent, LedgerRow } from '@/domain/types';
import type { MatchPlayerView } from '@/store';

interface CsvBuildInput {
  engine: EngineState;
  players: MatchPlayerView[];
  bigGame: boolean;
  par: number[];
  date: string;
  courseName: string;
}

export function buildLedgerCsv(input: CsvBuildInput): string {
  const { engine, players, bigGame, par, date, courseName } = input;

  const rows: string[] = [];
  // Heading lines — short metadata, then a blank line, then the table.
  rows.push(csvLine(['Millbrook Scorekeeper · Ledger Export']));
  rows.push(csvLine(['Date', date]));
  rows.push(csvLine(['Course', courseName]));
  rows.push(csvLine(['Big Game', bigGame ? 'Yes' : 'No']));
  rows.push('');

  const playerHeader = players.flatMap((p) => [
    `${p.firstName} ${p.lastName} net`,
    `${p.firstName} ${p.lastName} run`,
  ]);
  const header = [
    'Hole',
    'Par',
    'Result',
    'Base',
    'Carry in',
    'Carry out',
    'Payout',
    'Doubles',
    'Junk',
    ...(bigGame ? ['BG best', 'BG subtotal'] : []),
    ...playerHeader,
  ];
  rows.push(csvLine(header));

  for (let h = 1; h <= 18; h++) {
    const r = engine.ledger.find((x) => x.hole === h);
    if (!r) {
      rows.push(csvLine([h.toString(), (par[h - 1] ?? '').toString(), '—']));
      continue;
    }
    const junkSummary = summariseJunk(r.junk, players);
    const playerCells = players.flatMap((p) => [
      netForPlayer(r, p.playerId),
      formatMoney(r.runningTotals[p.playerId] ?? 0),
    ]);
    rows.push(
      csvLine([
        h.toString(),
        (par[h - 1] ?? '').toString(),
        r.result,
        `$${r.base}`,
        formatMoney(r.carryIn),
        formatMoney(r.carryOut),
        formatMoney(r.payout),
        (2 ** r.doubles).toString() + 'x',
        junkSummary,
        ...(bigGame
          ? r.bigGame
            ? [`${r.bigGame.bestNet.join('+')}`, r.bigGame.subtotal.toString()]
            : ['', '']
          : []),
        ...playerCells,
      ]),
    );
  }

  // Totals row.
  rows.push('');
  const last = engine.ledger.at(-1);
  if (last) {
    const totals = players.map((p) => formatMoney(last.runningTotals[p.playerId] ?? 0));
    rows.push(
      csvLine([
        'Final',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ...(bigGame ? ['', engine.bigGameTotal.toString()] : []),
        ...players.flatMap((_, i) => ['', totals[i] ?? '']),
      ]),
    );
  }

  return rows.join('\n');
}

function netForPlayer(_row: LedgerRow, _playerId: string): string {
  // The engine doesn't currently persist per-player gross/net on the ledger
  // row (it only persists the resolved running totals). For v2.1 we'll lift
  // PlayerHoleScore onto the row; for now, "—" keeps the column shape stable.
  return '—';
}

function summariseJunk(events: JunkEvent[], players: MatchPlayerView[]): string {
  if (events.length === 0) return '';
  return events
    .map((e) => {
      const player = players.find((p) => p.playerId === e.playerId);
      const name = player ? `${player.firstName[0]}.${player.lastName}` : 'unknown';
      return `${e.type}(${name})`;
    })
    .join('; ');
}

function formatMoney(value: number): string {
  if (value === 0) return '0';
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2);
}

function csvLine(cells: string[]): string {
  return cells.map(csvCell).join(',');
}

function csvCell(cell: string | undefined): string {
  const text = cell ?? '';
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadBlob(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function capturePng(node: HTMLElement, filename: string): Promise<void> {
  // Dynamic import keeps the html-to-image bundle out of the main chunk.
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-paper').trim() || '#fbf4e3',
    skipFonts: false,
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

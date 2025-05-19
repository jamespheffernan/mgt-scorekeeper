import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PaperTrailDrawer from './PaperTrailDrawer';

jest.mock('../../store/gameStore', () => ({
  useGameStore: jest.fn(fn => fn({
    match: { carry: 1 },
    players: [
      {id:'1',name:'Alice'},
      {id:'2',name:'Bob'},
      {id:'3',name:'Carol'},
      {id:'4',name:'Dave'}
    ],
    playerTeams: ['Red','Blue','Red','Blue'],
    ledger: [{hole:1,base:2,carryAfter:1,doubles:1,payout:4,runningTotals:[10,8,12,9]}],
    holeScores: [{hole:1,gross:[4,5,4,5],net:[4,5,4,5],teamNet:[4,5]}],
    junkEvents: [
      { hole: 1, playerId: '1', teamId: 'Red', type: 'Sandy', value: 1 },
      { hole: 1, playerId: '2', teamId: 'Blue', type: 'Chippy', value: 2 },
    ],
    bigGameRows: [],
  })),
  selectHoleSummary: jest.fn(() => ({
    hole: 1,
    base: 2,
    carryIn: 1,
    payout: 4,
    doubles: 1,
    winner: 'Red',
    previousTotals: [0,0,0,0],
    runningTotals: [10,8,12,9],
    scoresBeforeHole: { redScore: 10, blueScore: 8 },
    scoresAfterHole: { redScore: 14, blueScore: 8 },
    junkEvents: [
      { playerName: 'Alice', type: 'Sandy', value: 1 },
      { playerName: 'Bob', type: 'Chippy', value: 2 },
    ],
    junkByTeam: { Red: 1, Blue: 2 },
    netJunk: -1,
  }))
}));

describe('PaperTrailDrawer', () => {
  it('renders a narrative list of calculation steps', () => {
    render(<PaperTrailDrawer open={true} hole={1} onClose={() => {}} />);
    const liList = screen.getAllByRole('listitem');
    const hasLi = (label: string, value: string) =>
      liList.some(li => li.textContent?.replace(/\s+/g, '').includes(label.replace(/\s+/g, '')) &&
        li.textContent?.replace(/\s+/g, '').includes(value.replace(/\s+/g, '')));
    expect(hasLi('Base bet:', '$2')).toBe(true);
    expect(hasLi('Carry In:', '$1')).toBe(true);
    expect(hasLi('Doubles:', 'Yes(1)')).toBe(true);
    expect(screen.getByText(/Junk Events/i)).toBeInTheDocument();
    expect(screen.getByText(/Alice: Sandy/i).textContent?.replace(/\s+/g, '') ?? '').toBe('Alice:Sandy($1)');
    expect(screen.getByText(/Bob: Chippy/i).textContent?.replace(/\s+/g, '') ?? '').toBe('Bob:Chippy($2)');
    expect(hasLi('Winner:', 'Red')).toBe(true);
    expect(hasLi('Payout:', '$4')).toBe(true);
    expect(hasLi('Team Totals Before:', 'Red$10,Blue$8')).toBe(true);
    expect(hasLi('Team Totals After:', 'Red$14,Blue$8')).toBe(true);
  });
}); 
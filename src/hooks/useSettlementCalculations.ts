import { useMemo } from 'react';
import {
  formatCurrency,
  getTeamTotals,
  getPlayerJunkTotal as getPlayerJunkTotalUtil,
  getTeamJunkTotal as getTeamJunkTotalUtil,
  calculateGameStats,
  calculateHoleWins,
  determineWinningTeam,
  generateCsvData
} from '../utils/settlementUtils';

type UseSettlementCalculationsProps = {
  match: any;
  players: any[];
  playerTeams: string[];
  ledger: any[];
  junkEvents: any[];
  bigGameRows: any[];
  holeScores: any[];
};

const useSettlementCalculations = ({
  match,
  players,
  playerTeams,
  ledger,
  junkEvents,
  bigGameRows,
  holeScores,
}: UseSettlementCalculationsProps) => {
  
  // Calculate final ledger values
  const finalLedger = useMemo(() => {
    return ledger.length > 0 ? ledger[ledger.length - 1] : null;
  }, [ledger]);
  
  // Calculate game statistics
  const gameStats = useMemo(() => {
    return calculateGameStats(ledger, junkEvents, match);
  }, [ledger, junkEvents, match]);
  
  // Calculate hole wins
  const holeWins = useMemo(() => {
    return calculateHoleWins(holeScores);
  }, [holeScores]);
  
  // Get player junk total
  const getPlayerJunkTotal = (playerId: string): number => {
    return getPlayerJunkTotalUtil(playerId, junkEvents);
  };
  
  // Get team junk total
  const getTeamJunkTotal = (team: 'Red' | 'Blue'): number => {
    return getTeamJunkTotalUtil(team, junkEvents);
  };
  
  // Calculate team totals
  const teamTotals = useMemo(() => {
    return getTeamTotals(finalLedger, players, playerTeams);
  }, [finalLedger, players, playerTeams]);
  
  // Determine winning team
  const winningTeam = useMemo(() => {
    return determineWinningTeam(teamTotals);
  }, [teamTotals]);
  
  // Generate CSV data
  const generateCsvDataForExport = () => {
    return generateCsvData(
      match,
      teamTotals,
      getTeamJunkTotal,
      players,
      playerTeams,
      finalLedger,
      getPlayerJunkTotal,
      holeWins,
      gameStats,
      bigGameRows,
      ledger,
      holeScores
    );
  };
  
  return {
    finalLedger,
    gameStats,
    holeWins,
    teamTotals,
    winningTeam,
    getPlayerJunkTotal,
    getTeamJunkTotal,
    formatCurrency,
    generateCsvDataForExport
  };
};

export default useSettlementCalculations; 
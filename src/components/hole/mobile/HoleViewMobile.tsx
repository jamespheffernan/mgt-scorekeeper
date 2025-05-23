import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, Player, getPlayerStrokeIndexes, Team } from '../../../store/gameStore';
import { PlayersFourBox } from './PlayersFourBox';
import { JunkFlags } from '../../../store/gameStore';
import { allocateStrokes, allocateStrokesMultiTee } from '../../../calcEngine/strokeAllocator';
import { Course, TeeOption } from '../../../db/courseModel';
import { millbrookDb } from '../../../db/millbrookDb';
import CancelGameDialog from '../../CancelGameDialog';
import EndGameDialog from '../../EndGameDialog';
import TopBar from '../../TopBar';
import { PageHeader } from '../../PageHeader';
import { SectionCard } from '../../SectionCard';
import { PotRow } from '../../PotRow';
import { BottomNav } from '../../BottomNav';
import { NavTabs } from '../../NavTabs';
import './HoleViewMobile.css';
import { colors } from '../../../theme/tokens';
import { Chip } from '../../Chip';

// Helper function to get player initials
const getInitials = (player: Player): string => {
  if (!player) return '??';
  if (player.first && player.last) {
    return `${player.first[0]}${player.last[0]}`.toUpperCase();
  }
  if (player.name) {
    const parts = player.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return player.name.substring(0, 2).toUpperCase();
  }
  return 'N/A';
};

export const HoleViewMobile: React.FC = () => {
  const navigate = useNavigate();
  
  // Access store state and actions
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const isDoubleAvailable = useGameStore(state => state.isDoubleAvailable);
  const trailingTeam = useGameStore(state => state.trailingTeam);
  const enterHoleScores = useGameStore(state => state.enterHoleScores);
  const callDouble = useGameStore(state => state.callDouble);
  const cancelMatch = useGameStore(state => state.cancelMatch);
  const ledger = useGameStore(state => state.ledger);
  const bigGameRows = useGameStore(state => state.bigGameRows);
  
  // Current hole
  const currentHole = match.currentHole;
  const currentHoleIndex = currentHole - 1; // 0-indexed
  const defaultPar = match.holePar[currentHoleIndex];
  
  // State for course data
  const [course, setCourse] = useState<Course | null>(null);
  const [teeOptions, setTeeOptions] = useState<Record<string, TeeOption>>({});
  const [playerPars, setPlayerPars] = useState<number[]>([defaultPar, defaultPar, defaultPar, defaultPar]);
  const [playerStrokeIndexes, setPlayerStrokeIndexes] = useState<number[][] | null>(null); // For all 18 holes player SIs
  const [playerYardages, setPlayerYardages] = useState<number[]>([0, 0, 0, 0]);
  const [playerStrokes, setPlayerStrokes] = useState<number[]>([0, 0, 0, 0]); // These are Millbrook strokes for current hole
  
  // Local state for scores and junk
  const [grossScores, setGrossScores] = useState<[number, number, number, number]>([
    defaultPar, defaultPar, defaultPar, defaultPar
  ]);
  
  const [junkFlags, setJunkFlags] = useState<JunkFlags[]>([
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }
  ]);
  
  // Error handling and submission state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEndGameDialog, setShowEndGameDialog] = useState(false);

  // Player indexes (for stroke calculation)
  const playerIndexes = useMemo(() => players.map(p => p.index), [players]);

  // Detect standalone mode
  const isStandalone = useMemo(() => {
    return (
      (window.navigator as any).standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    );
  }, []);

  // Define navigation items for NavTabs
  const navItems = [
    { id: 'viewLedger', label: 'View Ledger', href: '/ledger' },
    { id: 'cancelGame', label: 'Cancel Game', href: '#' } // href: '#' or handle click separately
  ];

  // Handle navigation for NavTabs, specifically for cancel game
  const handleNavTabClick = (itemId: string) => {
    console.log('[HoleViewMobile] handleNavTabClick received itemId:', itemId);
    if (itemId === 'cancelGame') {
      console.log("[HoleViewMobile] 'cancelGame' itemId matched, calling setShowCancelDialog(true).");
      setShowCancelDialog(true);
    } else {
      const item = navItems.find(nav => nav.id === itemId);
      if(item && item.href !== '#') navigate(item.href);
    }
  };
  
  // Get the current standings
  const getCurrentStandings = () => {
    if (ledger.length === 0) return { redTotal: 0, blueTotal: 0 };
    
    const lastLedgerEntry = ledger[ledger.length - 1];
    const firstRedIndex = playerTeams.findIndex(team => team === 'Red');
    const firstBlueIndex = playerTeams.findIndex(team => team === 'Blue');
    const redTotal = lastLedgerEntry.runningTotals[firstRedIndex] ?? 0;
    const blueTotal = lastLedgerEntry.runningTotals[firstBlueIndex] ?? 0;
    return {
      redTotal,
      blueTotal,
    };
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    const formattedAmount = Math.abs(amount).toString();
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${formattedAmount}`;
  };
  
  // Get player stroke indexes for all 18 holes for their selected tees
  useEffect(() => {
    const fetchPlayerSIs = async () => {
      if (match.courseId && match.playerTeeIds && players.length > 0) {
        const sIs = await getPlayerStrokeIndexes(match.courseId, match.playerTeeIds);
        setPlayerStrokeIndexes(sIs);

        // Also fetch course data for pars, yardages, and teeOptions map for the mobile-hole-info display
        const courseData = await millbrookDb.getCourse(match.courseId);
        if (courseData) {
          setCourse(courseData);
          const newTeeOptions: Record<string, TeeOption> = {};
          courseData.teeOptions.forEach(tee => { newTeeOptions[tee.id] = tee; });
          setTeeOptions(newTeeOptions);

          const newPlayerPars: number[] = [];
          const newPlayerYardages: number[] = [];
          match.playerTeeIds.forEach((teeId, index) => {
            const tee = newTeeOptions[teeId];
            if (tee && tee.holes) {
              const holeInfo = tee.holes.find(h => h.number === currentHole);
              if (holeInfo) {
                newPlayerPars[index] = holeInfo.par;
                newPlayerYardages[index] = holeInfo.yardage;
              } else {
                newPlayerPars[index] = defaultPar; newPlayerYardages[index] = 0;
              }
            } else {
              newPlayerPars[index] = defaultPar; newPlayerYardages[index] = 0;
            }
          });
          setPlayerPars(newPlayerPars);
          setPlayerYardages(newPlayerYardages);
          setGrossScores(newPlayerPars as [number, number, number, number]);
        }
      }
    };
    fetchPlayerSIs();
  }, [match.courseId, match.playerTeeIds, players.length, currentHole, defaultPar]);

  // SIs for the current hole for each player (for PlayersFourBox and mobile-hole-info)
  const currentHolePlayerSIs = useMemo(() => {
    if (!playerStrokeIndexes) return players.map(() => currentHole); // Fallback
    return playerStrokeIndexes.map(sIndexArray => sIndexArray[currentHoleIndex] || currentHole);
  }, [playerStrokeIndexes, currentHoleIndex, currentHole, players]);

  // Millbrook Strokes Calculation (for current hole)
  useEffect(() => {
    if (playerIndexes && playerStrokeIndexes && playerStrokeIndexes.length > 0 && players.length > 0) {
      // Validate that all players have valid stroke index arrays
      const allValidSIs = playerStrokeIndexes.every(siArray => 
        siArray && Array.isArray(siArray) && siArray.length === 18
      );
      
      if (allValidSIs) {
        const millbrookStrokeMap = allocateStrokesMultiTee(playerIndexes, playerStrokeIndexes);
        const millbrookStrokesForCurrentHole = millbrookStrokeMap.map(
          (pStrokes) => pStrokes[currentHoleIndex] || 0
        );
        setPlayerStrokes(millbrookStrokesForCurrentHole);
      } else {
        console.warn('[HoleViewMobile] Invalid player stroke indexes, falling back to standard allocation');
        // Fallback to standard allocation
        const fallbackStrokeMap = allocateStrokes(playerIndexes, match.holeSI);
        const millbrookStrokesForCurrentHole = fallbackStrokeMap.map(
          (pStrokes) => pStrokes[currentHoleIndex] || 0
        );
        setPlayerStrokes(millbrookStrokesForCurrentHole);
      }
    } else if (playerIndexes && players.length > 0) {
      // Standard fallback allocation
      const fallbackStrokeMap = allocateStrokes(playerIndexes, match.holeSI);
      const millbrookStrokesForCurrentHole = fallbackStrokeMap.map(
        (pStrokes) => pStrokes[currentHoleIndex] || 0
      );
      setPlayerStrokes(millbrookStrokesForCurrentHole);
    }
  }, [playerIndexes, playerStrokeIndexes, currentHoleIndex, match.holeSI, players]);

  // Big Game Strokes Calculation
  const bigGameStrokeMap = useMemo(() => {
    if (
      !match.bigGame ||
      typeof match.bigGameSpecificIndex !== 'number' ||
      !playerStrokeIndexes || 
      playerStrokeIndexes.length === 0 ||
      !players.length
    ) {
      return null;
    }
    
    // Validate that all players have valid stroke index arrays
    const allValidSIs = playerStrokeIndexes.every(siArray => 
      siArray && Array.isArray(siArray) && siArray.length === 18
    );
    
    if (!allValidSIs) {
      console.warn('[HoleViewMobile] Invalid player stroke indexes for Big Game, using standard allocation');
      // Fallback to standard allocation for Big Game
      return allocateStrokes(playerIndexes, match.holeSI, match.bigGameSpecificIndex);
    }
    
    return allocateStrokesMultiTee(playerIndexes, playerStrokeIndexes, match.bigGameSpecificIndex);
  }, [match.bigGame, match.bigGameSpecificIndex, playerIndexes, playerStrokeIndexes, players, match.holeSI]);

  const bigGameStrokesForCurrentHole = useMemo(() => {
    if (!bigGameStrokeMap) return players.map(() => 0); // Return array of zeros if no big game strokes
    return bigGameStrokeMap.map(pStrokes => pStrokes[currentHoleIndex] || 0);
  }, [bigGameStrokeMap, currentHoleIndex, players]);

  // Handle score update from PlayersFourBox
  const updateScore = (playerIndex: number, score: number) => {
    const newScores = [...grossScores] as [number, number, number, number];
    newScores[playerIndex] = score;
    setGrossScores(newScores);
  };
  
  // Handle junk update from PlayersFourBox
  const updateJunk = (playerIndex: number, updatedJunk: JunkFlags) => {
    const newJunk = [...junkFlags];
    newJunk[playerIndex] = updatedJunk;
    setJunkFlags(newJunk);
  };
  
  // Handle double call
  const handleCallDouble = () => {
    callDouble();
  };
  
  // Handle score submission
  const submitScores = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await enterHoleScores(currentHole, grossScores, junkFlags);
      if (currentHole === 18) {
        setShowEndGameDialog(true);
      } else {
        navigate(`/hole/${currentHole + 1}`);
      }
    } catch (error) {
      console.error('Error submitting scores:', error);
      setErrorMessage('Failed to submit scores. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Cancel the game (used by NavTabs if that path is taken)
  const cancelGame = async () => {
    try {
      await cancelMatch();
      navigate('/'); // Navigate to home/main menu after cancellation
    } catch (error) {
      console.error('Error canceling game:', error);
      setErrorMessage('Failed to cancel game. Please try again.');
    }
  };
  
  // End the game after hole 18 (primarily for EndGameDialog to call if needed, though it handles its own)
  // This function might become redundant if EndGameDialog always handles its own logic.
  const endGame = async () => {
    try {
      await useGameStore.getState().finishRound();
      navigate('/settlement');
    } catch (error) {
      console.error('Error ending game:', error);
      setErrorMessage('Failed to end game. Please try again.');
    }
  };
  
  // Custom style for tee info chips
  const teeChipStyle = {
    fontSize: '0.85rem',
    width: 24,
    height: 24,
    minWidth: 24,
    minHeight: 24,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Sofia Sans Extra Condensed', sans-serif",
    fontWeight: 600,
    marginLeft: 4,
    marginRight: 2,
    backgroundColor: undefined, // set below
    color: '#fff',
  };
  
  // Render method
  return (
    <div className="hole-view mobile-hole-view hole-view-root">
      {/* <TopBar title="The Millbrook Game" /> */}
      
      <div className="hole-content-container">
        <PageHeader 
          title="" 
          subtitle="" 
        />

        <NavTabs 
          items={navItems} 
          current={ '' }
          onTabClick={handleNavTabClick}
        />

        <SectionCard>
          <div className="mobile-hole-info">
            {match.playerTeeIds && course && Object.keys(teeOptions).length > 0 ? 
              [...new Set(match.playerTeeIds)].map(teeId => {
                const tee = teeOptions[teeId];
                if (!tee) return null;
                const playerIndicesUsingThisTee = (match.playerTeeIds ?? [])
                  .map((id, idx) => id === teeId ? idx : -1)
                  .filter(idx => idx !== -1);
                
                if (playerIndicesUsingThisTee.length === 0) return null;

                const chips = playerIndicesUsingThisTee
                  .filter(idx => playerStrokes[idx] > 0)
                  .map(idx => {
                    const player = players[idx];
                    if (!player) return null;
                    const team = playerTeams[idx];
                    const pastelRed = 'rgba(239,68,68,0.5)';
                    const pastelBlue = 'rgba(59,130,246,0.5)';
                    const bgColor = team === 'Red' ? pastelRed : pastelBlue;
                    return (
                      <Chip
                        key={player.id}
                        name={getInitials(player)}
                        className={""}
                        style={{ ...teeChipStyle, backgroundColor: bgColor, color: 'white' }}
                      />
                    );
                  }).filter(Boolean);

                return (
                  <div key={teeId} className="tee-info-row">
                    <span>Hole {currentHole}</span>
                    <span>Par {playerPars[playerIndicesUsingThisTee[0]]}</span>
                    <span>SI: {currentHolePlayerSIs[playerIndicesUsingThisTee[0]] || currentHole}</span>
                    {chips.length > 0 && <span>{chips}</span>}
                  </div>
                );
              })
              : 
              <div className="tee-info-row tee-info-row-fallback">
                <span>Hole {currentHole}</span>
                <span>Par {defaultPar}</span>
                <span>SI: {currentHole}</span>
              </div>
            }
          </div>
        </SectionCard>
        
        <SectionCard>
          <div className="pot-summary-bar" style={{ minHeight: 40 }}>
            <div className="pot-summary-item pot-summary-item-left" data-testid="pot-summary-item-left">
              <span>Hole Value</span>
              <span>${match.base}</span>
            </div>
            <div className="pot-summary-item pot-summary-item-center">
              {(() => {
                const standings = getCurrentStandings();
                const redTotal = standings.redTotal;
                const blueTotal = standings.blueTotal;
                let displayColor = '#374151'; // Tailwind gray-700 for tied
                let scoreText = '$0';

                if (redTotal > blueTotal) {
                  displayColor = '#ef4444'; // Tailwind red-500
                  scoreText = `+$${redTotal - blueTotal}`;
                } else if (blueTotal > redTotal) {
                  displayColor = '#3b82f6'; // Tailwind blue-500
                  scoreText = `+$${blueTotal - redTotal}`;
                }

                return (
                  <>
                    <span
                      style={{
                        color: displayColor,
                        fontWeight: 'bold',
                        fontSize: '2rem',
                      }}
                    >
                      {scoreText}
                    </span>
                    {/* Big Game pill below score */}
                    {match.bigGame && Array.isArray(bigGameRows) && (() => {
                      // Get all rows up to and including current hole
                      const rowsUpToCurrent = bigGameRows.filter(r => r.hole <= currentHole);
                      if (rowsUpToCurrent.length === 0) {
                        return (
                          <div
                            style={{
                              marginTop: 8,
                              display: 'inline-block',
                              backgroundColor: '#166534',
                              color: '#fff',
                              borderRadius: 20,
                              padding: '2px 12px',
                              fontWeight: 600,
                              fontSize: '1rem',
                              letterSpacing: 1,
                            }}
                          >
                            BG: -- (--)
                          </div>
                        );
                      }
                      const runningTotal = rowsUpToCurrent.reduce((sum, row) => sum + row.subtotal, 0);
                      // Sum par for all holes up to current (use match.holePar)
                      const holesCounted = rowsUpToCurrent.length;
                      const parSum = rowsUpToCurrent.reduce((sum, row) => sum + (match.holePar[row.hole - 1] || 4), 0);
                      const toPar = runningTotal - (parSum * 2);
                      const toParStr = toPar > 0 ? `+${toPar}` : toPar.toString();
                      return (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'inline-block',
                            backgroundColor: '#166534',
                            color: '#fff',
                            borderRadius: 20,
                            padding: '2px 12px',
                            fontWeight: 600,
                            fontSize: '1rem',
                            letterSpacing: 1,
                          }}
                        >
                          {`BG: ${runningTotal} (${toParStr})`}
                        </div>
                      );
                    })()}

                    {/* NEW: Big Game Stroke Chips directly underneath the pill above, if Big Game is active */}
                    {match.bigGame && typeof match.bigGameSpecificIndex === 'number' && playerStrokeIndexes && (
                      <div className="big-game-stroke-chips-summary" style={{ marginTop: '8px' }}>
                        {players.map((player, idx) => {
                          const strokes = bigGameStrokesForCurrentHole[idx];
                          if (strokes > 0) {
                            const chipText = strokes > 1 ? `${getInitials(player)} ${strokes}` : getInitials(player);
                            return (
                              <Chip
                                key={player.id}
                                name={chipText}
                                className="stroke-chip big-game-stroke-chip"
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="pot-summary-item pot-summary-item-right" data-testid="pot-summary-item-right">
              <span>Carrying</span>
              <span>${match.carry}</span>
            </div>
          </div>
        </SectionCard>
        
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        
        <BottomNav className={isStandalone ? 'standalone-bottom-padding' : ''}>
          {trailingTeam && isDoubleAvailable && (
            <button
              onClick={handleCallDouble}
              className={`btn ${trailingTeam === 'Red' ? 'btn-red' : 'btn-blue'} doubles-button`}
              disabled={isSubmitting}
            >
              {trailingTeam.toUpperCase()} DOUBLES
            </button>
          )}
          {!isDoubleAvailable && match.doubles > 0 && (
            <div className="double-indicator">
              Double already used
            </div>
          )}
          <button
            onClick={submitScores}
            className="btn btn-primary submit-scores-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'SUBMITTING...' : 'SUBMIT SCORES'}
          </button>
        </BottomNav>
      </div>
      
      {showCancelDialog && (
        <CancelGameDialog
          onClose={() => setShowCancelDialog(false)}
        />
      )}
      
      {showEndGameDialog && (
        <EndGameDialog
          onClose={() => setShowEndGameDialog(false)}
        />
      )}

      {/* Player Scores */}
      <SectionCard className="player-scores-card">
        <h3 className="section-card-title-custom">Player Scores for Hole {currentHole}</h3>
        <PlayersFourBox
          onScoreChange={updateScore}
          onJunkChange={updateJunk}
          playerPars={playerPars}
          playerYardages={playerYardages}
          playerStrokeIndexes={currentHolePlayerSIs}
          playerStrokes={playerStrokes}
          bigGameStrokesOnHole={match.bigGame && typeof match.bigGameSpecificIndex === 'number' ? bigGameStrokesForCurrentHole : undefined}
        />
      </SectionCard>
    </div>
  );
}; 
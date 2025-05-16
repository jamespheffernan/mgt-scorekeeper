import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../../store/gameStore';
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
  const defaultPar = match.holePar[currentHole - 1];
  
  // State for course data
  const [course, setCourse] = useState<Course | null>(null);
  const [teeOptions, setTeeOptions] = useState<Record<string, TeeOption>>({});
  const [playerPars, setPlayerPars] = useState<number[]>([defaultPar, defaultPar, defaultPar, defaultPar]);
  const [playerSIs, setPlayerSIs] = useState<number[]>([currentHole, currentHole, currentHole, currentHole]);
  const [playerYardages, setPlayerYardages] = useState<number[]>([0, 0, 0, 0]);
  const [playerStrokes, setPlayerStrokes] = useState<number[]>([0, 0, 0, 0]);
  
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
  
  // Load course data when match details change
  useEffect(() => {
    const loadCourseData = async () => {
      if (!match.courseId || !match.playerTeeIds) {
        return;
      }
      
      try {
        const courseData = await millbrookDb.getCourse(match.courseId);
        
        if (courseData) {
          setCourse(courseData);
          console.log(`[COURSE-DEBUG] Loaded course: ${courseData.name}`);
          
          // Create a map of tee options by ID for easy access
          const teeMap: Record<string, TeeOption> = {};
          courseData.teeOptions.forEach(tee => {
            teeMap[tee.id] = tee;
            console.log(`[COURSE-DEBUG] Tee option: ${tee.name} (${tee.color}), id: ${tee.id}`);
          });
          setTeeOptions(teeMap);
          
          // Get player-specific pars, stroke indexes, and yardages
          if (match.playerTeeIds) {
            const newPlayerPars: number[] = [];
            const newPlayerSIs: number[] = [];
            const newPlayerYardages: number[] = [];
            
            match.playerTeeIds.forEach((teeId, index) => {
              const tee = teeMap[teeId];
              if (tee && tee.holes) {
                const holeInfo = tee.holes.find(h => h.number === currentHole);
                if (holeInfo) {
                  newPlayerPars[index] = holeInfo.par;
                  newPlayerSIs[index] = holeInfo.strokeIndex;
                  newPlayerYardages[index] = holeInfo.yardage;
                } else {
                  newPlayerPars[index] = defaultPar;
                  newPlayerSIs[index] = currentHole;
                  newPlayerYardages[index] = 0;
                }
              } else {
                newPlayerPars[index] = defaultPar;
                newPlayerSIs[index] = currentHole;
                newPlayerYardages[index] = 0;
              }
            });
            
            setPlayerPars(newPlayerPars);
            setPlayerSIs(newPlayerSIs);
            setPlayerYardages(newPlayerYardages);
            
            // Update the default gross scores based on pars
            setGrossScores(newPlayerPars as [number, number, number, number]);
            
            // Calculate player strokes
            calculatePlayerStrokes(courseData, teeMap);
          }
        }
      } catch (error) {
        console.error('Error loading course data:', error);
      }
    };
    
    loadCourseData();
  }, [match.courseId, match.playerTeeIds, currentHole, defaultPar]);
  
  // Calculate strokes for each player
  const calculatePlayerStrokes = (courseData: Course, teeMap: Record<string, TeeOption>) => {
    const playerIndexes = players.map(p => p.index);
    let strokes: number[] = [0, 0, 0, 0];
    
    try {
      if (match.courseId && match.playerTeeIds && players.length === 4) { // Ensure players array is populated
        const playerSpecificSIs: number[][] = players.map((_, pIdx) => {
          const pteeId = match.playerTeeIds![pIdx]; // Added non-null assertion as we check playerTeeIds above
          const ptee = courseData.teeOptions.find(t => t.id === pteeId);
          if (ptee && ptee.holes) {
            return Array.from({ length: 18 }, (__, i) => {
              const holeInfo = ptee.holes.find(h => h.number === i + 1);
              return holeInfo ? holeInfo.strokeIndex : i + 1;
            });
          }
          return Array.from({ length: 18 }, (__, i) => i + 1); // Fallback
        });
        
        const strokeMatrix = allocateStrokesMultiTee(playerIndexes, playerSpecificSIs);
        strokes = strokeMatrix.map(playerStrokesArray => playerStrokesArray[currentHole - 1]);
      } else if (players.length === 4) { // Fallback if no course/tee specifics but players exist
        const strokeMatrix = allocateStrokes(playerIndexes, match.holeSI);
        strokes = strokeMatrix.map(playerStrokesArray => playerStrokesArray[currentHole - 1]);
      }
    } catch (error) {
      console.error('Error calculating strokes:', error);
    }
    
    setPlayerStrokes(strokes);
  };
  
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
            {match.playerTeeIds ? 
              // Find unique tee IDs and display hole info once per unique tee
              [...new Set(match.playerTeeIds)].map(teeId => {
                const tee = teeOptions[teeId];
                // Find all players using this tee
                const playerIndexes = (match.playerTeeIds ?? [])
                  .map((id, idx) => id === teeId ? idx : -1)
                  .filter(idx => idx !== -1);
                // Chips for players with strokes
                const chips = playerIndexes
                  .filter(idx => playerStrokes[idx] > 0)
                  .map(idx => {
                    const player = players[idx];
                    const team = playerTeams[idx];
                    // Softer, more pastel team color
                    const pastelRed = 'rgba(239,68,68,0.5)'; // Tailwind red-500, 50% opacity
                    const pastelBlue = 'rgba(59,130,246,0.5)'; // Tailwind blue-500, 50% opacity
                    const bgColor = team === 'Red' ? pastelRed : pastelBlue;
                    const className = '';
                    // Get initials (same logic as PlayerRow)
                    const getInitials = (player: any) => {
                      if (player.first && player.last) {
                        return `${player.first.charAt(0)}${player.last.charAt(0)}`;
                      }
                      const nameParts = player.name ? player.name.split(' ') : [];
                      if (nameParts.length >= 2) {
                        return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
                      }
                      return player.name ? player.name.substring(0, 2).toUpperCase() : '??';
                    };
                    return (
                      <Chip
                        key={player.id}
                        name={getInitials(player)}
                        className={className}
                        // @ts-ignore
                        style={{ ...teeChipStyle, backgroundColor: bgColor }}
                      />
                    );
                  });
                return (
                  <div key={teeId} className="tee-info-row">
                    <span>Hole {currentHole}</span>
                    <span>Par {playerPars[playerIndexes[0]]}</span>
                    <span>SI: {playerSIs[playerIndexes[0]] || currentHole}</span>
                    <span>{chips.length > 0 && chips}</span>
                  </div>
                );
              })
              : 
              <div className="tee-info-row tee-info-row-fallback">
                <span>Hole {currentHole}</span>
                <span>Par {defaultPar}</span>
                <span>SI: {currentHole}</span>
                {/* No chips in fallback */}
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
        
        <SectionCard className="scores-section-container"> 
          <h3 className="scores-section-title">Enter Scores</h3>
          <PlayersFourBox
            onScoreChange={updateScore}
            onJunkChange={updateJunk}
            playerPars={playerPars}
            playerYardages={playerYardages}
            playerStrokeIndexes={playerSIs}
            playerStrokes={playerStrokes}
          />
        </SectionCard>
        
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        
        <BottomNav>
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
    </div>
  );
}; 
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
  const ledger = useGameStore(state => state.ledger);
  
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
  
  // Get the current standings
  const getCurrentStandings = () => {
    if (ledger.length === 0) return { redTotal: 0, blueTotal: 0 };
    
    const lastLedgerEntry = ledger[ledger.length - 1];
    // Find the first player index for each team
    const firstRedIndex = playerTeams.findIndex(team => team === 'Red');
    const firstBlueIndex = playerTeams.findIndex(team => team === 'Blue');
    // Use only one player's running total per team
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
      if (match.courseId && match.playerTeeIds) {
        // Try to use multi-tee stroke allocation if possible
        const playerSIs: number[][] = players.map((_, pIdx) => {
          const pteeId = match.playerTeeIds?.[pIdx];
          const ptee = courseData.teeOptions.find(t => t.id === pteeId);
          if (ptee && ptee.holes) {
            return Array.from({ length: 18 }, (_, i) => {
              const holeInfo = ptee.holes.find(h => h.number === i + 1);
              return holeInfo ? holeInfo.strokeIndex : i + 1;
            });
          }
          return Array.from({ length: 18 }, (_, i) => i + 1);
        });
        
        const strokeMatrix = allocateStrokesMultiTee(playerIndexes, playerSIs);
        strokes = strokeMatrix.map(playerStrokes => playerStrokes[currentHole - 1]);
      } else {
        // Fall back to standard allocation
        const strokeMatrix = allocateStrokes(playerIndexes, match.holeSI);
        strokes = strokeMatrix.map(playerStrokes => playerStrokes[currentHole - 1]);
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
    setErrorMessage(null);
    setIsSubmitting(true);
    const holeBeingSubmitted = currentHole;
    
    try {
      await enterHoleScores(holeBeingSubmitted, grossScores, junkFlags);
      
      if (holeBeingSubmitted === 18) {
        setShowEndGameDialog(true);
      } else {
        // Reset junk flags for the next hole
        const resetJunkFlags: JunkFlags[] = [
          { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
          { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
          { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
          { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }
        ];
        setJunkFlags(resetJunkFlags);
        // Scores will reset via useEffect when currentHole (from store) changes
      }
    } catch (error) {
      console.error('Error submitting scores:', error);
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'An unknown error occurred while submitting scores.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // View ledger
  const viewLedger = () => {
    navigate('/ledger');
  };
  
  // Cancel game
  const cancelGame = () => {
    setShowCancelDialog(true);
  };
  
  // Get standings data
  const { redTotal, blueTotal } = getCurrentStandings();
  
  // Calculate the height of the action bar for padding
  const actionBarHeight = 70; // Reduced height
  const footerHeight = 50; // Reduced height
  const bottomSpacing = actionBarHeight + footerHeight;
  
  return (
    <div className="hole-view-mobile" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* Content container with padding at the bottom to prevent content from being hidden behind fixed buttons */}
      <div style={{ paddingBottom: `${bottomSpacing}px`, margin: '0 auto', maxWidth: '540px' }}>
        {/* Header Bar */}
        <div style={{ 
          backgroundColor: '#1a5e46', 
          color: 'white',
          padding: '12px 16px',
          textAlign: 'center',
          marginBottom: '12px'
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 'bold',
            fontFamily: 'serif'
          }}>
            The Millbrook Game
          </h1>
        </div>
        
        {/* Hole Info Area */}
        <div style={{ 
          margin: '0 12px 16px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: '#333',
              display: 'flex',
              flexDirection: 'column'
            }}>
              Millbrook Scorekeeper
              <span style={{ 
                fontSize: '16px', 
                opacity: 0.7, 
                fontWeight: 'normal',
                marginTop: '4px'
              }}>
                (Hole {currentHole})
              </span>
            </h3>
          </div>
        </div>
        
        {/* Course Info Strip */}
        <div style={{ 
          margin: '0 12px 16px',
          padding: '10px 15px',
          backgroundColor: '#f5f9f7',
          borderRadius: '8px',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <div style={{ fontWeight: 'bold', marginRight: '20px' }}>Championship</div>
          
          {match.playerTeeIds && match.playerTeeIds.some(id => Boolean(id)) ? (
            <>
              {/* Show first tee's info if available */}
              {Object.keys(teeOptions).length > 0 && match.playerTeeIds && (
                <>
                  {match.playerTeeIds.map((teeId, index) => {
                    if (index === 0 && teeId && teeOptions[teeId]) {
                      const tee = teeOptions[teeId];
                      const holeInfo = tee.holes?.find(h => h.number === currentHole);
                      if (holeInfo) {
                        return (
                          <React.Fragment key={teeId}>
                            <div style={{ fontWeight: 'bold' }}>Par {holeInfo.par}</div>
                            <div>{holeInfo.yardage} yds</div>
                            <div>SI: {holeInfo.strokeIndex}</div>
                          </React.Fragment>
                        );
                      }
                    }
                    return null;
                  })}
                </>
              )}
            </>
          ) : (
            <div style={{ fontWeight: 'bold' }}>Par {defaultPar}</div>
          )}
        </div>
        
        {/* Standings Strip */}
        <div style={{ 
          margin: '0 12px 16px',
          padding: '12px 15px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: 8,
            fontSize: '15px',
            fontWeight: 'bold'
          }}>
            <span style={{ 
              color: '#e74c3c',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#e74c3c'
              }}></span>
              Red {formatCurrency(redTotal)}
            </span>
            <span>Carry ${match.carry}</span>
            <span style={{ 
              color: '#3498db',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#3498db'
              }}></span>
              Blue {formatCurrency(blueTotal)}
            </span>
          </div>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#64748b'
          }}>
            <span>Base ${match.base}</span>
            <span>{match.doubleUsedThisHole ? 'Double: YES' : '\u00A0'}</span>
          </div>
        </div>
        
        {/* Players Grid */}
        <div style={{ margin: '0 12px' }}>
          <PlayersFourBox 
            onScoreChange={updateScore}
            onJunkChange={updateJunk}
            playerPars={playerPars}
            playerYardages={playerYardages}
            playerStrokeIndexes={playerSIs}
            playerStrokes={playerStrokes}
          />
        </div>
        
        {/* Error message if any */}
        {errorMessage && (
          <div style={{ 
            margin: '16px 12px 0', 
            padding: '8px 12px', 
            backgroundColor: '#fee2e2', 
            color: '#b91c1c',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {errorMessage}
          </div>
        )}
      </div>
      
      {/* Fixed Action Buttons - Always visible at the bottom of the screen */}
      <div style={{ 
        position: 'fixed',
        bottom: footerHeight,
        left: 0,
        right: 0,
        padding: '10px',
        backgroundColor: '#fff',
        boxShadow: '0 -1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        zIndex: 10
      }}>
        <button
          onClick={handleCallDouble}
          disabled={!isDoubleAvailable || match.doubleUsedThisHole || isSubmitting}
          style={{ 
            flex: 1,
            padding: '10px 0',
            backgroundColor: isDoubleAvailable && !match.doubleUsedThisHole && !isSubmitting 
              ? (trailingTeam === 'Red' ? '#e74c3c' : '#3498db') 
              : '#a0aec0',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            opacity: isDoubleAvailable && !match.doubleUsedThisHole && !isSubmitting ? 1 : 0.4,
            cursor: isDoubleAvailable && !match.doubleUsedThisHole && !isSubmitting ? 'pointer' : 'not-allowed'
          }}
        >
          CALL DOUBLE
        </button>
        <button
          onClick={submitScores}
          disabled={isSubmitting}
          style={{ 
            flex: 1.5,
            padding: '10px 0',
            backgroundColor: '#1a5e46',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'SUBMITTING...' : 'SUBMIT SCORES'}
        </button>
      </div>
      
      {/* Fixed Footer Links */}
      <div style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
        padding: '10px 0',
        backgroundColor: '#fff',
        borderTop: '1px solid #e2e8f0',
        fontSize: '14px',
        zIndex: 9
      }}>
        <button 
          onClick={viewLedger}
          style={{ 
            background: 'none',
            color: '#1a5e46',
            border: 'none',
            padding: '5px 10px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          View Ledger
        </button>
        <button 
          onClick={cancelGame}
          style={{ 
            background: 'none',
            color: '#e74c3c',
            border: 'none',
            padding: '5px 10px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Cancel Game
        </button>
      </div>
      
      {/* Version number */}
      <div style={{
        position: 'fixed',
        bottom: 2,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '12px',
        color: '#999',
        marginTop: '5px'
      }}>
        v0.1.0
      </div>
      
      {/* Dialogs */}
      {showCancelDialog && (
        <CancelGameDialog onClose={() => setShowCancelDialog(false)} />
      )}
      
      {showEndGameDialog && (
        <EndGameDialog onClose={() => setShowEndGameDialog(false)} />
      )}
    </div>
  );
}; 
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import CancelGameDialog from '../CancelGameDialog';
import EndGameDialog from '../EndGameDialog';
import { Course, TeeOption } from '../../db/courseModel';
import { JunkFlags } from '../../calcEngine/junkCalculator';
import { millbrookDb } from '../../db/millbrookDb';
import { allocateStrokes, allocateStrokesMultiTee } from '../../calcEngine/strokeAllocator';
import { PlayerName } from '../../components/PlayerName';
import { getFullName } from '../../utils/nameUtils';
import { getPlayerStrokeIndexes } from '../../store/gameStore';
import { Player } from '../../db/API-GameState';

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const HoleView = () => {
  const navigate = useNavigate();
  const { holeNumberStr } = useParams<{ holeNumberStr: string }>();
  const holeNumber = parseInt(holeNumberStr || '1');
  const currentHoleIndex = holeNumber - 1;
  
  // Access store state and actions
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const isDoubleAvailable = useGameStore(state => state.isDoubleAvailable);
  const trailingTeam = useGameStore(state => state.trailingTeam);
  const enterHoleScores = useGameStore(state => state.enterHoleScores);
  const callDouble = useGameStore(state => state.callDouble);
  const ledger = useGameStore(state => state.ledger);
  const junkEvents = useGameStore(state => state.junkEvents);
  
  // Current hole
  const currentHole = match.currentHole;
  const defaultPar = match.holePar[currentHole - 1];
  
  // Access holeScores from the store
  const holeScores = useGameStore(state => state.holeScores);
  
  // Get initial scores: use pre-generated ghost scores from store, or par for real players
  const getInitialScores = (): [number, number, number, number] => {
    const currentHoleIndex = currentHole - 1;
    const holeScore = holeScores[currentHoleIndex];
    
    if (holeScore) {
      return players.map((player, index) => {
        if (player.isGhost) {
          // Use pre-generated ghost score from store
          return holeScore.gross[index];
        } else {
          // For real players, check if they already have a score entered, otherwise use par
          const existingScore = holeScore.gross[index];
          return existingScore > 0 ? existingScore : defaultPar;
        }
      }) as [number, number, number, number];
    }
    
    // Fallback: use par for all players
    return [defaultPar, defaultPar, defaultPar, defaultPar];
  };
  
  // State for course data
  const [course, setCourse] = useState<Course | null>(null);
  const [teeOptions, setTeeOptions] = useState<Record<string, TeeOption>>({});
  const [playerPars, setPlayerPars] = useState<number[]>([defaultPar, defaultPar, defaultPar, defaultPar]);
  const [playerSIs, setPlayerSIs] = useState<number[]>([currentHole, currentHole, currentHole, currentHole]);
  
  // Local state for scores
  const [grossScores, setGrossScores] = useState<[number, number, number, number]>(getInitialScores());
  
  // Local state for junk flags
  const [junkFlags, setJunkFlags] = useState<JunkFlags[]>([
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
    { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }
  ]);
  
  // State for errors and submission
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for dialogs
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEndGameDialog, setShowEndGameDialog] = useState(false);
  
  // State for showing current ledger summary
  const [showCurrentLedger, setShowCurrentLedger] = useState(false);
  
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
  
  // Get player junk total
  const getPlayerJunkTotal = (playerId: string): number => {
    return junkEvents
      .filter(event => event.playerId === playerId)
      .reduce((sum, event) => sum + event.value, 0);
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
          
          // Get player-specific pars and stroke indexes
          if (match.playerTeeIds) {
            const newPlayerPars: number[] = [];
            const newPlayerSIs: number[] = [];
            
            match.playerTeeIds.forEach((teeId, index) => {
              const tee = teeMap[teeId];
              if (tee && tee.holes) {
                const holeInfo = tee.holes.find(h => h.number === currentHole);
                if (holeInfo) {
                  newPlayerPars[index] = holeInfo.par;
                  newPlayerSIs[index] = holeInfo.strokeIndex;
                  console.log(`[COURSE-DEBUG] Player ${index} using tee ${tee.name}, hole ${currentHole}: par=${holeInfo.par}, SI=${holeInfo.strokeIndex}`);
                } else {
                  newPlayerPars[index] = defaultPar;
                  newPlayerSIs[index] = currentHole;
                  console.log(`[COURSE-DEBUG] No hole info found for player ${index}, hole ${currentHole}, using defaults: par=${defaultPar}, SI=${currentHole}`);
                }
              } else {
                newPlayerPars[index] = defaultPar;
                newPlayerSIs[index] = currentHole;
                console.log(`[COURSE-DEBUG] No tee info found for player ${index}, using defaults: par=${defaultPar}, SI=${currentHole}`);
              }
            });
            
            setPlayerPars(newPlayerPars);
            setPlayerSIs(newPlayerSIs);
            console.log(`[COURSE-DEBUG] Final player pars: ${newPlayerPars.join(', ')}`);
            
            // Update the default gross scores based on pars
            setGrossScores(newPlayerPars as [number, number, number, number]);
          }
        }
      } catch (error) {
        console.error('Error loading course data:', error);
      }
    };
    
    loadCourseData();
  }, [match.courseId, match.playerTeeIds, currentHole, defaultPar]);
  
  // Handle score update
  const updateScore = (playerIndex: number, score: number) => {
    const newScores = [...grossScores] as [number, number, number, number];
    newScores[playerIndex] = score;
    setGrossScores(newScores);
    
    // Auto-detect junk events based on score
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateJunkBasedOnScore(playerIndex);
  };
  
  // Enhanced score options for dropdown with color coding and icons
  const scoreOptions = (playerIndex: number) => {
    const par = playerPars[playerIndex] || defaultPar;
    
    // Range from 1 to 2*par
    return Array.from({ length: par * 2 }, (_, i) => i + 1).map(score => {
      // Determine class and label based on score relative to par
      let scoreClass = "";
      let prefix = "";
      
      if (score === 1) {
        scoreClass = "ace-score";
        prefix = "🏆 ";
      } else if (score === par - 2) {
        scoreClass = "eagle-score";
        prefix = "🦅 ";
      } else if (score === par - 1) {
        scoreClass = "birdie-score";
        prefix = "🐦 ";
      } else if (score === par) {
        scoreClass = "par-score";
        prefix = "⭐ ";
      } else if (score === par + 1) {
        scoreClass = "bogey-score";
      } else if (score === par + 2) {
        scoreClass = "double-bogey-score";
      }
      
      const scoreText = score === 1 ? 'Hole in One' : 
                      score === par - 2 ? `${score} (Eagle)` :
                      score === par - 1 ? `${score} (Birdie)` :
                      score === par ? `${score} (Par)` :
                      score === par + 1 ? `${score} (Bogey)` :
                      score === par + 2 ? `${score} (Double Bogey)` :
                      score;
      
      return (
        <option key={score} value={score} className={scoreClass}>
          {prefix + scoreText}
        </option>
      );
    });
  };
  
  // Update junk flags based on score
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateJunkBasedOnScore = (_playerIndex: number) => {
    const newFlags = [...junkFlags];
    
    // Set other automatic flags here if needed
    
    setJunkFlags(newFlags);
  };
  
  // Toggle a junk flag
  const toggleJunkFlag = (playerIndex: number, flag: keyof JunkFlags) => {
    const newFlags = [...junkFlags];
    
    // Toggle the flag
    newFlags[playerIndex] = {
      ...newFlags[playerIndex],
      [flag]: !newFlags[playerIndex][flag]
    };
    
    setJunkFlags(newFlags);
  };
  
  // Submit scores for this hole
  const submitScores = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      // Get the current hole scores from the store
      const currentHoleIndex = currentHole - 1;
      
      // Create the scores array: use UI scores for real players, preserve ghost scores from store
      const finalScores: [number, number, number, number] = [...grossScores];
      
      // For each player, if they're a ghost, use the pre-generated score from the store
      players.forEach((player, index) => {
        if (player.isGhost && holeScores[currentHoleIndex]) {
          finalScores[index] = holeScores[currentHoleIndex].gross[index];
        }
      });
      
      // Call the store action to record scores
      await enterHoleScores(currentHole, finalScores, junkFlags);
      
      // If this is the final hole, show the end game dialog
      if (currentHole === 18) {
        setShowEndGameDialog(true);
      } else {
        // Otherwise, navigate to next hole
        navigate(`/hole/${currentHole + 1}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Error submitting scores');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get player's tee information
  const getPlayerTeeInfo = (playerIndex: number) => {
    if (!match.playerTeeIds || !teeOptions[match.playerTeeIds[playerIndex]]) {
      return { name: null, color: null };
    }
    
    const tee = teeOptions[match.playerTeeIds[playerIndex]];
    return { 
      name: tee?.name || null,
      color: tee?.color.toLowerCase() || null
    };
  };
  
  // Check if a player gets a stroke on this hole
  const playerGetsStroke = (playerIndex: number): boolean => {
    // Get player handicap indexes
    const playerIndexes = players.map(p => p.index);
    
    // Use the stroke allocator to calculate strokes
    try {
      let strokeMatrix;
      
      if (match.courseId && match.playerTeeIds) {
        // Try to get player-specific stroke indexes if course data is available
        const teeId = match.playerTeeIds[playerIndex];
        if (teeId && course?.teeOptions) {
          const teeOption = course.teeOptions.find(t => t.id === teeId);
          if (teeOption && teeOption.holes) {
            // Extract all hole SIs for each player
            const playerSIs: number[][] = players.map((_, pIdx) => {
              // Find tee option for this player
              const pteeId = match.playerTeeIds?.[pIdx];
              const ptee = course.teeOptions.find(t => t.id === pteeId);
              if (ptee && ptee.holes) {
                // Map holes to SI array
                return Array.from({ length: 18 }, (_, i) => {
                  const holeInfo = ptee.holes.find(h => h.number === i + 1);
                  return holeInfo ? holeInfo.strokeIndex : i + 1;
                });
              }
              return Array.from({ length: 18 }, (_, i) => i + 1);
            });
            
            // Use multi-tee stroke allocation
            strokeMatrix = allocateStrokesMultiTee(playerIndexes, playerSIs);
            return strokeMatrix[playerIndex][currentHole - 1] > 0;
          }
        }
      }
      
      // Default to standard allocation
      strokeMatrix = allocateStrokes(playerIndexes, match.holeSI);
      return strokeMatrix[playerIndex][currentHole - 1] > 0;
    } catch (error) {
      console.error('Error calculating strokes:', error);
      return false;
    }
  };
  
  // Get the number of strokes a player gets
  const getPlayerStrokes = (playerIndex: number): number => {
    // Get player handicap indexes
    const playerIndexes = players.map(p => p.index);
    
    // Use the stroke allocator to calculate strokes
    try {
      let strokeMatrix;
      
      if (match.courseId && match.playerTeeIds) {
        // Try to get player-specific stroke indexes if course data is available
        const teeId = match.playerTeeIds[playerIndex];
        if (teeId && course?.teeOptions) {
          const teeOption = course.teeOptions.find(t => t.id === teeId);
          if (teeOption && teeOption.holes) {
            // Extract all hole SIs for each player
            const playerSIs: number[][] = players.map((_, pIdx) => {
              // Find tee option for this player
              const pteeId = match.playerTeeIds?.[pIdx];
              const ptee = course.teeOptions.find(t => t.id === pteeId);
              if (ptee && ptee.holes) {
                // Map holes to SI array
                return Array.from({ length: 18 }, (_, i) => {
                  const holeInfo = ptee.holes.find(h => h.number === i + 1);
                  return holeInfo ? holeInfo.strokeIndex : i + 1;
                });
              }
              return Array.from({ length: 18 }, (_, i) => i + 1);
            });
            
            // Use multi-tee stroke allocation
            strokeMatrix = allocateStrokesMultiTee(playerIndexes, playerSIs);
            return strokeMatrix[playerIndex][currentHole - 1];
          }
        }
      }
      
      // Default to standard allocation
      strokeMatrix = allocateStrokes(playerIndexes, match.holeSI);
      return strokeMatrix[playerIndex][currentHole - 1];
    } catch (error) {
      console.error('Error calculating strokes:', error);
      return 0;
    }
  };
  
  // Add useEffect to reset junk flags when hole changes
  useEffect(() => {
    // Clear all junk flags when the hole changes
    setJunkFlags([
      { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
      { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
      { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false },
      { hadBunkerShot: false, isOnGreenFromTee: false, isClosestOnGreen: false, hadThreePutts: false, isLongDrive: false }
    ]);
  }, [currentHole]);
  
  // Render current standings
  const renderCurrentStandings = () => {
    if (ledger.length === 0) return null;
    
    const { redTotal, blueTotal } = getCurrentStandings();
    const lastLedgerEntry = ledger[ledger.length - 1];
    
    return (
      <div className="current-standings">
        <div className="standings-header">
          <h3>Current Standings</h3>
          <button className="toggle-standings" onClick={() => setShowCurrentLedger(!showCurrentLedger)}>
            {showCurrentLedger ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        <div className="team-standings-summary">
          <div className="team-standing team-red">
            <div className="team-name">Red Team</div>
            <div className="team-amount">{formatCurrency(redTotal)}</div>
          </div>
          
          <div className="versus-indicator">vs</div>
          
          <div className="team-standing team-blue">
            <div className="team-name">Blue Team</div>
            <div className="team-amount">{formatCurrency(blueTotal)}</div>
          </div>
        </div>
        
        {showCurrentLedger && (
          <div className="player-standings">
            {players.map((player, index) => (
              <div key={player.id} className={`player-standing team-${playerTeams[index].toLowerCase()}`}>
                <div className="player-name"><PlayerName player={player} /></div>
                <div className="player-team-badge">{playerTeams[index]}</div>
                <div className="player-amount">{formatCurrency(lastLedgerEntry.runningTotals[index])}</div>
                {getPlayerJunkTotal(player.id) > 0 && (
                  <div className="player-junk">
                    Junk: ${getPlayerJunkTotal(player.id)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="hole-info-summary">
          <div className="hole-info-item">
            <div className="info-label">Holes Played</div>
            <div className="info-value">{currentHole - 1}</div>
          </div>
          
          <div className="hole-info-item">
            <div className="info-label">Current Base</div>
            <div className="info-value">${match.base}</div>
          </div>
          
          <div className="hole-info-item">
            <div className="info-label">Carry</div>
            <div className="info-value">
              ${lastLedgerEntry ? lastLedgerEntry.carryAfter : 0}
            </div>
          </div>
          
          {isDoubleAvailable && trailingTeam && !match.doubleUsedThisHole && (
            <div className="hole-info-item">
              <div className="info-label">Double Available</div>
              <div className="info-value available">Yes</div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="hole-view">
      <div className="hole-header">
        <h2>Hole {currentHole}</h2>
        
        <div className="hole-actions">
          <button 
            className="view-ledger-button"
            onClick={() => navigate('/ledger')}
            aria-label="View full ledger"
          >
            <span className="button-icon">📊</span> View Ledger
          </button>
          
          {currentHole === 18 && (
            <button
              className="finish-round-button"
              onClick={() => setShowEndGameDialog(true)}
              aria-label="Finish the round"
            >
              <span className="button-icon">🏁</span> Finish Round
            </button>
          )}
          
          <button
            className="cancel-game-button"
            onClick={() => setShowCancelDialog(true)}
            aria-label="Cancel the game"
          >
            <span className="button-icon">⛔</span> Cancel Game
          </button>
        </div>
      </div>
      
      {/* Add current standings section if we have ledger entries */}
      {ledger.length > 0 && renderCurrentStandings()}
      
      {errorMessage && (
        <div className="error-message" role="alert">
          {errorMessage}
        </div>
      )}
      
      <div className="scores-container">
        <h3>Enter Scores</h3>
        
        {players.map((player, index) => {
          const teeInfo = getPlayerTeeInfo(index);
          
          return (
            <div 
              key={index} 
              className={`player-score-row ${playerTeams[index]}`}
            >
              <div className="player-info">
                <div className="player-team-indicator">
                  <span className={`player-team-badge ${playerTeams[index].toLowerCase()}`}>
                    {playerTeams[index]}
                  </span>
                  <span className="player-name-display"><PlayerName player={player} /></span>
                </div>
                
                {teeInfo.name && (
                  <div className="player-tee-badge" style={{ backgroundColor: teeInfo.color || 'gray' }}>
                    {teeInfo.name}
                  </div>
                )}
                
                <div className="hole-details-for-player">
                  <span className="hole-par">Par {playerPars[index]}</span>
                  <span className="hole-si">SI: {playerSIs[index]}</span>
                  
                  {playerGetsStroke(index) && (
                    <span 
                      className={`stroke-indicator ${playerTeams[index]?.toLowerCase()}`}
                      title={`Player gets ${getPlayerStrokes(index)} stroke(s) on this hole`}
                    >
                      {getPlayerStrokes(index) > 1 ? `${getPlayerStrokes(index)}★` : '★'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="score-selector">
                <select
                  value={grossScores[index]}
                  onChange={(e) => updateScore(index, parseInt(e.target.value))}
                  disabled={isSubmitting}
                  aria-label={`Score for ${getFullName(player)}`}
                >
                  {scoreOptions(index)}
                </select>
              </div>
              
              <div className="junk-flags">
                <label className="junk-flag-label">
                  <input
                    type="checkbox"
                    checked={junkFlags[index].hadBunkerShot}
                    onChange={() => toggleJunkFlag(index, 'hadBunkerShot')}
                    disabled={isSubmitting}
                    aria-label="Sandy (Up and down from bunker)"
                  />
                  <span className="junk-name">Sandy</span>
                </label>
                
                {currentHole === 17 && (
                  <label className="junk-flag-label">
                    <input
                      type="checkbox"
                      checked={junkFlags[index].isLongDrive}
                      onChange={() => toggleJunkFlag(index, 'isLongDrive')}
                      disabled={isSubmitting}
                      aria-label="LD10 (Longest Drive on hole 17)"
                    />
                    <span className="junk-name">LD10</span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="hole-controls">
        {isDoubleAvailable && trailingTeam && !match.doubleUsedThisHole && (
          <button
            className={`double-button ${trailingTeam.toLowerCase()}`}
            onClick={callDouble}
            disabled={isSubmitting}
            aria-label={`${trailingTeam} Team Doubles`}
          >
            {trailingTeam} Team Doubles
          </button>
        )}
        
        {match.doubleUsedThisHole && (
          <div className="double-used-indicator" aria-live="polite">
            Double already played this hole
          </div>
        )}
        
        <button
          className="submit-button"
          onClick={submitScores}
          disabled={isSubmitting}
          aria-label="Submit scores and advance to next hole"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Scores'}
        </button>
      </div>
      
      {/* Dialogs */}
      {showCancelDialog && (
        <CancelGameDialog onClose={() => setShowCancelDialog(false)} />
      )}
      
      {showEndGameDialog && (
        <EndGameDialog 
          onClose={() => setShowEndGameDialog(false)} 
        />
      )}
    </div>
  );
}; 
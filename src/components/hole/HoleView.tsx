import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { Player, Team } from '../../db/API-GameState';
import { JunkFlags } from '../../calcEngine/junkCalculator';
import { HoleInfo } from './HoleInfo';
import { millbrookDb } from '../../db/millbrookDb';
import { Course, TeeOption, HoleInfo as HoleInfoType } from '../../db/courseModel';
import { allocateStrokes, allocateStrokesMultiTee, getStrokes } from '../../calcEngine/strokeAllocator';
import CancelGameDialog from '../CancelGameDialog';
import EndGameDialog from '../EndGameDialog';
import '../../App.css';

export const HoleView = () => {
  const navigate = useNavigate();
  
  // Access store state and actions
  const match = useGameStore(state => state.match);
  const players = useGameStore(state => state.players);
  const playerTeams = useGameStore(state => state.playerTeams);
  const isDoubleAvailable = useGameStore(state => state.isDoubleAvailable);
  const trailingTeam = useGameStore(state => state.trailingTeam);
  const enterHoleScores = useGameStore(state => state.enterHoleScores);
  const callDouble = useGameStore(state => state.callDouble);
  
  // Current hole
  const currentHole = match.currentHole;
  const defaultPar = match.holePar[currentHole - 1];
  
  // State for course data
  const [course, setCourse] = useState<Course | null>(null);
  const [teeOptions, setTeeOptions] = useState<Record<string, TeeOption>>({});
  const [playerPars, setPlayerPars] = useState<number[]>([defaultPar, defaultPar, defaultPar, defaultPar]);
  const [playerSIs, setPlayerSIs] = useState<number[]>([currentHole, currentHole, currentHole, currentHole]);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  
  // Local state for scores
  const [grossScores, setGrossScores] = useState<[number, number, number, number]>([
    defaultPar, defaultPar, defaultPar, defaultPar
  ]);
  
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
  
  // Load course data when match details change
  useEffect(() => {
    const loadCourseData = async () => {
      if (!match.courseId || !match.playerTeeIds) {
        setIsLoadingCourse(false);
        return;
      }
      
      try {
        setIsLoadingCourse(true);
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
      } finally {
        setIsLoadingCourse(false);
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
    updateJunkBasedOnScore(playerIndex, score);
  };
  
  // Generate score options for dropdown
  const scoreOptions = (playerIndex: number) => {
    const par = playerPars[playerIndex] || defaultPar;
    
    // Range from 1 to 2*par
    return Array.from({ length: par * 2 }, (_, i) => i + 1).map(score => (
      <option key={score} value={score}>
        {score === 1 ? 'Hole in One' : 
         score === par - 2 ? `${score} (Eagle)` :
         score === par - 1 ? `${score} (Birdie)` :
         score === par ? `${score} (Par)` :
         score === par + 1 ? `${score} (Bogey)` :
         score === par + 2 ? `${score} (Double Bogey)` :
         score}
      </option>
    ));
  };
  
  // Update junk flags based on score
  const updateJunkBasedOnScore = (playerIndex: number, score: number) => {
    const par = playerPars[playerIndex];
    const newFlags = [...junkFlags];
    
    // Check if the hole is a par 3
    const isPar3 = par === 3;
    
    // Don't auto-set greenie flags based on score
    // A good score on a par 3 doesn't necessarily mean a greenie
    
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
  
  // Toggle Greenie flag - make it exclusive to one player
  // Selecting greenie automatically implies closest to pin
  const toggleGreenieFlag = (playerIndex: number) => {
    const newFlags = [...junkFlags];
    
    // Toggle the flag for the current player
    const newValue = !newFlags[playerIndex].isOnGreenFromTee;
    
    // If turning on, disable for all other players
    if (newValue) {
      // Set all to false first
      for (let i = 0; i < newFlags.length; i++) {
        newFlags[i].isOnGreenFromTee = false;
        newFlags[i].isClosestOnGreen = false; // Keep the flag in sync (for backward compatibility)
        
        // Also clear 3-putt for all
        newFlags[i].hadThreePutts = false;
      }
      
      // Then set true just for this player
      newFlags[playerIndex].isOnGreenFromTee = true;
      newFlags[playerIndex].isClosestOnGreen = true; // Keep the flag in sync (for backward compatibility)
    } else {
      // Just turn off for this player
      newFlags[playerIndex].isOnGreenFromTee = false;
      newFlags[playerIndex].isClosestOnGreen = false; // Keep the flag in sync (for backward compatibility)
      
      // Also clear 3-putt
      newFlags[playerIndex].hadThreePutts = false;
    }
    
    setJunkFlags(newFlags);
  };
  
  // Submit scores for this hole
  const submitScores = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      // Call the store action to record scores
      await enterHoleScores(currentHole, grossScores, junkFlags);
      
      // Navigate to next hole or finish
      if (currentHole < 18) {
        navigate(`/hole/${currentHole + 1}`);
      } else {
        navigate('/finish');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Error submitting scores');
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
  
  return (
    <div className="hole-view">
      <div className="hole-header">
        <h2>Hole {currentHole}</h2>
        
        <div className="hole-actions">
          <button 
            className="view-ledger-button"
            onClick={() => navigate('/ledger')}
          >
            View Ledger
          </button>
          
          <button
            className="cancel-game-button"
            onClick={() => setShowCancelDialog(true)}
          >
            Cancel Game
          </button>
        </div>
      </div>
      
      {/* Add HoleInfo component to show detailed hole information */}
      {match.courseId && (
        <HoleInfo holeNumber={currentHole} />
      )}
      
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}
      
      <div className="scores-container">
        {players.map((player, index) => {
          const teeInfo = getPlayerTeeInfo(index);
          const hasStroke = playerGetsStroke(index);
          const isPar3 = playerPars[index] === 3;
          
          return (
            <div 
              key={index} 
              className={`player-score-row ${playerTeams[index]}`}
            >
              <div className="player-info">
                <div className="player-team-indicator">
                  {playerTeams[index]} • {player.name}
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
                    <span className="stroke-indicator" title="Player gets a stroke on this hole">
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
                >
                  {scoreOptions(index)}
                </select>
              </div>
              
              <div className="junk-flags">
                <label>
                  <input
                    type="checkbox"
                    checked={junkFlags[index].hadBunkerShot}
                    onChange={() => toggleJunkFlag(index, 'hadBunkerShot')}
                    disabled={isSubmitting}
                  />
                  Sandy
                </label>
                
                {isPar3 && (
                  <>
                    <label>
                      <input
                        type="checkbox"
                        checked={junkFlags[index].isOnGreenFromTee}
                        onChange={() => toggleGreenieFlag(index)}
                        disabled={isSubmitting}
                      />
                      Greenie
                    </label>
                    
                    {junkFlags[index].isOnGreenFromTee && (
                      <label>
                        <input
                          type="checkbox"
                          checked={junkFlags[index].hadThreePutts}
                          onChange={() => toggleJunkFlag(index, 'hadThreePutts')}
                          disabled={isSubmitting}
                        />
                        3-Putt
                      </label>
                    )}
                  </>
                )}
                
                {currentHole === 17 && (
                  <label>
                    <input
                      type="checkbox"
                      checked={junkFlags[index].isLongDrive}
                      onChange={() => toggleJunkFlag(index, 'isLongDrive')}
                      disabled={isSubmitting}
                    />
                    LD10
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
          >
            {trailingTeam} Team Doubles
          </button>
        )}
        
        {match.doubleUsedThisHole && (
          <div className="double-used-indicator">
            Double already played this hole
          </div>
        )}
        
        <button
          className="submit-button"
          onClick={submitScores}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Scores'}
        </button>
        
        {currentHole >= 9 && (
          <button
            className="end-game-button"
            onClick={() => setShowEndGameDialog(true)}
            disabled={isSubmitting}
          >
            End Round
          </button>
        )}
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
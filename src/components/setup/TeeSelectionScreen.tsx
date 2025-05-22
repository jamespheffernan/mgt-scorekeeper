import "./PlayersRoster.css";
import "./TeeSelection.css";
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetupFlowStore } from '../../store/setupFlowStore';
import { useFirestorePlayers } from '../../hooks/useFirestorePlayers';
import { useGameStore } from '../../store/gameStore';
import { Course, TeeOption } from '../../db/courseModel';
import { millbrookDb } from '../../db/millbrookDb';
import TopBar from '../TopBar';
import { Stepper } from '../Stepper';
import { SectionCard } from '../SectionCard';

const TeeSelectionScreen: React.FC = () => {
  const navigate = useNavigate();
  const isNavigatingAwayRef = useRef(false);
  const { players: dbPlayers, isLoading: playersLoading } = useFirestorePlayers();
  const { 
    redTeamIds, 
    blueTeamIds, 
    selectedCourseId,
    playerTeeIds,
    bigGame,
    bigGameSpecificIndex,
    setTeamPlayers,
    setCourseId,
    setAllTees,
    setBigGame,
    setBigGameSpecificIndex,
    convertToGamePlayers,
    reset,
    ghostPlayers
  } = useSetupFlowStore();
  const createMatch = useGameStore(state => state.createMatch);
  
  // Local state
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBigGameExplanation, setShowBigGameExplanation] = useState(false);
  const [localBigGameIndexInput, setLocalBigGameIndexInput] = useState<string>(
    bigGameSpecificIndex !== undefined ? String(bigGameSpecificIndex) : ''
  );
  
  // Check if we have the required team data
  const hasTeamData = redTeamIds.length > 0 || blueTeamIds.length > 0;
  
  // Load courses and initialize tees
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const allCourses = await millbrookDb.getAllCourses();
        setCourses(allCourses);
        
        if (allCourses.length > 0 && !selectedCourseId) {
          const firstCourse = allCourses[0];
          setCourseId(firstCourse.id);
          const allPlayerIds = [...redTeamIds, ...blueTeamIds];

          // Check if the first course has valid tee options and a valid ID for the first tee
          if (firstCourse.teeOptions && firstCourse.teeOptions.length > 0 && firstCourse.teeOptions[0]?.id) {
            const defaultTeeId = firstCourse.teeOptions[0].id;
            if (allPlayerIds.length > 0) {
                setAllTees(allPlayerIds.map(() => defaultTeeId));
            } else {
                setAllTees([]); // No players, so empty tee array
            }
          } else {
            // First course has no valid default tee. Initialize with empty strings if there are players.
            if (allPlayerIds.length > 0) {
                setAllTees(allPlayerIds.map(() => ''));
                console.warn(`Initial course ${firstCourse.name} has no valid default tee. Player tees initialized empty.`);
            } else {
                setAllTees([]); // No players, so empty tee array
            }
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading courses:', error);
        setIsLoading(false);
      }
    };
    
    loadCourses();
  }, [redTeamIds, blueTeamIds, selectedCourseId, setCourseId, setAllTees]);
  
  // Redirect if we don't have team data
  useEffect(() => {
    if (!hasTeamData && !isLoading && !isNavigatingAwayRef.current) {
      navigate('/roster');
    }
  }, [hasTeamData, isLoading, navigate]);
  
  // Handle tee selection for a player
  const handleTeeChange = (playerIndex: number, teeId: string) => {
    const newTees = [...playerTeeIds];
    newTees[playerIndex] = teeId;
    setAllTees(newTees);
  };
  
  // Find selected course
  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  
  // Handle course selection change
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCourseId = e.target.value;
    setCourseId(newCourseId);
    
    const course = courses.find(c => c.id === newCourseId);
    const allPlayerIds = [...redTeamIds, ...blueTeamIds];

    if (course) {
      // Check if the selected course has valid tee options and a valid ID for the first tee
      if (course.teeOptions && course.teeOptions.length > 0 && course.teeOptions[0]?.id) {
        const defaultTeeId = course.teeOptions[0].id;
        if (allPlayerIds.length > 0) {
          setAllTees(allPlayerIds.map(() => defaultTeeId));
        } else {
          setAllTees([]); // No players, so empty tee array
        }
      } else {
        // Selected course has no valid default tee. Reset/clear tees for players.
        if (allPlayerIds.length > 0) {
          setAllTees(allPlayerIds.map(() => ''));
          console.warn(`Selected course ${course.name} has no valid default tee. Player tees reset.`);
        } else {
          setAllTees([]); // No players, so empty tee array
        }
      }
    } else {
      // Course not found (e.g., if courses list is somehow outdated or ID is bad)
      // Reset/clear tees for players.
      if (allPlayerIds.length > 0) {
        setAllTees(allPlayerIds.map(() => ''));
        console.warn(`Course with ID ${newCourseId} not found. Player tees reset.`);
      } else {
        setAllTees([]); // No players, so empty tee array
      }
    }
  };
  
  // Back to roster
  const handleBackToRoster = () => {
    navigate('/roster');
  };
  
  // Create the match and start
  const handleCreateMatch = () => {
    // Validation
    if (!selectedCourseId || !selectedCourse) {
      alert('Please select a course.');
      return;
    }

    if (playerTeeIds.some(id => !id)) {
      alert('Please select tees for all players. One or more players are missing a tee selection.');
      return;
    }

    // New validation: ensure all selected tee IDs are valid for the selected course
    // Ensure selectedCourse.teeOptions exists and is an array before mapping
    const courseTeeIds = selectedCourse.teeOptions?.map(opt => opt.id) || [];
    const allTeesValid = playerTeeIds.every(playerTeeId => courseTeeIds.includes(playerTeeId));

    if (!allTeesValid) {
      alert('One or more selected tees are invalid for the chosen course. Please check your selections.');
      console.error('Invalid tee IDs found:', playerTeeIds, 'Valid course tees for selected course:', courseTeeIds);
      // You could add logic here to find and highlight the specific invalid tee selections if desired.
      return;
    }
    
    // Set navigation flag before any state changes
    isNavigatingAwayRef.current = true;
    
    // Convert roster players to game players, including ghosts
    const { players, teams } = convertToGamePlayers(dbPlayers, ghostPlayers);
    
    // Create match with selected options
    createMatch(players, teams, {
      bigGame,
      courseId: selectedCourseId,
      playerTeeIds: playerTeeIds as [string, string, string, string],
      bigGameSpecificIndex: bigGame && localBigGameIndexInput !== '' && !isNaN(parseFloat(localBigGameIndexInput)) 
                            ? parseFloat(localBigGameIndexInput) 
                            : undefined 
    });
    
    // Navigate to first hole
    navigate('/hole/1');
    
    // Reset setup flow state
    reset();
  };
  
  // Effect to update local state if store changes (e.g. on reset or initial load)
  useEffect(() => {
    setLocalBigGameIndexInput(bigGameSpecificIndex !== undefined ? String(bigGameSpecificIndex) : '');
  }, [bigGameSpecificIndex]);
  
  if (isLoading || playersLoading) {
    return <div className="loading-indicator">Loading...</div>;
  }
  
  // Get player objects for the teams
  const redPlayers = redTeamIds.map(id => dbPlayers.find(p => p.id === id)).filter(Boolean) as any[];
  const bluePlayers = blueTeamIds.map(id => dbPlayers.find(p => p.id === id)).filter(Boolean) as any[];
  const allPlayers = [...redPlayers, ...bluePlayers];
  
  return (
    <>
      <TopBar title="Course Selection" />
      <div className="players-screen">
      <div className="players-content-scrollable">
        <Stepper current={2} of={2} />
        
        <SectionCard>
          <div className="game-options">
            <div className="big-game-toggle-container">
              <label className="big-game-toggle">
                <input 
                  type="checkbox"
                  checked={bigGame}
                  onChange={(e) => {
                    setBigGame(e.target.checked);
                    // If disabling big game, also clear the specific index
                    if (!e.target.checked) {
                      setLocalBigGameIndexInput('');
                      setBigGameSpecificIndex(undefined);
                    }
                  }}
                />
                <span className="toggle-label">Enable "Big Game" scoring</span>
              </label>
              <button 
                onClick={() => setShowBigGameExplanation(!showBigGameExplanation)}
                className="learn-more-button"
              >
                {showBigGameExplanation ? 'Hide details' : 'Learn more'}
              </button>
              {showBigGameExplanation && (
                <div className="big-game-explanation">
                  When enabled, the app will track the two lowest net scores on each hole.
                  The total is shared with other groups playing in the Big Game.
                  <br />
                  <strong>Note:</strong> Big Game has different rules for gimmes and pick-ups than the Millbrook side match.
                  As per Big Game rules, strokes are based on the lowest index in the ENTIRE FIELD. 
                  You can optionally enter that field-wide low index below. If left blank, strokes will be based on the lowest index in this foursome.
                </div>
              )}
            </div>
            {bigGame && (
              <div className="big-game-specific-index-input" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="bigGameIndexInput" style={{ marginBottom: '5px', fontSize: '0.9rem', color: 'var(--color-grey90)' }}>
                  Big Game Field Low Index (Optional):
                </label>
                <input
                  type="number"
                  id="bigGameIndexInput"
                  step="0.1"
                  placeholder="e.g., 5.2"
                  value={localBigGameIndexInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalBigGameIndexInput(val);
                    if (val === '' || isNaN(parseFloat(val))) {
                      setBigGameSpecificIndex(undefined);
                    } else {
                      setBigGameSpecificIndex(parseFloat(val));
                    }
                  }}
                  style={{ padding: '8px', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-grey30)', fontSize: '0.9rem' }}
                />
              </div>
            )}
          </div>
        </SectionCard>
        
        <div className="course-selection">
          <label>
            Select Course
            <select
              value={selectedCourseId}
              onChange={handleCourseChange}
              className="course-select"
            >
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        
        {selectedCourse && (
          <div className="tee-selection">
            <h3>Player Tees</h3>
            
            {allPlayers.map((player, index) => (
              <div key={player.id} className="player-tee-row">
                <div className="player-name">
                  <span className={`padded-player-name ${index < redPlayers.length ? 'text-red' : 'text-blue'}`}>
                    {player.name}
                  </span>
                </div>
                <div className="tee-selector">
                  <select
                    value={playerTeeIds[index] || ''}
                    onChange={(e) => handleTeeChange(index, e.target.value)}
                    className="tee-select"
                  >
                    {selectedCourse.teeOptions.map(tee => (
                      <option key={tee.id} value={tee.id}>
                        {tee.name} ({tee.color})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="setup-buttons">
          <button
            className="back-button"
            onClick={handleBackToRoster}
          >
            Back to Players
          </button>
          
          <button
            className="continue-button"
            onClick={handleCreateMatch}
          >
            Start Match
          </button>
        </div>
        </div>
      </div>
    </>
  );
};

export default TeeSelectionScreen; 

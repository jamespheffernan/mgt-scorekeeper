import "./PlayersRoster.css";
import React, { useState, useEffect } from 'react';
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
  const { players: dbPlayers, isLoading: playersLoading } = useFirestorePlayers();
  const { 
    redTeamIds, 
    blueTeamIds, 
    selectedCourseId,
    playerTeeIds,
    bigGame,
    setTeamPlayers,
    setCourseId,
    setAllTees,
    setBigGame,
    convertToGamePlayers,
    reset
  } = useSetupFlowStore();
  const createMatch = useGameStore(state => state.createMatch);
  
  // Local state
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBigGameExplanation, setShowBigGameExplanation] = useState(false);
  
  // Check if we have the required team data
  const hasTeamData = redTeamIds.length > 0 || blueTeamIds.length > 0;
  
  // Load courses and initialize tees
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const allCourses = await millbrookDb.getAllCourses();
        setCourses(allCourses);
        
        if (allCourses.length > 0 && !selectedCourseId) {
          setCourseId(allCourses[0].id);
          
          // Initialize tee selections with defaults
          const allPlayerIds = [...redTeamIds, ...blueTeamIds];
          const defaultTeeId = allCourses[0].teeOptions[0]?.id || '';
          setAllTees(allPlayerIds.map(() => defaultTeeId));
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
    if (!hasTeamData && !isLoading) {
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
    const courseId = e.target.value;
    setCourseId(courseId);
    
    const course = courses.find(c => c.id === courseId);
    if (course && course.teeOptions.length > 0) {
      const defaultTeeId = course.teeOptions[0].id;
      const allPlayerIds = [...redTeamIds, ...blueTeamIds];
      setAllTees(allPlayerIds.map(() => defaultTeeId));
    }
  };
  
  // Back to roster
  const handleBackToRoster = () => {
    navigate('/roster');
  };
  
  // Create the match and start
  const handleCreateMatch = () => {
    console.log('Testing direct navigation strategy');

    try {
      // Skip everything - just try to navigate directly
      console.log('Attempting direct navigation to /hole/1');
      
      // Use the navigate function with replace to force a new history entry
      navigate('/hole/1', { replace: true });
      
      console.log('Navigation command executed');
      
      // If we get here, the navigation command didn't throw an error
      // but we might still be on the tee-selection page
      setTimeout(() => {
        console.log('Current location after navigation attempt:', window.location.pathname);
        
        // If still on tee-selection, try an alternative approach with window.location
        if (window.location.pathname.includes('tee-selection')) {
          console.log('Still on tee-selection, trying window.location.href approach');
          window.location.href = '/hole/1';
        }
      }, 100);
    } catch (error) {
      console.error('Navigation error:', error);
      alert('Error navigating to hole view: ' + String(error));
    }
  };
  
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
                  onChange={(e) => setBigGame(e.target.checked)}
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
                </div>
              )}
            </div>
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
                  <span className={index < redPlayers.length ? 'text-red' : 'text-blue'}>
                    {player.name}
                  </span>
                </div>
                
                <div className="tee-selector">
                  <select
                    value={playerTeeIds[index] || ''}
                    onChange={(e) => handleTeeChange(index, e.target.value)}
                  >
                    {selectedCourse.teeOptions.map(tee => (
                      <option key={tee.id} value={tee.id}>
                        {tee.name} ({tee.color})
                      </option>
                    ))}
                  </select>
                  
                  {playerTeeIds[index] && selectedCourse.teeOptions.length > 0 && (
                    <div 
                      className="tee-color-indicator"
                      style={{ 
                        backgroundColor: selectedCourse.teeOptions.find(
                          t => t.id === playerTeeIds[index]
                        )?.color?.toLowerCase() || '#ccc'
                      }}
                    ></div>
                  )}
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

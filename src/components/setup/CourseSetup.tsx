import { useState, useEffect } from 'react';
import { Player } from '../../store/gameStore';
import { Course, TeeOption } from '../../db/courseModel';
import { millbrookDb } from '../../db/millbrookDb';
import '../../App.css';

interface CourseSetupProps {
  selectedPlayers: Player[];
  onComplete: (courseId: string, playerTeeIds: [string, string, string, string]) => void;
  onBack: () => void;
}

export const CourseSetup = ({ selectedPlayers, onComplete, onBack }: CourseSetupProps) => {
  // State for courses and selections
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [playerTeeIds, setPlayerTeeIds] = useState<[string, string, string, string]>(['', '', '', '']);
  
  // Load available courses on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const allCourses = await millbrookDb.getAllCourses();
        setCourses(allCourses);
        
        // If courses exist, select the first one
        if (allCourses.length > 0) {
          setSelectedCourseId(allCourses[0].id);
          setSelectedCourse(allCourses[0]);
          
          // Initialize tee selections with reasonable defaults based on gender
          const defaultTeeIds = selectedPlayers.map((player) => {
            // Simple logic: select tees based on gender if available
            // In a real app, you might consider stored preferences
            const playerGender = determinePlayerGender(player);
            const appropriateTee = findAppropriateTeesForGender(allCourses[0], playerGender);
            return appropriateTee?.id || allCourses[0].teeOptions[0].id;
          }) as [string, string, string, string];
          
          setPlayerTeeIds(defaultTeeIds);
        }
      } catch (error) {
        console.error('Error loading courses:', error);
      }
    };
    
    loadCourses();
  }, [selectedPlayers]);
  
  // Handle course selection change
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    
    const course = courses.find(c => c.id === courseId) || null;
    setSelectedCourse(course);
    
    // Reset tee selections with new defaults
    if (course) {
      const newTeeIds = selectedPlayers.map((player) => {
        const playerGender = determinePlayerGender(player);
        const appropriateTee = findAppropriateTeesForGender(course, playerGender);
        return appropriateTee?.id || course.teeOptions[0].id;
      }) as [string, string, string, string];
      
      setPlayerTeeIds(newTeeIds);
    }
  };
  
  // Handle tee selection change for a player
  const handleTeeChange = (playerIndex: number, teeId: string) => {
    const newTeeIds = [...playerTeeIds] as [string, string, string, string];
    newTeeIds[playerIndex] = teeId;
    setPlayerTeeIds(newTeeIds);
  };
  
  // Find appropriate tees based on player gender
  const determinePlayerGender = (player: Player): 'M' | 'F' => {
    // This is a simplistic approach - in a real app, you would have gender stored
    return player.name.toLowerCase().endsWith('a') ? 'F' : 'M'; // Assumes names ending with 'a' are female
  };
  
  // Find appropriate tees for a gender
  const findAppropriateTeesForGender = (course: Course, gender: 'M' | 'F'): TeeOption | undefined => {
    if (!course) return undefined;
    
    // First try exact match
    const exactMatch = course.teeOptions.find(t => t.gender === gender);
    if (exactMatch) return exactMatch;
    
    // Then try 'Any' gender
    const anyGender = course.teeOptions.find(t => t.gender === 'Any');
    if (anyGender) return anyGender;
    
    // Fall back to first tee option
    return course.teeOptions[0];
  };
  
  // Get tee details by ID
  const getTeeById = (teeId: string): TeeOption | undefined => {
    if (!selectedCourse) return undefined;
    return selectedCourse.teeOptions.find(t => t.id === teeId);
  };
  
  // Complete setup and move to next step
  const handleContinue = () => {
    // Validate that all fields are selected
    if (!selectedCourseId || playerTeeIds.some(id => !id)) {
      alert('Please select a course and tees for all players');
      return;
    }
    
    // Call the onComplete callback with the selected course and tee IDs
    onComplete(selectedCourseId, playerTeeIds);
  };
  
  // Return to player setup
  const handleBack = () => {
    onBack();
  };
  
  return (
    <div className="setup-container">
      <h2>Course Setup</h2>
      
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
          
          {selectedPlayers.map((player, index) => (
            <div key={index} className="player-tee-row">
              <div className="player-name">{player.name}</div>
              
              <div className="tee-selector">
                <select
                  value={playerTeeIds[index]}
                  onChange={(e) => handleTeeChange(index, e.target.value)}
                >
                  {selectedCourse.teeOptions.map(tee => (
                    <option key={tee.id} value={tee.id}>
                      {tee.name} ({tee.color})
                    </option>
                  ))}
                </select>
                
                {playerTeeIds[index] && (
                  <div 
                    className="tee-color-indicator"
                    style={{ backgroundColor: getTeeById(playerTeeIds[index])?.color.toLowerCase() }}
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
          onClick={handleBack}
        >
          Back to Players
        </button>
        
        <button
          className="continue-button"
          onClick={handleContinue}
        >
          Continue to Round
        </button>
      </div>
    </div>
  );
}; 
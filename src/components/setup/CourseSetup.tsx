import { useState, useEffect } from 'react';
import { Player } from '../../db/API-GameState';
import { Course, TeeOption } from '../../db/courseModel';
import { millbrookDb } from '../../db/millbrookDb';
import { getFullName } from '../../utils/nameUtils';
import PlayerName from '../../components/PlayerName';
import './CourseSetup.css';

interface CourseSetupProps {
  selectedPlayers: Player[];
  onComplete: (courseId: string, playerTeeIds: [string, string, string, string]) => void;
  onBack: () => void;
}

export const CourseSetup = ({ selectedPlayers, onComplete, onBack }: CourseSetupProps) => {
  // State for courses and selections
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [playerTeeIds, setPlayerTeeIds] = useState<[string, string, string, string]>(['', '', '', '']);
  const [showCourseDropdown, setShowCourseDropdown] = useState<boolean>(false);
  
  // Load available courses on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const allCourses = await millbrookDb.getAllCourses();
        setCourses(allCourses);
        setFilteredCourses(allCourses);
        
        // If courses exist, select the first one
        if (allCourses.length > 0) {
          setSelectedCourseId(allCourses[0].id);
          setSelectedCourse(allCourses[0]);
          setSearchQuery(allCourses[0].name);
          
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

  // Handle search query changes
  useEffect(() => {
    const performSearch = async () => {
      try {
        const searchResults = await millbrookDb.searchCourses(searchQuery);
        setFilteredCourses(searchResults);
      } catch (error) {
        console.error('Error searching courses:', error);
        setFilteredCourses(courses);
      }
    };
    
    performSearch();
  }, [searchQuery, courses]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowCourseDropdown(true);
  };

  // Handle course selection from dropdown
  const handleCourseSelect = (course: Course) => {
    setSelectedCourseId(course.id);
    setSelectedCourse(course);
    setSearchQuery(course.name);
    setShowCourseDropdown(false);
    
    // Reset tee selections with new defaults
    const newTeeIds = selectedPlayers.map((player) => {
      const playerGender = determinePlayerGender(player);
      const appropriateTee = findAppropriateTeesForGender(course, playerGender);
      return appropriateTee?.id || course.teeOptions[0].id;
    }) as [string, string, string, string];
    
    setPlayerTeeIds(newTeeIds);
  };

  // Handle focus on search input
  const handleSearchFocus = () => {
    setShowCourseDropdown(true);
  };

  // Handle blur on search input (with delay to allow for clicks)
  const handleSearchBlur = () => {
    setTimeout(() => {
      setShowCourseDropdown(false);
    }, 200);
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
    const fullName = getFullName(player);
    return fullName.toLowerCase().endsWith('a') ? 'F' : 'M'; // Assumes names ending with 'a' are female
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
          <div className="course-search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className="course-search-input"
              placeholder="Search courses by name or location..."
            />
            {showCourseDropdown && filteredCourses.length > 0 && (
              <div className="course-dropdown">
                {filteredCourses.map(course => (
                  <div
                    key={course.id}
                    className={`course-option ${course.id === selectedCourseId ? 'selected' : ''}`}
                    onClick={() => handleCourseSelect(course)}
                  >
                    <div className="course-name">{course.name}</div>
                    <div className="course-location">{course.location}</div>
                  </div>
                ))}
              </div>
            )}
            {showCourseDropdown && filteredCourses.length === 0 && searchQuery && (
              <div className="course-dropdown">
                <div className="course-option no-results">
                  No courses found matching "{searchQuery}"
                </div>
              </div>
            )}
          </div>
        </label>
      </div>
      
      {selectedCourse && (
        <div className="tee-selection">
          <h3>Player Tees</h3>
          
          {selectedPlayers.map((player, index) => (
            <div key={index} className="player-tee-row">
              <div className="player-name"><PlayerName player={player} /></div>
              
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
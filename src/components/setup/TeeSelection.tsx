import React, { useState, useEffect } from 'react';
import { millbrookDb } from '../../db/millbrookDb';
import { Course, TeeOption } from '../../db/courseModel';

interface TeeSelectionProps {
  players: string[];
  courseId: string;
  onTeeSelect: (playerTeeIds: string[]) => void;
  initialTeeIds?: string[];
}

export const TeeSelection: React.FC<TeeSelectionProps> = ({ 
  players, 
  courseId, 
  onTeeSelect,
  initialTeeIds = []
}) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedTees, setSelectedTees] = useState<string[]>(initialTeeIds.length ? initialTeeIds : Array(players.length).fill(''));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCourse = async () => {
      if (courseId) {
        try {
          const fetchedCourse = await millbrookDb.courses.get(courseId);
          setCourse(fetchedCourse || null);
          
          // If no initial tees and course has default tee, set it for all players
          if (!initialTeeIds.length && fetchedCourse?.teeOptions?.length) {
            const defaultTeeId = fetchedCourse.teeOptions[0].id;
            setSelectedTees(Array(players.length).fill(defaultTeeId));
          }
        } catch (error) {
          console.error('Error loading course:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadCourse();
  }, [courseId, initialTeeIds, players.length]);

  const handleTeeChange = (playerIndex: number, teeId: string) => {
    const newSelectedTees = [...selectedTees];
    newSelectedTees[playerIndex] = teeId;
    setSelectedTees(newSelectedTees);
    onTeeSelect(newSelectedTees);
  };

  const getTeeById = (teeId: string): TeeOption | undefined => {
    return course?.teeOptions.find(tee => tee.id === teeId);
  };

  if (isLoading) {
    return <div>Loading tees...</div>;
  }

  if (!course || !course.teeOptions.length) {
    return <div>No tees available for this course</div>;
  }

  return (
    <div className="tee-selection">
      <h3>Select Tees</h3>
      {players.map((playerId, index) => (
        <div key={playerId} className="player-tee-row">
          <div className="player-name">{`Player ${index + 1}`}</div>
          <div className="tee-selector">
            {selectedTees[index] && (
              <div 
                className="tee-color-indicator" 
                style={{ backgroundColor: getTeeById(selectedTees[index])?.color || '#ccc' }}
              />
            )}
            <select
              value={selectedTees[index]}
              onChange={(e) => handleTeeChange(index, e.target.value)}
              className="tee-select"
            >
              {course.teeOptions.map((tee) => (
                <option key={tee.id} value={tee.id}>
                  {tee.name} ({tee.rating}/{tee.slope})
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeeSelection; 
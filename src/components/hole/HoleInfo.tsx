import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { millbrookDb } from '../../db/millbrookDb';
import { Course, TeeOption } from '../../db/courseModel';

interface HoleInfoProps {
  holeNumber: number;
}

export const HoleInfo: React.FC<HoleInfoProps> = ({ holeNumber }) => {
  const [course, setCourse] = React.useState<Course | null>(null);
  const [teeOptions, setTeeOptions] = React.useState<TeeOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Get match info from store
  const match = useGameStore(state => state.match);
  const playerTeeIds = match.playerTeeIds || [];
  
  // Load course and tee information on mount
  React.useEffect(() => {
    const loadCourseInfo = async () => {
      if (!match.courseId) return;
      
      try {
        setIsLoading(true);
        const courseData = await millbrookDb.getCourse(match.courseId);
        
        if (courseData) {
          setCourse(courseData);
          
          // Get unique tee options being used by players
          const uniqueTeeIds = [...new Set(playerTeeIds)];
          const usedTeeOptions = uniqueTeeIds
            .map(teeId => courseData.teeOptions.find(tee => tee.id === teeId))
            .filter(Boolean) as TeeOption[];
            
          setTeeOptions(usedTeeOptions);
        }
      } catch (error) {
        console.error('Error loading course info:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCourseInfo();
  }, [match.courseId, playerTeeIds]);
  
  // Get hole information for the current hole
  const getHoleInfo = (tee: TeeOption) => {
    if (!tee || !tee.holes) return null;
    
    const holeInfo = tee.holes.find(h => h.number === holeNumber);
    return holeInfo;
  };
  
  if (isLoading) {
    return <div className="hole-info-loading">Loading hole information...</div>;
  }
  
  if (!course || teeOptions.length === 0) {
    return (
      <div className="hole-info">
        <h3>Hole {holeNumber}</h3>
        <p>No course information available</p>
      </div>
    );
  }
  
  return (
    <div className="hole-info">
      <h3>Hole {holeNumber}</h3>
      
      <div className="hole-info-details">
        {teeOptions.map(tee => {
          const holeInfo = getHoleInfo(tee);
          if (!holeInfo) return null;
          
          return (
            <div key={tee.id} className="hole-tee-info">
              <div 
                className="tee-color-badge"
                style={{ backgroundColor: tee.color.toLowerCase() }}
              >
                {tee.name}
              </div>
              <div className="hole-stats">
                <span className="hole-yardage">{holeInfo.yardage} yards</span>
                <span className="hole-par">Par {holeInfo.par}</span>
                <span className="hole-si">SI: {holeInfo.strokeIndex}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 
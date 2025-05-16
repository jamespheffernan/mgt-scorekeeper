import { useState, useEffect } from 'react';
import { Course, TeeOption } from '../../db/courseModel';
import { millbrookDb } from '../../db/millbrookDb';

interface CourseDetailsPanelProps {
  courseId?: string;
}

export const CourseDetailsPanel = ({ courseId }: CourseDetailsPanelProps) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTeeId, setActiveTeeId] = useState<string | null>(null);
  
  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) {
        setCourse(null);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const courseData = await millbrookDb.getCourse(courseId);
        setCourse(courseData || null);
        
        // Set the default active tee to the first tee
        if (courseData && courseData.teeOptions.length > 0) {
          setActiveTeeId(courseData.teeOptions[0].id);
        }
      } catch (error) {
        console.error('Error loading course details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCourse();
  }, [courseId]);
  
  if (loading) {
    return <div className="course-details-loading">Loading course details...</div>;
  }
  
  if (!course) {
    return <div className="course-details-empty">No course selected</div>;
  }
  
  // Find the active tee
  const activeTee = course.teeOptions.find(tee => tee.id === activeTeeId);
  
  // Calculate course statistics
  const calculateStats = (tee: TeeOption) => {
    if (!tee.holes || tee.holes.length === 0) return null;
    
    const frontNine = tee.holes.filter(h => h.number <= 9);
    const backNine = tee.holes.filter(h => h.number > 9 && h.number <= 18);
    
    const totalYardage = tee.holes.reduce((sum, hole) => sum + hole.yardage, 0);
    const frontYardage = frontNine.reduce((sum, hole) => sum + hole.yardage, 0);
    const backYardage = backNine.reduce((sum, hole) => sum + hole.yardage, 0);
    
    const totalPar = tee.holes.reduce((sum, hole) => sum + hole.par, 0);
    const frontPar = frontNine.reduce((sum, hole) => sum + hole.par, 0);
    const backPar = backNine.reduce((sum, hole) => sum + hole.par, 0);
    
    const par3Count = tee.holes.filter(h => h.par === 3).length;
    const par4Count = tee.holes.filter(h => h.par === 4).length;
    const par5Count = tee.holes.filter(h => h.par === 5).length;
    
    return {
      totalYardage,
      frontYardage,
      backYardage,
      totalPar,
      frontPar,
      backPar,
      par3Count,
      par4Count,
      par5Count
    };
  };
  
  const teeStats = activeTee ? calculateStats(activeTee) : null;
  
  return (
    <div className="course-details-panel">
      <div className="course-details-header">
        <h3>{course.name}</h3>
        <p className="course-location">{course.location}</p>
      </div>
      
      <div className="tee-selector">
        {course.teeOptions.map(tee => (
          <button
            key={tee.id}
            className={`tee-button ${activeTeeId === tee.id ? 'active' : ''}`}
            style={{ backgroundColor: tee.color.toLowerCase() }}
            onClick={() => setActiveTeeId(tee.id)}
          >
            {tee.name}
          </button>
        ))}
      </div>
      
      {activeTee && teeStats && (
        <div className="tee-details">
          <div className="tee-info">
            <h4>{activeTee.name} Tees</h4>
            <div className="tee-specs">
              <div className="tee-spec">
                <span className="spec-label">Rating:</span>
                <span className="spec-value">{activeTee.rating}</span>
              </div>
              <div className="tee-spec">
                <span className="spec-label">Slope:</span>
                <span className="spec-value">{activeTee.slope}</span>
              </div>
              <div className="tee-spec">
                <span className="spec-label">Yardage:</span>
                <span className="spec-value">{teeStats.totalYardage} yards</span>
              </div>
              <div className="tee-spec">
                <span className="spec-label">Par:</span>
                <span className="spec-value">{teeStats.totalPar}</span>
              </div>
            </div>
          </div>
          
          <div className="course-stats">
            <div className="stats-row">
              <div className="stat-box">
                <h5>Front 9</h5>
                <div>Yards: {teeStats.frontYardage}</div>
                <div>Par: {teeStats.frontPar}</div>
              </div>
              <div className="stat-box">
                <h5>Back 9</h5>
                <div>Yards: {teeStats.backYardage}</div>
                <div>Par: {teeStats.backPar}</div>
              </div>
            </div>
            
            <div className="par-distribution">
              <h5>Hole Distribution</h5>
              <div className="par-bars">
                <div className="par-bar par3" style={{ width: `${(teeStats.par3Count / 18) * 100}%` }}>
                  Par 3: {teeStats.par3Count}
                </div>
                <div className="par-bar par4" style={{ width: `${(teeStats.par4Count / 18) * 100}%` }}>
                  Par 4: {teeStats.par4Count}
                </div>
                <div className="par-bar par5" style={{ width: `${(teeStats.par5Count / 18) * 100}%` }}>
                  Par 5: {teeStats.par5Count}
                </div>
              </div>
            </div>
          </div>
          
          <div className="hole-preview">
            <h4>Hole Preview</h4>
            <div className="hole-grid">
              {activeTee.holes
                .sort((a, b) => a.number - b.number)
                .map(hole => (
                  <div key={hole.number} className="hole-card">
                    <div className="hole-number">#{hole.number}</div>
                    <div className="hole-card-details">
                      <div className="hole-yardage">{hole.yardage} yds</div>
                      <div className="hole-par">Par {hole.par}</div>
                      <div className="hole-si">SI: {hole.strokeIndex}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 
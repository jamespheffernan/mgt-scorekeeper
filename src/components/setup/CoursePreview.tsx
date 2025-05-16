import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { millbrookDb } from '../../db/millbrookDb';
import { Course } from '../../db/courseModel';
import { CourseDetailsPanel } from './CourseDetailsPanel';

export const CoursePreview = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  
  // Load all courses
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const allCourses = await millbrookDb.getAllCourses();
        setCourses(allCourses);
        
        // Set the first course as default selected
        if (allCourses.length > 0) {
          setSelectedCourseId(allCourses[0].id);
        }
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCourses();
  }, []);
  
  const handleCourseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCourseId(event.target.value);
  };
  
  const handleBackClick = () => {
    navigate(-1);
  };
  
  if (loading) {
    return <div className="loading">Loading courses...</div>;
  }
  
  return (
    <div className="course-preview-container">
      <h2>Course Preview</h2>
      
      <div className="course-selector">
        <label htmlFor="course-select">Select a course:</label>
        <select 
          id="course-select"
          value={selectedCourseId || ''}
          onChange={handleCourseChange}
          className="course-select"
        >
          {courses.length === 0 ? (
            <option value="">No courses available</option>
          ) : (
            courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name} - {course.location}
              </option>
            ))
          )}
        </select>
      </div>
      
      <CourseDetailsPanel courseId={selectedCourseId} />
      
      <div className="course-preview-actions">
        <button 
          className="back-button"
          onClick={handleBackClick}
        >
          Back
        </button>
      </div>
    </div>
  );
}; 
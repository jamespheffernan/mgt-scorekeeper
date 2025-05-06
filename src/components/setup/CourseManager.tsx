import React, { useState, useEffect, useRef } from 'react';
import { millbrookDb } from '../../db/millbrookDb';
import { Course, TeeOption, Gender, HoleInfo } from '../../db/courseModel';
import { HoleEditor } from './HoleEditor';
import '../../App.css';

// CourseForm component
interface CourseFormProps {
  course?: Course;
  onSave: (course: Course) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

const CourseForm: React.FC<CourseFormProps> = ({ course, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    name: course?.name || '',
    location: course?.location || '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.location) {
      alert('Name and location are required');
      return;
    }
    
    const updatedCourse: Course = {
      id: course?.id || crypto.randomUUID(),
      name: formData.name,
      location: formData.location,
      teeOptions: course?.teeOptions || [],
      dateAdded: course?.dateAdded || new Date(),
    };
    
    await onSave(updatedCourse);
  };
  
  return (
    <form onSubmit={handleSubmit} className="course-form">
      <div className="form-group">
        <label htmlFor="name">Course Name:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="location">Location:</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="form-actions">
        <button type="submit" className="save-button">
          {course ? 'Update Course' : 'Add Course'}
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      
      {course && onDelete && (
        <button type="button" className="delete-button" onClick={onDelete}>
          Delete Course
        </button>
      )}
    </form>
  );
};

// CourseDetails component
interface CourseDetailsProps {
  course: Course;
}

const CourseDetails: React.FC<CourseDetailsProps> = ({ course }) => {
  return (
    <div className="course-details">
      <div className="detail-group">
        <label>Name:</label>
        <span>{course.name}</span>
      </div>
      
      <div className="detail-group">
        <label>Location:</label>
        <span>{course.location}</span>
      </div>
      
      <div className="detail-group">
        <label>Tee Options:</label>
        <div className="tee-list">
          {course.teeOptions.map(tee => (
            <div key={tee.id} className="tee-pill" style={{ backgroundColor: tee.color.toLowerCase() }}>
              {tee.name}
            </div>
          ))}
        </div>
      </div>
      
      {course.dateAdded && (
        <div className="detail-group">
          <label>Added:</label>
          <span>{new Date(course.dateAdded).toLocaleDateString()}</span>
        </div>
      )}
      
      {course.lastPlayed && (
        <div className="detail-group">
          <label>Last Played:</label>
          <span>{new Date(course.lastPlayed).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
};

// TeeDetails component
interface TeeDetailsProps {
  tee: TeeOption;
}

const TeeDetails: React.FC<TeeDetailsProps> = ({ tee }) => {
  return (
    <div className="tee-details">
      <div className="tee-header">
        <div 
          className="tee-color-indicator" 
          style={{ backgroundColor: tee.color.toLowerCase() }}
        ></div>
        <h4>{tee.name} Tees</h4>
      </div>
      
      <div className="detail-group">
        <label>Color:</label>
        <span>{tee.color}</span>
      </div>
      
      <div className="detail-group">
        <label>Gender:</label>
        <span>{tee.gender === 'M' ? 'Men' : tee.gender === 'F' ? 'Women' : 'Any'}</span>
      </div>
      
      <div className="detail-group">
        <label>Course Rating:</label>
        <span>{tee.rating}</span>
      </div>
      
      <div className="detail-group">
        <label>Slope Rating:</label>
        <span>{tee.slope}</span>
      </div>
      
      <div className="hole-summary">
        <h4>Hole Information</h4>
        {tee.holes && tee.holes.length > 0 ? (
          <div className="hole-stats">
            <p>
              Total Par: {tee.holes.reduce((sum, hole) => sum + hole.par, 0)}
            </p>
            <p>
              Total Yardage: {tee.holes.reduce((sum, hole) => sum + hole.yardage, 0)} yards
            </p>
          </div>
        ) : (
          <p className="no-holes">No hole information available. Click "Edit Holes" to add details.</p>
        )}
      </div>
    </div>
  );
};

export const CourseManager: React.FC = () => {
  // State for course management
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTee, setSelectedTee] = useState<TeeOption | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isAddingTee, setIsAddingTee] = useState(false);
  const [isEditingHoles, setIsEditingHoles] = useState(false);
  
  // Form state
  const [courseForm, setCourseForm] = useState<{
    name: string;
    location: string;
  }>({ name: '', location: '' });
  
  const [teeForm, setTeeForm] = useState<{
    name: string;
    color: string;
    gender: Gender;
    rating: number;
    slope: number;
  }>({ name: '', color: '', gender: 'M', rating: 72, slope: 113 });

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, []);

  // Load all courses from DB
  const loadCourses = async () => {
    try {
      const allCourses = await millbrookDb.getAllCourses();
      setCourses(allCourses);
      
      // Select first course if available and none selected
      if (allCourses.length > 0 && !selectedCourse) {
        setSelectedCourse(allCourses[0]);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      alert('Failed to load courses. Please try again.');
    }
  };

  // Handle course selection
  const handleCourseSelect = (courseId: string) => {
    const course = courses.find(c => c.id === courseId) || null;
    setSelectedCourse(course);
    setSelectedTee(null);
    setIsEditing(false);
    
    // Reset forms with selected course data
    if (course) {
      setCourseForm({
        name: course.name,
        location: course.location || '',
      });
    }
  };

  // Handle tee selection
  const handleTeeSelect = (teeId: string) => {
    if (!selectedCourse) return;
    
    const tee = selectedCourse.teeOptions.find(t => t.id === teeId) || null;
    setSelectedTee(tee);
    
    // Reset tee form with selected tee data
    if (tee) {
      setTeeForm({
        name: tee.name,
        color: tee.color,
        gender: tee.gender,
        rating: tee.rating,
        slope: tee.slope,
      });
    }
  };

  // Handle course form changes
  const handleCourseFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCourseForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle tee form changes
  const handleTeeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTeeForm(prev => ({ 
      ...prev, 
      [name]: name === 'rating' || name === 'slope' ? parseFloat(value) : value 
    }));
  };

  // Add new course
  const handleAddCourse = () => {
    setIsAddingCourse(true);
    setSelectedCourse(null);
    setSelectedTee(null);
    setCourseForm({ name: '', location: '' });
  };

  // Save course (new or edit)
  const handleSaveCourse = async () => {
    try {
      if (!courseForm.name.trim()) {
        alert('Course name is required');
        return;
      }
      
      if (isAddingCourse) {
        // Create new course with default tee options
        const newCourse: Course = {
          id: crypto.randomUUID(),
          name: courseForm.name,
          location: courseForm.location,
          teeOptions: [{
            id: crypto.randomUUID(),
            name: 'Default',
            color: 'White',
            gender: 'Any',
            rating: 72.0,
            slope: 113,
            holes: Array.from({ length: 18 }, (_, i) => ({
              number: i + 1,
              par: 4,
              yardage: 400,
              strokeIndex: i + 1,
            } as HoleInfo))
          }]
        };
        
        await millbrookDb.saveCourse(newCourse);
        setIsAddingCourse(false);
        setSelectedCourse(newCourse);
      } else if (selectedCourse) {
        // Update existing course
        const updatedCourse: Course = {
          ...selectedCourse,
          name: courseForm.name,
          location: courseForm.location,
        };
        
        await millbrookDb.saveCourse(updatedCourse);
        setSelectedCourse(updatedCourse);
      }
      
      await loadCourses();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course. Please try again.');
    }
  };

  // Add new tee option
  const handleAddTee = () => {
    if (!selectedCourse) return;
    
    setIsAddingTee(true);
    setSelectedTee(null);
    setTeeForm({
      name: '',
      color: '',
      gender: 'Any',
      rating: 72.0,
      slope: 113,
    });
  };

  // Save tee option (new or edit)
  const handleSaveTee = async () => {
    try {
      if (!selectedCourse) return;
      if (!teeForm.name.trim() || !teeForm.color.trim()) {
        alert('Tee name and color are required');
        return;
      }
      
      let updatedCourse: Course;
      
      if (isAddingTee) {
        // Create new tee option with default hole data
        const newTee: TeeOption = {
          id: crypto.randomUUID(),
          name: teeForm.name,
          color: teeForm.color,
          gender: teeForm.gender,
          rating: teeForm.rating,
          slope: teeForm.slope,
          holes: Array.from({ length: 18 }, (_, i) => ({
            number: i + 1,
            par: selectedCourse.teeOptions[0]?.holes[i]?.par || 4,
            yardage: selectedCourse.teeOptions[0]?.holes[i]?.yardage || 400,
            strokeIndex: selectedCourse.teeOptions[0]?.holes[i]?.strokeIndex || i + 1,
          } as HoleInfo))
        };
        
        updatedCourse = {
          ...selectedCourse,
          teeOptions: [...selectedCourse.teeOptions, newTee]
        };
        
        setIsAddingTee(false);
        setSelectedTee(newTee);
      } else if (selectedTee) {
        // Update existing tee option
        const updatedTee: TeeOption = {
          ...selectedTee,
          name: teeForm.name,
          color: teeForm.color,
          gender: teeForm.gender as Gender,
          rating: teeForm.rating,
          slope: teeForm.slope,
        };
        
        updatedCourse = {
          ...selectedCourse,
          teeOptions: selectedCourse.teeOptions.map(tee => 
            tee.id === selectedTee.id ? updatedTee : tee
          )
        };
        
        setSelectedTee(updatedTee);
      } else {
        return;
      }
      
      await millbrookDb.saveCourse(updatedCourse);
      setSelectedCourse(updatedCourse);
      await loadCourses();
    } catch (error) {
      console.error('Error saving tee option:', error);
      alert('Failed to save tee option. Please try again.');
    }
  };

  // Delete course
  const handleDeleteCourse = async () => {
    try {
      if (!selectedCourse) return;
      
      if (!confirm(`Are you sure you want to delete ${selectedCourse.name}?`)) {
        return;
      }
      
      await millbrookDb.deleteCourse(selectedCourse.id);
      setSelectedCourse(null);
      setSelectedTee(null);
      await loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  // Delete tee option
  const handleDeleteTee = async () => {
    try {
      if (!selectedCourse || !selectedTee) return;
      
      // Prevent deleting the last tee option
      if (selectedCourse.teeOptions.length <= 1) {
        alert('Cannot delete the last tee option. A course must have at least one tee option.');
        return;
      }
      
      if (!confirm(`Are you sure you want to delete ${selectedTee.name} tees?`)) {
        return;
      }
      
      const updatedCourse: Course = {
        ...selectedCourse,
        teeOptions: selectedCourse.teeOptions.filter(tee => tee.id !== selectedTee.id)
      };
      
      await millbrookDb.saveCourse(updatedCourse);
      setSelectedCourse(updatedCourse);
      setSelectedTee(null);
      await loadCourses();
    } catch (error) {
      console.error('Error deleting tee option:', error);
      alert('Failed to delete tee option. Please try again.');
    }
  };

  // Navigate to hole editor
  const handleEditHoles = () => {
    if (!selectedCourse || !selectedTee) return;
    setIsEditingHoles(true);
  };

  // Save updated tee from hole editor
  const handleSaveHoles = async (updatedTee: TeeOption) => {
    try {
      if (!selectedCourse) return;
      
      const updatedCourse: Course = {
        ...selectedCourse,
        teeOptions: selectedCourse.teeOptions.map(tee => 
          tee.id === updatedTee.id ? updatedTee : tee
        )
      };
      
      await millbrookDb.saveCourse(updatedCourse);
      setSelectedCourse(updatedCourse);
      setSelectedTee(updatedTee);
      setIsEditingHoles(false);
      await loadCourses();
    } catch (error) {
      console.error('Error saving hole data:', error);
      alert('Failed to save hole data. Please try again.');
    }
  };

  // Cancel hole editing
  const handleCancelHoleEdit = () => {
    setIsEditingHoles(false);
  };

  // Export selected course as JSON
  const handleExportCourse = () => {
    if (!selectedCourse) return;
    
    try {
      // Create a JSON blob
      const courseData = JSON.stringify(selectedCourse, null, 2);
      const blob = new Blob([courseData], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedCourse.name.replace(/\s+/g, '_')}.json`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`Course "${selectedCourse.name}" exported successfully.`);
    } catch (error) {
      console.error('Error exporting course:', error);
      alert('Failed to export course. See console for details.');
    }
  };
  
  // Export all courses as JSON
  const handleExportAllCourses = async () => {
    try {
      // Fetch all courses
      const allCourses = await millbrookDb.getAllCourses();
      
      if (!allCourses || allCourses.length === 0) {
        alert('No courses to export.');
        return;
      }
      
      // Create a JSON blob
      const coursesData = JSON.stringify(allCourses, null, 2);
      const blob = new Blob([coursesData], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'millbrook_courses.json';
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`${allCourses.length} courses exported successfully.`);
    } catch (error) {
      console.error('Error exporting all courses:', error);
      alert('Failed to export courses. See console for details.');
    }
  };
  
  // Trigger file input click
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Import course(s) from JSON file
  const handleImportCourses = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      // Read the file
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importedData = JSON.parse(content);
          
          // Check if it's a single course or an array of courses
          const coursesToImport = Array.isArray(importedData) ? importedData : [importedData];
          
          // Validate course data
          const validCourses = coursesToImport.filter(course => {
            return (
              course.id && 
              course.name && 
              course.location && 
              Array.isArray(course.teeOptions) &&
              course.teeOptions.length > 0
            );
          });
          
          if (validCourses.length === 0) {
            alert('No valid course data found in the imported file.');
            return;
          }
          
          // Import courses
          let importCount = 0;
          for (const course of validCourses) {
            // Generate new IDs for the course and tee options to avoid conflicts
            const newCourse: Course = {
              ...course,
              id: crypto.randomUUID(),
              teeOptions: course.teeOptions.map((tee: TeeOption) => ({
                ...tee,
                id: crypto.randomUUID()
              })),
              dateAdded: new Date()
            };
            
            await millbrookDb.saveCourse(newCourse);
            importCount++;
          }
          
          // Refresh course list
          const updatedCourses = await millbrookDb.getAllCourses();
          setCourses(updatedCourses || []);
          
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
          alert(`Successfully imported ${importCount} course(s).`);
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          alert('Failed to parse the imported file. Make sure it contains valid JSON.');
        }
      };
      
      fileReader.readAsText(file);
    } catch (error) {
      console.error('Error importing courses:', error);
      alert('Failed to import courses. See console for details.');
    }
  };

  // If editing holes, show the hole editor
  if (isEditingHoles && selectedTee && selectedCourse) {
    return <HoleEditor 
      tee={selectedTee} 
      onSave={handleSaveHoles} 
      onCancel={handleCancelHoleEdit} 
    />;
  }

  return (
    <div className="course-manager">
      <h2>Course Manager</h2>
      <p>Add, edit, and manage golf courses for your games.</p>
      
      <div className="course-manager-actions">
        <button className="add-button" onClick={() => setIsAddingCourse(true)}>
          Add New Course
        </button>
        <button 
          className="export-button"
          onClick={handleExportAllCourses}
          disabled={courses.length === 0}
        >
          Export All Courses
        </button>
        <button 
          className="import-button"
          onClick={handleImportClick}
        >
          Import Courses
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportCourses}
          accept=".json"
          style={{ display: 'none' }}
        />
      </div>
      
      <div className="course-manager-layout">
        <div className="course-list-panel">
          <div className="panel-header">
            <h3>Courses</h3>
          </div>
          
          {courses.length === 0 ? (
            <div className="empty-state">No courses available. Add a new course to get started.</div>
          ) : (
            <div className="course-list">
              {courses.map(course => (
                <div
                  key={course.id}
                  className={`course-item ${selectedCourse?.id === course.id ? 'selected' : ''}`}
                  onClick={() => handleCourseSelect(course.id)}
                >
                  {course.name} ({course.location})
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="course-details-panel">
          <div className="panel-header">
            <h3>Course Details</h3>
            {selectedCourse && !isAddingCourse && !isEditing && (
              <div className="panel-actions">
                <button className="edit-button" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
                <button className="export-button" onClick={handleExportCourse}>
                  Export
                </button>
              </div>
            )}
          </div>
          
          {isAddingCourse ? (
            <CourseForm
              onSave={handleSaveCourse}
              onCancel={() => setIsAddingCourse(false)}
            />
          ) : isEditing && selectedCourse ? (
            <CourseForm
              course={selectedCourse}
              onSave={handleSaveCourse}
              onCancel={() => setIsEditing(false)}
              onDelete={handleDeleteCourse}
            />
          ) : selectedCourse ? (
            <CourseDetails course={selectedCourse} />
          ) : (
            <div className="empty-state">Select a course to view details.</div>
          )}
        </div>
        
        <div className="tee-details-panel">
          <div className="panel-header">
            <h3>Tee Details</h3>
            {selectedTee && selectedCourse && !isEditingHoles && (
              <button 
                className="edit-holes-button"
                onClick={() => setIsEditingHoles(true)}
              >
                Edit Holes
              </button>
            )}
          </div>
          
          {selectedTee ? (
            <TeeDetails tee={selectedTee} />
          ) : (
            <div className="empty-state">Select a tee to view details.</div>
          )}
        </div>
      </div>
      
      {/* Hole Editor Modal */}
      {isEditingHoles && selectedTee && selectedCourse && (
        <div className="modal-overlay">
          <div className="modal-content">
            <HoleEditor
              tee={selectedTee}
              onSave={handleSaveHoles}
              onCancel={() => setIsEditingHoles(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 
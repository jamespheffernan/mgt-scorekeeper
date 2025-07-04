import React, { useState, useEffect, useRef } from 'react';
import { millbrookDb } from '../../db/millbrookDb';
import { Course, TeeOption, HoleInfo, CourseImportRecord } from '../../db/courseModel';
import { HoleEditor } from './HoleEditor';
import { TeeEditor } from './TeeEditor';
import { CourseCreationWizard } from './CourseCreationWizard';
import { PhotoImportDialog } from './PhotoImportDialog';
import { OCRValidationDialog } from './OCRValidationDialog';
import type { OCRResult } from '../../types/ocr';
import { scorecardParser } from '../../utils/scorecardParser';

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
  onTeeSelect?: (tee: TeeOption) => void;
  selectedTee?: TeeOption | null;
}

const CourseDetails: React.FC<CourseDetailsProps> = ({ course, onTeeSelect, selectedTee }) => {
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
            <div 
              key={tee.id} 
              className={`tee-item ${selectedTee?.id === tee.id ? 'selected' : ''}`}
              onClick={() => onTeeSelect?.(tee)}
              style={{ cursor: onTeeSelect ? 'pointer' : 'default' }}
            >
              <div 
                className="tee-color-indicator" 
                style={{ backgroundColor: tee.color.toLowerCase() }}
              ></div>
              <span className="tee-name">{tee.name}</span>
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
  const [isEditingHoles, setIsEditingHoles] = useState(false);
  const [isEditingTee, setIsEditingTee] = useState(false);
  const [isUsingWizard, setIsUsingWizard] = useState(false);
  const [isPhotoImportOpen, setIsPhotoImportOpen] = useState(false);
  const [isOCRValidationOpen, setIsOCRValidationOpen] = useState(false);
  const [currentOCRResult, setCurrentOCRResult] = useState<OCRResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [courseForm, setCourseForm] = useState<{
    name: string;
    location: string;
  }>({ name: '', location: '' });
  
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

  // Save updated tee from tee editor
  const handleSaveTee = async (updatedTee: TeeOption) => {
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
      setIsEditingTee(false);
      await loadCourses();
    } catch (error) {
      console.error('Error saving tee data:', error);
      alert('Failed to save tee data. Please try again.');
    }
  };

  // Cancel hole editing
  const handleCancelHoleEdit = () => {
    setIsEditingHoles(false);
  };

  // Cancel tee editing
  const handleCancelTeeEdit = () => {
    setIsEditingTee(false);
  };

  // Handle tee selection
  const handleTeeSelect = (tee: TeeOption) => {
    setSelectedTee(tee);
  };

  // Handle wizard completion
  const handleWizardComplete = async (course: Course) => {
    try {
      await millbrookDb.saveCourse(course);
      setIsUsingWizard(false);
      setSelectedCourse(course);
      await loadCourses();
      alert(`Course "${course.name}" created successfully!`);
    } catch (error) {
      console.error('Error saving course from wizard:', error);
      alert('Failed to save course. Please try again.');
    }
  };

  // Handle wizard cancel
  const handleWizardCancel = () => {
    setIsUsingWizard(false);
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
          
          // Get existing courses for duplicate detection
          const existingCourses = await millbrookDb.getAllCourses();
          
          // Validate course data and track imports
          const validCourses = [];
          const importRecords: CourseImportRecord[] = [];
          let importCount = 0;
          let duplicateCount = 0;
          
          for (const course of coursesToImport) {
            // Basic validation
            if (!(course.id && course.name && course.location && Array.isArray(course.teeOptions) && course.teeOptions.length > 0)) {
              console.warn('Skipping invalid course data:', course);
              continue;
            }
            
            // Check for duplicates
            const duplicateCandidate = existingCourses?.find(existing => 
              existing.name.toLowerCase().trim() === course.name.toLowerCase().trim() &&
              existing.location?.toLowerCase().trim() === course.location?.toLowerCase().trim()
            );
            
            let finalCourse = course;
            let action: 'new' | 'replaced' | 'kept-both' = 'new';
            
            if (duplicateCandidate) {
              duplicateCount++;
              // For batch imports, we'll keep both and rename the new one
              finalCourse = {
                ...course,
                id: crypto.randomUUID(),
                name: `${course.name} (Imported ${new Date().toLocaleDateString()})`,
                teeOptions: course.teeOptions.map((tee: TeeOption) => ({
                  ...tee,
                  id: crypto.randomUUID()
                })),
                dateAdded: new Date()
              };
              action = 'kept-both';
            } else {
              // Generate new IDs for the course and tee options to avoid conflicts
              finalCourse = {
                ...course,
                id: crypto.randomUUID(),
                teeOptions: course.teeOptions.map((tee: TeeOption) => ({
                  ...tee,
                  id: crypto.randomUUID()
                })),
                dateAdded: new Date()
              };
            }
            
            validCourses.push(finalCourse);
            
            // Create import record
            const importRecord: CourseImportRecord = {
              id: crypto.randomUUID(),
              timestamp: new Date(),
              courseId: finalCourse.id,
              courseName: finalCourse.name,
              source: 'JSON File Import',
              action: action,
              originalData: course // Store original for audit
            };
            importRecords.push(importRecord);
          }
          
          if (validCourses.length === 0) {
            alert('No valid course data found in the imported file.');
            return;
          }
          
          // Import courses and save records
          for (let i = 0; i < validCourses.length; i++) {
            await millbrookDb.saveCourse(validCourses[i]);
            await millbrookDb.saveCourseImportRecord(importRecords[i]);
            importCount++;
          }
          
          // Refresh course list
          const updatedCourses = await millbrookDb.getAllCourses();
          setCourses(updatedCourses || []);
          
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
          // Show detailed result message
          let resultMessage = `Successfully imported ${importCount} course(s).`;
          if (duplicateCount > 0) {
            resultMessage += `\n${duplicateCount} duplicate(s) were renamed to avoid conflicts.`;
          }
          alert(resultMessage);
          
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

  // Handle photo import button click
  const handlePhotoImportClick = () => {
    setIsPhotoImportOpen(true);
  };

  // Handle photo import dialog close
  const handlePhotoImportClose = () => {
    setIsPhotoImportOpen(false);
  };

  // Handle OCR result from photo import
  const handleOCRResult = async (result: OCRResult) => {
    try {
      console.log('OCR Result received:', result);
      
      if (result.extractedData) {
        // Open validation dialog for review and correction
        setCurrentOCRResult(result);
        setIsOCRValidationOpen(true);
      } else if (result.rawText.trim()) {
        // Fallback to raw text display if no structured data
        const shouldProceed = confirm(
          `OCR processing completed but no structured data was extracted.\n\nRaw text (${result.rawText.length} characters):\n\n${result.rawText.substring(0, 500)}${result.rawText.length > 500 ? '...' : ''}\n\nThis might happen with unclear images or non-standard scorecard layouts.\n\nWould you like to see the full extracted text in the console?`
        );
        
        if (shouldProceed) {
          console.log('Full OCR Text:', result.rawText);
          console.log('OCR Confidence:', result.confidence);
          console.log('OCR Words:', result.words);
        }
      } else {
        alert('No text was detected in the image. Please try a clearer image or adjust the camera angle.');
      }
      
    } catch (error) {
      console.error('Error processing OCR result:', error);
      alert('Failed to process OCR result. Please try again.');
    }
  };

  // Handle course import from OCR validation
  const handleOCRCourseImport = async (course: Course) => {
    try {
      // Check for duplicate courses first
      const existingCourses = await millbrookDb.getAllCourses();
      const duplicateCandidate = existingCourses?.find(existing => 
        existing.name.toLowerCase().trim() === course.name.toLowerCase().trim() &&
        existing.location?.toLowerCase().trim() === course.location?.toLowerCase().trim()
      );

      let importedCourse = course;
      let message = '';

      if (duplicateCandidate) {
        // Show duplicate detection dialog
        const userChoice = confirm(
          `A course with the same name and location already exists:\n\n` +
          `Existing: "${duplicateCandidate.name}" at "${duplicateCandidate.location}"\n` +
          `New: "${course.name}" at "${course.location}"\n\n` +
          `Would you like to:\n` +
          `• Click OK to REPLACE the existing course\n` +
          `• Click Cancel to KEEP BOTH courses (new course will be renamed)`
        );

        if (userChoice) {
          // Replace existing course - use existing ID and preserve metadata
          importedCourse = {
            ...course,
            id: duplicateCandidate.id,
            dateAdded: duplicateCandidate.dateAdded,
            lastPlayed: duplicateCandidate.lastPlayed,
            timesPlayed: duplicateCandidate.timesPlayed || 0
          };
          message = `Successfully replaced existing course: ${course.name}`;
        } else {
          // Keep both - rename new course
          importedCourse = {
            ...course,
            name: `${course.name} (Imported ${new Date().toLocaleDateString()})`
          };
          message = `Successfully imported course as: ${importedCourse.name}`;
        }
      } else {
        message = `Successfully imported course: ${course.name}`;
      }

      // Track import for audit trail
      const importRecord: CourseImportRecord = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        courseId: importedCourse.id,
        courseName: importedCourse.name,
        source: 'OCR Photo Import',
        action: duplicateCandidate ? (importedCourse.id === duplicateCandidate.id ? 'replaced' : 'kept-both') : 'new',
        confidence: currentOCRResult?.confidence || 0,
        extractedData: !!currentOCRResult?.extractedData
      };

      // Save course and record import
      await millbrookDb.saveCourse(importedCourse);
      await millbrookDb.saveCourseImportRecord(importRecord);
      
      await loadCourses();
      alert(message);

      // Close validation dialog
      setIsOCRValidationOpen(false);
      setCurrentOCRResult(null);
      
    } catch (error) {
      console.error('Error importing course:', error);
      alert('Failed to import course. Please try again.');
    }
  };

  // Handle OCR validation dialog close
  const handleOCRValidationClose = () => {
    setIsOCRValidationOpen(false);
    setCurrentOCRResult(null);
  };

  // If editing holes, show the hole editor
  if (isEditingHoles && selectedTee && selectedCourse) {
    return <HoleEditor 
      tee={selectedTee} 
      onSave={handleSaveHoles} 
      onCancel={handleCancelHoleEdit} 
    />;
  }

  // If editing tee, show the tee editor
  if (isEditingTee && selectedTee) {
    return <TeeEditor 
      tee={selectedTee} 
      onSave={handleSaveTee} 
      onCancel={handleCancelTeeEdit} 
    />;
  }

  // If using wizard, show the course creation wizard
  if (isUsingWizard) {
    return <CourseCreationWizard 
      onComplete={handleWizardComplete}
      onCancel={handleWizardCancel}
    />;
  }

  return (
    <div className="course-manager">
      <h2>Course Manager</h2>
      <p>Add, edit, and manage golf courses for your games.</p>
      
      <div className="course-manager-actions">
        <button className="add-button" onClick={() => setIsUsingWizard(true)}>
          Create Course (Wizard)
        </button>
        <button className="add-button" onClick={() => setIsAddingCourse(true)}>
          Quick Add Course
        </button>
        <button 
          className="import-photo-button"
          onClick={handlePhotoImportClick}
        >
          📷 Import from Photo
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
          
          {courses.length > 0 && (
            <div className="search-container">
              <input
                type="text"
                placeholder="Search courses by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          )}
          
          {courses.length === 0 ? (
            <div className="empty-state">No courses available. Add a new course to get started.</div>
          ) : (
            <div className="course-list">
              {courses
                .filter(course => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    course.name.toLowerCase().includes(query) ||
                    course.location?.toLowerCase().includes(query)
                  );
                })
                .map(course => (
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
            <CourseDetails 
              course={selectedCourse} 
              onTeeSelect={handleTeeSelect}
              selectedTee={selectedTee}
            />
          ) : (
            <div className="empty-state">Select a course to view details.</div>
          )}
        </div>
        
        <div className="tee-details-panel">
          <div className="panel-header">
            <h3>Tee Details</h3>
            {selectedTee && selectedCourse && !isEditingHoles && !isEditingTee && (
              <div className="panel-actions">
                <button 
                  className="edit-button"
                  onClick={() => setIsEditingTee(true)}
                >
                  Edit Tee
                </button>
                <button 
                  className="edit-holes-button"
                  onClick={() => setIsEditingHoles(true)}
                >
                  Edit Holes
                </button>
              </div>
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
      
      {/* Photo Import Dialog */}
      <PhotoImportDialog
        isOpen={isPhotoImportOpen}
        onClose={handlePhotoImportClose}
        onResult={handleOCRResult}
      />

      {/* OCR Validation Dialog */}
      <OCRValidationDialog
        isOpen={isOCRValidationOpen}
        ocrResult={currentOCRResult}
        onClose={handleOCRValidationClose}
        onImport={handleOCRCourseImport}
      />
    </div>
  );
}; 
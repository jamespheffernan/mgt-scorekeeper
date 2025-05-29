import React, { useState, useEffect } from 'react';
import { Course, TeeOption, HoleInfo } from '../../db/courseModel';
import { COURSE_TEMPLATES } from '../../db/courseFormats';
import { validateCourse } from '../../db/courseValidation';

interface CourseCreationWizardProps {
  onComplete: (course: Course) => Promise<void>;
  onCancel: () => void;
}

// Step 1: Template Selection
interface TemplateStepProps {
  onNext: (template: 'standard' | 'executive' | 'custom') => void;
  onCancel: () => void;
}

const TemplateStep: React.FC<TemplateStepProps> = ({ onNext, onCancel }) => {
  return (
    <div className="wizard-step">
      <h3>Choose Course Template</h3>
      <p>Select a template to start with, or create a custom course from scratch.</p>
      
      <div className="template-options">
        <div className="template-card" onClick={() => onNext('standard')}>
          <h4>Standard 18-Hole (Par 72)</h4>
          <p>Traditional 18-hole course with 4 par 3s, 10 par 4s, and 4 par 5s</p>
          <ul>
            <li>Rating: 72.0</li>
            <li>Slope: 113</li>
            <li>Championship tees included</li>
          </ul>
        </div>
        
        <div className="template-card" onClick={() => onNext('executive')}>
          <h4>Executive Course (Par 71)</h4>
          <p>Shorter course ideal for beginners or quick rounds</p>
          <ul>
            <li>Rating: 65.0</li>
            <li>Slope: 105</li>
            <li>More par 3s and shorter holes</li>
          </ul>
        </div>
        
        <div className="template-card" onClick={() => onNext('custom')}>
          <h4>Custom Course</h4>
          <p>Start from scratch and design your own course layout</p>
          <ul>
            <li>Complete customization</li>
            <li>Set your own par values</li>
            <li>Configure all tee options</li>
          </ul>
        </div>
      </div>
      
      <div className="wizard-actions">
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

// Step 2: Course Basic Info
interface BasicInfoStepProps {
  course: Partial<Course>;
  onChange: (updates: Partial<Course>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ course, onChange, onNext, onBack, onCancel }) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (field: keyof Course, value: string) => {
    onChange({ [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateAndNext = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!course.name?.trim()) {
      newErrors.name = 'Course name is required';
    }
    
    if (!course.location?.trim()) {
      newErrors.location = 'Course location is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onNext();
  };

  return (
    <div className="wizard-step">
      <h3>Course Information</h3>
      <p>Enter the basic details for your golf course.</p>
      
      <div className="form-group">
        <label htmlFor="courseName">Course Name *</label>
        <input
          type="text"
          id="courseName"
          value={course.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Millbrook Golf & Tennis Club"
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-message">{errors.name}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="courseLocation">Location *</label>
        <input
          type="text"
          id="courseLocation"
          value={course.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="e.g., Greenfield, NY"
          className={errors.location ? 'error' : ''}
        />
        {errors.location && <span className="error-message">{errors.location}</span>}
      </div>
      
      <div className="wizard-actions">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="next-button" onClick={validateAndNext}>
          Next
        </button>
      </div>
    </div>
  );
};

// Step 3: Tee Configuration
interface TeeConfigStepProps {
  course: Partial<Course>;
  onChange: (updates: Partial<Course>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

const TeeConfigStep: React.FC<TeeConfigStepProps> = ({ course, onChange, onNext, onBack, onCancel }) => {
  const [selectedTeeIndex, setSelectedTeeIndex] = useState<number>(0);

  const teeOptions = course.teeOptions || [];

  const addTee = () => {
    const newTee: TeeOption = {
      id: crypto.randomUUID(),
      name: 'New Tee',
      color: 'White',
      gender: 'Any',
      rating: 72.0,
      slope: 113,
      holes: []
    };
    
    const updatedTees = [...teeOptions, newTee];
    onChange({ teeOptions: updatedTees });
    setSelectedTeeIndex(updatedTees.length - 1);
  };

  const updateTee = (index: number, updates: Partial<TeeOption>) => {
    const updatedTees = teeOptions.map((tee, i) => 
      i === index ? { ...tee, ...updates } : tee
    );
    onChange({ teeOptions: updatedTees });
  };

  const removeTee = (index: number) => {
    const updatedTees = teeOptions.filter((_, i) => i !== index);
    onChange({ teeOptions: updatedTees });
    if (selectedTeeIndex >= updatedTees.length) {
      setSelectedTeeIndex(Math.max(0, updatedTees.length - 1));
    }
  };

  const validateAndNext = () => {
    if (teeOptions.length === 0) {
      alert('At least one tee option is required');
      return;
    }
    
    // Validate each tee
    for (const tee of teeOptions) {
      if (!tee.name.trim()) {
        alert('All tee options must have a name');
        return;
      }
      if (tee.rating <= 0 || tee.slope <= 0) {
        alert('Rating and slope must be positive numbers');
        return;
      }
    }
    
    onNext();
  };

  const selectedTee = teeOptions[selectedTeeIndex];

  return (
    <div className="wizard-step">
      <h3>Tee Configuration</h3>
      <p>Set up the different tee options for your course.</p>
      
      <div className="tee-config-layout">
        <div className="tee-list">
          <div className="tee-list-header">
            <h4>Tee Options</h4>
            <button type="button" className="add-tee-button" onClick={addTee}>
              Add Tee
            </button>
          </div>
          
          {teeOptions.length === 0 ? (
            <div className="empty-state">No tee options yet. Click "Add Tee" to start.</div>
          ) : (
            teeOptions.map((tee, index) => (
              <div
                key={tee.id}
                className={`tee-item ${selectedTeeIndex === index ? 'selected' : ''}`}
                onClick={() => setSelectedTeeIndex(index)}
              >
                <div 
                  className="tee-color-indicator" 
                  style={{ backgroundColor: tee.color.toLowerCase() }}
                ></div>
                <span className="tee-name">{tee.name}</span>
                <button 
                  type="button" 
                  className="remove-tee-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTee(index);
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="tee-details">
          {selectedTee ? (
            <div className="tee-form">
              <h4>Edit Tee: {selectedTee.name}</h4>
              
              <div className="form-group">
                <label htmlFor="teeName">Tee Name</label>
                <input
                  type="text"
                  id="teeName"
                  value={selectedTee.name}
                  onChange={(e) => updateTee(selectedTeeIndex, { name: e.target.value })}
                  placeholder="e.g., Championship, Regular, Forward"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="teeColor">Color</label>
                <select
                  id="teeColor"
                  value={selectedTee.color}
                  onChange={(e) => updateTee(selectedTeeIndex, { color: e.target.value })}
                >
                  <option value="Black">Black</option>
                  <option value="Blue">Blue</option>
                  <option value="White">White</option>
                  <option value="Gold">Gold</option>
                  <option value="Red">Red</option>
                  <option value="Green">Green</option>
                  <option value="Silver">Silver</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="teeGender">Recommended For</label>
                <select
                  id="teeGender"
                  value={selectedTee.gender}
                  onChange={(e) => updateTee(selectedTeeIndex, { gender: e.target.value as 'M' | 'F' | 'Any' })}
                >
                  <option value="Any">Any</option>
                  <option value="M">Men</option>
                  <option value="F">Women</option>
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="teeRating">Course Rating</label>
                  <input
                    type="number"
                    id="teeRating"
                    step="0.1"
                    min="50"
                    max="85"
                    value={selectedTee.rating}
                    onChange={(e) => updateTee(selectedTeeIndex, { rating: parseFloat(e.target.value) || 72.0 })}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="teeSlope">Slope Rating</label>
                  <input
                    type="number"
                    id="teeSlope"
                    min="55"
                    max="155"
                    value={selectedTee.slope}
                    onChange={(e) => updateTee(selectedTeeIndex, { slope: parseInt(e.target.value) || 113 })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">Select a tee to edit its details.</div>
          )}
        </div>
      </div>
      
      <div className="wizard-actions">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="next-button" onClick={validateAndNext}>
          Next
        </button>
      </div>
    </div>
  );
};

// Step 4: Hole Configuration
interface HoleConfigStepProps {
  course: Partial<Course>;
  onChange: (updates: Partial<Course>) => void;
  onComplete: () => void;
  onBack: () => void;
  onCancel: () => void;
}

const HoleConfigStep: React.FC<HoleConfigStepProps> = ({ course, onChange, onComplete, onBack, onCancel }) => {
  const [selectedTeeIndex, setSelectedTeeIndex] = useState<number>(0);
  const [selectedHoleNumber, setSelectedHoleNumber] = useState<number>(1);

  const teeOptions = course.teeOptions || [];
  const selectedTee = teeOptions[selectedTeeIndex];

  const updateHole = (holeNumber: number, updates: Partial<HoleInfo>) => {
    if (!selectedTee) return;

    const holes = [...(selectedTee.holes || [])];
    const existingIndex = holes.findIndex(h => h.number === holeNumber);
    
    if (existingIndex >= 0) {
      holes[existingIndex] = { ...holes[existingIndex], ...updates };
    } else {
      holes.push({
        number: holeNumber,
        par: 4,
        yardage: 400,
        strokeIndex: holeNumber,
        ...updates
      });
    }

    // Sort holes by number
    holes.sort((a, b) => a.number - b.number);

    const updatedTees = teeOptions.map((tee, i) => 
      i === selectedTeeIndex ? { ...tee, holes } : tee
    );
    onChange({ teeOptions: updatedTees });
  };

  const getHole = (holeNumber: number): HoleInfo | undefined => {
    return selectedTee?.holes?.find(h => h.number === holeNumber);
  };

  const fillWithDefaults = () => {
    if (!selectedTee) return;

    const defaultHoles: HoleInfo[] = [];
    for (let i = 1; i <= 18; i++) {
      const existing = getHole(i);
      if (!existing) {
        // Standard par distribution
        let par = 4;
        if (i === 2 || i === 6 || i === 11 || i === 15) par = 3; // 4 par 3s
        if (i === 3 || i === 8 || i === 12 || i === 17) par = 5; // 4 par 5s

        defaultHoles.push({
          number: i,
          par,
          yardage: par === 3 ? 150 : par === 5 ? 500 : 400,
          strokeIndex: i
        });
      } else {
        defaultHoles.push(existing);
      }
    }

    const updatedTees = teeOptions.map((tee, i) => 
      i === selectedTeeIndex ? { ...tee, holes: defaultHoles } : tee
    );
    onChange({ teeOptions: updatedTees });
  };

  const validateAndComplete = () => {
    // Validate that all tees have complete hole data
    for (const tee of teeOptions) {
      if (!tee.holes || tee.holes.length !== 18) {
        alert(`Tee "${tee.name}" must have 18 holes defined`);
        return;
      }
      
      for (let i = 1; i <= 18; i++) {
        const hole = tee.holes.find(h => h.number === i);
        if (!hole) {
          alert(`Tee "${tee.name}" is missing hole ${i}`);
          return;
        }
        if (hole.par < 3 || hole.par > 5) {
          alert(`Hole ${i} on tee "${tee.name}" has invalid par (must be 3, 4, or 5)`);
          return;
        }
        if (hole.yardage < 50 || hole.yardage > 800) {
          alert(`Hole ${i} on tee "${tee.name}" has invalid yardage (must be 50-800)`);
          return;
        }
      }
    }
    
    onComplete();
  };

  const currentHole = getHole(selectedHoleNumber);

  return (
    <div className="wizard-step">
      <h3>Hole Configuration</h3>
      <p>Configure the hole details for each tee option.</p>
      
      <div className="hole-config-layout">
        <div className="hole-config-controls">
          <div className="tee-selector">
            <label htmlFor="teeSelect">Editing Tee:</label>
            <select
              id="teeSelect"
              value={selectedTeeIndex}
              onChange={(e) => setSelectedTeeIndex(parseInt(e.target.value))}
            >
              {teeOptions.map((tee, index) => (
                <option key={tee.id} value={index}>
                  {tee.name} ({tee.color})
                </option>
              ))}
            </select>
          </div>
          
          <button type="button" className="fill-defaults-button" onClick={fillWithDefaults}>
            Fill with Standard Layout
          </button>
        </div>
        
        <div className="hole-grid">
          {Array.from({ length: 18 }, (_, i) => {
            const holeNumber = i + 1;
            const hole = getHole(holeNumber);
            const isComplete = hole && hole.par && hole.yardage && hole.strokeIndex;
            
            return (
              <div
                key={holeNumber}
                className={`hole-grid-item ${selectedHoleNumber === holeNumber ? 'selected' : ''} ${isComplete ? 'complete' : 'incomplete'}`}
                onClick={() => setSelectedHoleNumber(holeNumber)}
              >
                <div className="hole-number">{holeNumber}</div>
                {hole && (
                  <div className="hole-summary">
                    Par {hole.par}<br />
                    {hole.yardage}y
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="hole-editor">
          <h4>Hole {selectedHoleNumber}</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="holePar">Par</label>
              <select
                id="holePar"
                value={currentHole?.par || 4}
                onChange={(e) => updateHole(selectedHoleNumber, { par: parseInt(e.target.value) })}
              >
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="holeYardage">Yardage</label>
              <input
                type="number"
                id="holeYardage"
                min="50"
                max="800"
                value={currentHole?.yardage || ''}
                onChange={(e) => updateHole(selectedHoleNumber, { yardage: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 400"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="holeStrokeIndex">Stroke Index</label>
              <input
                type="number"
                id="holeStrokeIndex"
                min="1"
                max="18"
                value={currentHole?.strokeIndex || selectedHoleNumber}
                onChange={(e) => updateHole(selectedHoleNumber, { strokeIndex: parseInt(e.target.value) || selectedHoleNumber })}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="wizard-actions">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="complete-button" onClick={validateAndComplete}>
          Create Course
        </button>
      </div>
    </div>
  );
};

// Main Wizard Component
export const CourseCreationWizard: React.FC<CourseCreationWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [course, setCourse] = useState<Partial<Course>>({
    id: crypto.randomUUID(),
    name: '',
    location: '',
    teeOptions: [],
    dateAdded: new Date()
  });

  const updateCourse = (updates: Partial<Course>) => {
    setCourse(prev => ({ ...prev, ...updates }));
  };

  const handleTemplateSelection = (template: 'standard' | 'executive' | 'custom') => {
    let templateData: Partial<Course> = {};
    
    if (template === 'standard') {
      const standardTemplate = COURSE_TEMPLATES.par72Standard;
      templateData = {
        name: standardTemplate.name,
        location: standardTemplate.location,
        teeOptions: standardTemplate.tees.map(tee => ({
          id: crypto.randomUUID(),
          name: tee.name,
          color: tee.color,
          gender: tee.gender,
          rating: tee.rating,
          slope: tee.slope,
          holes: tee.holes.map(hole => ({ ...hole }))
        }))
      };
    } else if (template === 'executive') {
      const executiveTemplate = COURSE_TEMPLATES.par71Executive;
      templateData = {
        name: executiveTemplate.name,
        location: executiveTemplate.location,
        teeOptions: executiveTemplate.tees.map(tee => ({
          id: crypto.randomUUID(),
          name: tee.name,
          color: tee.color,
          gender: tee.gender,
          rating: tee.rating,
          slope: tee.slope,
          holes: tee.holes.map(hole => ({ ...hole }))
        }))
      };
    }
    // For 'custom', we start with empty teeOptions
    
    updateCourse(templateData);
    setCurrentStep(2);
  };

  const handleComplete = async () => {
    try {
      // Final validation
      const completeCourse: Course = {
        id: course.id!,
        name: course.name!,
        location: course.location!,
        teeOptions: course.teeOptions!,
        dateAdded: course.dateAdded!
      };

      const validation = validateCourse(completeCourse);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(e => e.message).join('\n');
        alert(`Course validation failed:\n${errorMessages}`);
        return;
      }

      await onComplete(completeCourse);
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course. Please try again.');
    }
  };

  return (
    <div className="course-creation-wizard">
      <div className="wizard-header">
        <h2>Create New Course</h2>
        <div className="step-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            1. Template
          </div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            2. Course Info
          </div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
            3. Tee Options
          </div>
          <div className={`step ${currentStep >= 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}>
            4. Hole Details
          </div>
        </div>
      </div>

      <div className="wizard-content">
        {currentStep === 1 && (
          <TemplateStep
            onNext={handleTemplateSelection}
            onCancel={onCancel}
          />
        )}
        
        {currentStep === 2 && (
          <BasicInfoStep
            course={course}
            onChange={updateCourse}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
            onCancel={onCancel}
          />
        )}
        
        {currentStep === 3 && (
          <TeeConfigStep
            course={course}
            onChange={updateCourse}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
            onCancel={onCancel}
          />
        )}
        
        {currentStep === 4 && (
          <HoleConfigStep
            course={course}
            onChange={updateCourse}
            onComplete={handleComplete}
            onBack={() => setCurrentStep(3)}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
}; 
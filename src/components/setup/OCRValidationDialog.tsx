import React, { useState, useEffect } from 'react';
import type { OCRResult, ScorecardData, ScorecardHole, ScorecardTee } from '../../types/ocr';
import { scorecardParser } from '../../utils/scorecardParser';
import { validateCourse } from '../../db/courseValidation';
import type { Course, TeeOption, HoleInfo } from '../../db/courseModel';
import './OCRValidationDialog.css';

interface OCRValidationDialogProps {
  isOpen: boolean;
  ocrResult: OCRResult | null;
  onClose: () => void;
  onImport: (course: Course) => void;
}

interface ValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const OCRValidationDialog: React.FC<OCRValidationDialogProps> = ({
  isOpen,
  ocrResult,
  onClose,
  onImport
}) => {
  const [scorecardData, setScorecardData] = useState<ScorecardData | null>(null);
  const [validation, setValidation] = useState<ValidationState>({ isValid: false, errors: [], warnings: [] });
  const [activeTab, setActiveTab] = useState<'course' | 'holes' | 'tees' | 'raw'>('course');
  const [editedData, setEditedData] = useState<ScorecardData | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Initialize data when dialog opens
  useEffect(() => {
    if (isOpen && ocrResult?.extractedData) {
      setScorecardData(ocrResult.extractedData);
      setEditedData({ ...ocrResult.extractedData });
      validateData(ocrResult.extractedData);
    }
  }, [isOpen, ocrResult]);

  const validateData = (data: ScorecardData) => {
    const ocrValidation = scorecardParser.validateScorecardData(data);
    setValidation(ocrValidation);
  };

  const handleFieldChange = (section: 'course' | 'holes' | 'tees', field: string, value: any, index?: number) => {
    if (!editedData) return;

    const updatedData = { ...editedData };

    if (section === 'course') {
      (updatedData as any)[field] = value;
    } else if (section === 'holes' && typeof index === 'number') {
      if (!updatedData.holes) updatedData.holes = [];
      if (!updatedData.holes[index]) {
        updatedData.holes[index] = { number: index + 1, confidence: 0.5 };
      }
      (updatedData.holes[index] as any)[field] = value;
    } else if (section === 'tees' && typeof index === 'number') {
      if (!updatedData.tees) updatedData.tees = [];
      if (!updatedData.tees[index]) {
        updatedData.tees[index] = { confidence: 0.5 };
      }
      (updatedData.tees[index] as any)[field] = value;
    }

    setEditedData(updatedData);
    validateData(updatedData);
  };

  const addHole = () => {
    if (!editedData) return;
    const holes = editedData.holes || [];
    const newHole: ScorecardHole = {
      number: holes.length + 1,
      par: 4,
      confidence: 1.0
    };
    setEditedData({
      ...editedData,
      holes: [...holes, newHole]
    });
  };

  const removeHole = (index: number) => {
    if (!editedData?.holes) return;
    const updatedHoles = editedData.holes.filter((_, i) => i !== index);
    // Renumber holes
    updatedHoles.forEach((hole, i) => {
      hole.number = i + 1;
    });
    setEditedData({
      ...editedData,
      holes: updatedHoles
    });
  };

  const addTee = () => {
    if (!editedData) return;
    const tees = editedData.tees || [];
    const newTee: ScorecardTee = {
      name: `Tee ${tees.length + 1}`,
      confidence: 1.0
    };
    setEditedData({
      ...editedData,
      tees: [...tees, newTee]
    });
  };

  const removeTee = (index: number) => {
    if (!editedData?.tees) return;
    const updatedTees = editedData.tees.filter((_, i) => i !== index);
    setEditedData({
      ...editedData,
      tees: updatedTees
    });
  };

  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.5) return 'confidence-medium';
    return 'confidence-low';
  };

  const convertToCourse = (): Course => {
    if (!editedData) throw new Error('No data to convert');

    const course: Course = {
      id: `course_${Date.now()}`,
      name: editedData.courseName || 'Imported Course',
      location: editedData.courseLocation || '',
      teeOptions: []
    };

    // Convert tees
    if (editedData.tees && editedData.tees.length > 0) {
      course.teeOptions = editedData.tees.map((tee, index) => {
        const holes: HoleInfo[] = [];
        
        // Create holes from scorecard data
        if (editedData.holes) {
          for (let i = 0; i < 18; i++) {
            const holeData = editedData.holes.find(h => h.number === i + 1);
            holes.push({
              number: i + 1,
              par: holeData?.par || 4,
              yardage: holeData?.yardage || 350,
              strokeIndex: holeData?.handicap || i + 1
            });
          }
        } else {
          // Create default 18 holes
          for (let i = 0; i < 18; i++) {
            holes.push({
              number: i + 1,
              par: 4,
              yardage: 350,
              strokeIndex: i + 1
            });
          }
        }

        const teeOption: TeeOption = {
          id: `tee_${index}`,
          name: tee.name || tee.color || `Tee ${index + 1}`,
          color: tee.color || 'white',
          gender: 'Any',
          rating: tee.rating || 72.0,
          slope: tee.slope || 113,
          holes: holes
        };

        return teeOption;
      });
    } else {
      // Create default tee with holes from scorecard
      const holes: HoleInfo[] = [];
      
      if (editedData.holes) {
        for (let i = 0; i < 18; i++) {
          const holeData = editedData.holes.find(h => h.number === i + 1);
          holes.push({
            number: i + 1,
            par: holeData?.par || 4,
            yardage: holeData?.yardage || 350,
            strokeIndex: holeData?.handicap || i + 1
          });
        }
      } else {
        // Create default 18 holes
        for (let i = 0; i < 18; i++) {
          holes.push({
            number: i + 1,
            par: 4,
            yardage: 350,
            strokeIndex: i + 1
          });
        }
      }

      course.teeOptions.push({
        id: 'default_tee',
        name: 'Default',
        color: 'white',
        gender: 'Any',
        rating: 72.0,
        slope: 113,
        holes: holes
      });
    }

    return course;
  };

  const handleImport = () => {
    try {
      const course = convertToCourse();
      const courseValidationResult = validateCourse(course);
      
      if (!courseValidationResult.isValid) {
        alert(`Cannot import course:\n${courseValidationResult.errors.join('\n')}`);
        return;
      }

      onImport(course);
      onClose();
    } catch (error) {
      console.error('Error converting to course:', error);
      alert('Failed to convert scorecard data to course format.');
    }
  };

  const handleClose = () => {
    setScorecardData(null);
    setEditedData(null);
    setValidation({ isValid: false, errors: [], warnings: [] });
    setActiveTab('course');
    setPreviewMode(false);
    onClose();
  };

  if (!isOpen || !ocrResult || !editedData) return null;

  return (
    <div className="ocr-validation-overlay">
      <div className="ocr-validation-dialog">
        <div className="ocr-validation-header">
          <h2>Review & Correct Scorecard Data</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="ocr-validation-content">
          {/* Confidence Summary */}
          <div className="confidence-summary">
            <div className="confidence-indicator">
              <span className={`confidence-badge ${getConfidenceClass(editedData.confidence || 0)}`}>
                Overall Confidence: {Math.round((editedData.confidence || 0) * 100)}%
              </span>
            </div>
            
            {/* Validation Status */}
            <div className="validation-status">
              {validation.isValid ? (
                <span className="status-valid">✅ Ready to Import</span>
              ) : (
                <span className="status-invalid">❌ Needs Correction</span>
              )}
            </div>
          </div>

          {/* Error and Warning Messages */}
          {validation.errors.length > 0 && (
            <div className="validation-messages errors">
              <h4>❌ Errors (must be fixed):</h4>
              <ul>
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="validation-messages warnings">
              <h4>⚠️ Warnings (review recommended):</h4>
              <ul>
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'course' ? 'active' : ''}`}
              onClick={() => setActiveTab('course')}
            >
              Course Info
            </button>
            <button
              className={`tab-button ${activeTab === 'holes' ? 'active' : ''}`}
              onClick={() => setActiveTab('holes')}
            >
              Holes ({editedData.holes?.length || 0})
            </button>
            <button
              className={`tab-button ${activeTab === 'tees' ? 'active' : ''}`}
              onClick={() => setActiveTab('tees')}
            >
              Tees ({editedData.tees?.length || 0})
            </button>
            <button
              className={`tab-button ${activeTab === 'raw' ? 'active' : ''}`}
              onClick={() => setActiveTab('raw')}
            >
              Raw OCR
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'course' && (
              <div className="course-info-section">
                <h3>Course Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="courseName">Course Name *</label>
                    <input
                      id="courseName"
                      type="text"
                      value={editedData.courseName || ''}
                      onChange={(e) => handleFieldChange('course', 'courseName', e.target.value)}
                      className={!editedData.courseName ? 'field-error' : ''}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="courseLocation">Location</label>
                    <input
                      id="courseLocation"
                      type="text"
                      value={editedData.courseLocation || ''}
                      onChange={(e) => handleFieldChange('course', 'courseLocation', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="date">Date</label>
                    <input
                      id="date"
                      type="text"
                      value={editedData.date || ''}
                      onChange={(e) => handleFieldChange('course', 'date', e.target.value)}
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="playerName">Player Name</label>
                    <input
                      id="playerName"
                      type="text"
                      value={editedData.playerName || ''}
                      onChange={(e) => handleFieldChange('course', 'playerName', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'holes' && (
              <div className="holes-section">
                <div className="section-header">
                  <h3>Hole Information</h3>
                  <button className="add-button" onClick={addHole}>+ Add Hole</button>
                </div>
                
                {editedData.holes && editedData.holes.length > 0 ? (
                  <div className="holes-grid">
                    {editedData.holes.map((hole, index) => (
                      <div key={index} className={`hole-card ${getConfidenceClass(hole.confidence)}`}>
                        <div className="hole-header">
                          <h4>Hole {hole.number}</h4>
                          <button 
                            className="remove-button"
                            onClick={() => removeHole(index)}
                            title="Remove hole"
                          >
                            ×
                          </button>
                        </div>
                        
                        <div className="hole-fields">
                          <div className="field-group">
                            <label>Par</label>
                            <input
                              type="number"
                              min="3"
                              max="5"
                              value={hole.par || ''}
                              onChange={(e) => handleFieldChange('holes', 'par', parseInt(e.target.value) || undefined, index)}
                            />
                          </div>
                          
                          <div className="field-group">
                            <label>Yardage</label>
                            <input
                              type="number"
                              min="50"
                              max="700"
                              value={hole.yardage || ''}
                              onChange={(e) => handleFieldChange('holes', 'yardage', parseInt(e.target.value) || undefined, index)}
                            />
                          </div>
                          
                          <div className="field-group">
                            <label>Handicap</label>
                            <input
                              type="number"
                              min="1"
                              max="18"
                              value={hole.handicap || ''}
                              onChange={(e) => handleFieldChange('holes', 'handicap', parseInt(e.target.value) || undefined, index)}
                            />
                          </div>
                        </div>
                        
                        <div className="confidence-indicator">
                          Confidence: {Math.round(hole.confidence * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No hole data extracted. Add holes manually.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tees' && (
              <div className="tees-section">
                <div className="section-header">
                  <h3>Tee Information</h3>
                  <button className="add-button" onClick={addTee}>+ Add Tee</button>
                </div>
                
                {editedData.tees && editedData.tees.length > 0 ? (
                  <div className="tees-list">
                    {editedData.tees.map((tee, index) => (
                      <div key={index} className={`tee-card ${getConfidenceClass(tee.confidence)}`}>
                        <div className="tee-header">
                          <h4>Tee {index + 1}</h4>
                          <button 
                            className="remove-button"
                            onClick={() => removeTee(index)}
                            title="Remove tee"
                          >
                            ×
                          </button>
                        </div>
                        
                        <div className="tee-fields">
                          <div className="field-group">
                            <label>Name</label>
                            <input
                              type="text"
                              value={tee.name || ''}
                              onChange={(e) => handleFieldChange('tees', 'name', e.target.value, index)}
                            />
                          </div>
                          
                          <div className="field-group">
                            <label>Color</label>
                            <select
                              value={tee.color || ''}
                              onChange={(e) => handleFieldChange('tees', 'color', e.target.value, index)}
                            >
                              <option value="">Select Color</option>
                              <option value="black">Black</option>
                              <option value="gold">Gold</option>
                              <option value="blue">Blue</option>
                              <option value="white">White</option>
                              <option value="red">Red</option>
                              <option value="green">Green</option>
                            </select>
                          </div>
                          
                          <div className="field-group">
                            <label>Rating</label>
                            <input
                              type="number"
                              min="60"
                              max="80"
                              step="0.1"
                              value={tee.rating || ''}
                              onChange={(e) => handleFieldChange('tees', 'rating', parseFloat(e.target.value) || undefined, index)}
                            />
                          </div>
                          
                          <div className="field-group">
                            <label>Slope</label>
                            <input
                              type="number"
                              min="55"
                              max="155"
                              value={tee.slope || ''}
                              onChange={(e) => handleFieldChange('tees', 'slope', parseInt(e.target.value) || undefined, index)}
                            />
                          </div>
                          
                          <div className="field-group">
                            <label>Yardage</label>
                            <input
                              type="number"
                              min="3000"
                              max="8000"
                              value={tee.yardage || ''}
                              onChange={(e) => handleFieldChange('tees', 'yardage', parseInt(e.target.value) || undefined, index)}
                            />
                          </div>
                        </div>
                        
                        <div className="confidence-indicator">
                          Confidence: {Math.round(tee.confidence * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No tee data extracted. Add tees manually.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="raw-ocr-section">
                <h3>Raw OCR Data</h3>
                <div className="raw-data-container">
                  <div className="ocr-stats">
                    <p><strong>OCR Confidence:</strong> {Math.round(ocrResult.confidence)}%</p>
                    <p><strong>Text Length:</strong> {ocrResult.rawText.length} characters</p>
                    <p><strong>Words Detected:</strong> {ocrResult.words?.length || 0}</p>
                  </div>
                  
                  <div className="raw-text">
                    <h4>Extracted Text:</h4>
                    <pre className="ocr-text">{ocrResult.rawText}</pre>
                  </div>
                  
                  {ocrResult.words && ocrResult.words.length > 0 && (
                    <div className="word-analysis">
                      <h4>Word Analysis:</h4>
                      <div className="words-list">
                        {ocrResult.words.map((word, index) => (
                          <span
                            key={index}
                            className={`word-item ${getConfidenceClass(word.confidence)}`}
                            title={`Confidence: ${Math.round(word.confidence * 100)}%`}
                          >
                            {word.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview Mode Toggle */}
          <div className="preview-controls">
            <label className="preview-toggle">
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => setPreviewMode(e.target.checked)}
              />
              Preview mode (read-only)
            </label>
          </div>

          {/* Action Buttons */}
          <div className="dialog-actions">
            <button className="action-button cancel" onClick={handleClose}>
              Cancel
            </button>
            
            <button 
              className="action-button import"
              onClick={handleImport}
              disabled={!validation.isValid}
            >
              Import Course
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 
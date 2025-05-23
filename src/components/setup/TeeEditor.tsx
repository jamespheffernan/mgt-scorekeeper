import React, { useState } from 'react';
import { TeeOption } from '../../db/courseModel';

interface TeeEditorProps {
  tee: TeeOption;
  onSave: (updatedTee: TeeOption) => void;
  onCancel: () => void;
}

export const TeeEditor: React.FC<TeeEditorProps> = ({ tee, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: tee.name,
    color: tee.color,
    gender: tee.gender,
    rating: tee.rating.toString(),
    slope: tee.slope.toString()
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const teeColors = [
    'Black', 'Blue', 'White', 'Yellow', 'Red', 'Green', 'Gold', 'Silver', 'Purple'
  ];

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Tee name is required';
    }
    
    const rating = parseFloat(formData.rating);
    if (isNaN(rating) || rating <= 0 || rating > 80) {
      newErrors.rating = 'Rating must be a number between 0 and 80';
    }
    
    const slope = parseInt(formData.slope);
    if (isNaN(slope) || slope < 55 || slope > 155) {
      newErrors.slope = 'Slope must be a number between 55 and 155';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }
    
    const updatedTee: TeeOption = {
      ...tee,
      name: formData.name.trim(),
      color: formData.color,
      gender: formData.gender as 'M' | 'F' | 'Any',
      rating: parseFloat(formData.rating),
      slope: parseInt(formData.slope)
    };
    
    onSave(updatedTee);
  };

  return (
    <div className="tee-editor">
      <h2>Edit Tee Information</h2>
      
      <div className="form-group">
        <label htmlFor="teeName">Tee Name *</label>
        <input
          type="text"
          id="teeName"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Championship, Men's, Ladies'"
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-message">{errors.name}</span>}
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="teeColor">Tee Color</label>
          <select
            id="teeColor"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
          >
            {teeColors.map(color => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="teeGender">Gender</label>
          <select
            id="teeGender"
            value={formData.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
          >
            <option value="Any">Any</option>
            <option value="M">Men</option>
            <option value="F">Women</option>
          </select>
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="teeRating">Course Rating *</label>
          <input
            type="number"
            id="teeRating"
            step="0.1"
            min="50"
            max="80"
            value={formData.rating}
            onChange={(e) => handleChange('rating', e.target.value)}
            placeholder="e.g., 72.0"
            className={errors.rating ? 'error' : ''}
          />
          {errors.rating && <span className="error-message">{errors.rating}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="teeSlope">Slope Rating *</label>
          <input
            type="number"
            id="teeSlope"
            min="55"
            max="155"
            value={formData.slope}
            onChange={(e) => handleChange('slope', e.target.value)}
            placeholder="e.g., 113"
            className={errors.slope ? 'error' : ''}
          />
          {errors.slope && <span className="error-message">{errors.slope}</span>}
        </div>
      </div>
      
      <div className="rating-explanation">
        <h4>About Course and Slope Ratings</h4>
        <p><strong>Course Rating:</strong> The expected score for a scratch golfer (0 handicap) playing from these tees.</p>
        <p><strong>Slope Rating:</strong> A measure of the relative difficulty for players who are not scratch golfers (55-155, where 113 is average).</p>
      </div>
      
      <div className="form-actions">
        <button type="button" className="save-button" onClick={handleSave}>
          Save Changes
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}; 
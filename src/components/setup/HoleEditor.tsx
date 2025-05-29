import React, { useState } from 'react';
import { TeeOption, HoleInfo } from '../../db/courseModel';

interface HoleEditorProps {
  tee: TeeOption;
  onSave: (updatedTee: TeeOption) => void;
  onCancel: () => void;
}

export const HoleEditor: React.FC<HoleEditorProps> = ({ tee, onSave, onCancel }) => {
  // Create a deep copy of the holes for editing
  const [holes, setHoles] = useState<HoleInfo[]>(
    tee.holes.map(hole => ({ ...hole }))
  );
  
  // Handle changes to hole data
  const handleHoleChange = (index: number, field: keyof HoleInfo, value: string | number) => {
    const newHoles = [...holes];
    
    // Convert string values to numbers for numeric fields
    if (field === 'par' || field === 'yardage' || field === 'strokeIndex') {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        switch (field) {
          case 'par':
            newHoles[index].par = numValue;
            break;
          case 'yardage':
            newHoles[index].yardage = numValue;
            break;
          case 'strokeIndex':
            newHoles[index].strokeIndex = numValue;
            break;
        }
      }
    } else if (typeof value === 'string') {
      (newHoles[index] as any)[field] = value;
    }
    
    setHoles(newHoles);
  };
  
  // Validate holes before saving
  const validateHoles = (): string | null => {
    // Check for duplicate stroke indexes
    const strokeIndexes = holes.map(h => h.strokeIndex);
    const uniqueStrokeIndexes = new Set(strokeIndexes);
    
    if (uniqueStrokeIndexes.size !== holes.length) {
      return 'Each hole must have a unique stroke index (1-18)';
    }
    
    // Check for valid par values
    const invalidPar = holes.find(h => h.par < 3 || h.par > 5);
    if (invalidPar) {
      return `Hole ${invalidPar.number} has an invalid par value. Par should be between 3 and 5.`;
    }
    
    // Check for valid yardage
    const invalidYardage = holes.find(h => h.yardage < 100 || h.yardage > 700);
    if (invalidYardage) {
      return `Hole ${invalidYardage.number} has an unlikely yardage (${invalidYardage.yardage}). Please verify.`;
    }
    
    return null;
  };
  
  // Save changes
  const handleSave = () => {
    const validationError = validateHoles();
    if (validationError) {
      alert(validationError);
      return;
    }
    
    // Create updated tee with new hole data
    const updatedTee: TeeOption = {
      ...tee,
      holes: [...holes]
    };
    
    onSave(updatedTee);
  };
  
  // Bulk operations
  const bulkSetPar = (par: number, holeRange: string) => {
    if (!confirm(`Set par ${par} for ${holeRange}?`)) return;
    
    const newHoles = [...holes];
    newHoles.forEach((hole, index) => {
      if (holeRange === 'all' || 
          (holeRange === 'front9' && hole.number <= 9) ||
          (holeRange === 'back9' && hole.number > 9)) {
        newHoles[index].par = par;
      }
    });
    setHoles(newHoles);
  };

  const bulkSetYardage = (yardage: number, holeRange: string) => {
    if (!confirm(`Set ${yardage} yards for ${holeRange}?`)) return;
    
    const newHoles = [...holes];
    newHoles.forEach((hole, index) => {
      if (holeRange === 'all' || 
          (holeRange === 'front9' && hole.number <= 9) ||
          (holeRange === 'back9' && hole.number > 9)) {
        newHoles[index].yardage = yardage;
      }
    });
    setHoles(newHoles);
  };

  const autoAssignStrokeIndex = () => {
    if (!confirm('Auto-assign stroke indexes based on difficulty (longest par 4s and all par 5s get lower indexes)?')) return;
    
    const newHoles = [...holes];
    
    // Sort holes by difficulty (par 5s first, then par 4s by yardage, then par 3s)
    const sortedIndexes = newHoles
      .map((hole, index) => ({ hole, index }))
      .sort((a, b) => {
        if (a.hole.par !== b.hole.par) {
          if (a.hole.par === 5) return -1;
          if (b.hole.par === 5) return 1;
          if (a.hole.par === 4 && b.hole.par === 3) return -1;
          if (a.hole.par === 3 && b.hole.par === 4) return 1;
        }
        return b.hole.yardage - a.hole.yardage; // Longer holes get lower stroke index
      });
    
    sortedIndexes.forEach((item, rank) => {
      newHoles[item.index].strokeIndex = rank + 1;
    });
    
    setHoles(newHoles);
  };

  return (
    <div className="hole-editor">
      <h2>Edit Holes - {tee.name} ({tee.color})</h2>
      
      <div className="bulk-operations">
        <h3>Bulk Operations</h3>
        <div className="bulk-controls">
          <div className="bulk-group">
            <label>Set Par:</label>
            <button onClick={() => bulkSetPar(3, 'all')} className="bulk-button">All Par 3</button>
            <button onClick={() => bulkSetPar(4, 'all')} className="bulk-button">All Par 4</button>
            <button onClick={() => bulkSetPar(5, 'all')} className="bulk-button">All Par 5</button>
          </div>
          <div className="bulk-group">
            <label>Set Yardage:</label>
            <button onClick={() => bulkSetYardage(150, 'front9')} className="bulk-button">Front 9: 150</button>
            <button onClick={() => bulkSetYardage(400, 'all')} className="bulk-button">All: 400</button>
            <button onClick={() => bulkSetYardage(500, 'back9')} className="bulk-button">Back 9: 500</button>
          </div>
          <div className="bulk-group">
            <label>Stroke Index:</label>
            <button onClick={autoAssignStrokeIndex} className="bulk-button">Auto-Assign by Difficulty</button>
          </div>
        </div>
      </div>
      
      <div className="hole-editor-table">
        <table>
          <thead>
            <tr>
              <th>Hole</th>
              <th>Par</th>
              <th>Yardage</th>
              <th>Stroke Index</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((hole, index) => (
              <tr key={hole.number}>
                <td>{hole.number}</td>
                <td>
                  <select
                    value={hole.par}
                    onChange={(e) => handleHoleChange(index, 'par', e.target.value)}
                  >
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={hole.yardage}
                    onChange={(e) => handleHoleChange(index, 'yardage', e.target.value)}
                    min={100}
                    max={700}
                  />
                </td>
                <td>
                  <select
                    value={hole.strokeIndex}
                    onChange={(e) => handleHoleChange(index, 'strokeIndex', e.target.value)}
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(si => (
                      <option key={si} value={si}>
                        {si}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="stroke-index-explanation">
        <h3>About Stroke Index</h3>
        <p>The stroke index (1-18) indicates the order in which handicap strokes are allocated. 
           The most difficult hole is assigned index 1, the second most difficult hole is index 2, and so on.</p>
        <p>Each hole must have a unique stroke index.</p>
      </div>
      
      <div className="hole-editor-actions">
        <button onClick={handleSave} className="save-button">Save Changes</button>
        <button onClick={onCancel} className="cancel-button">Cancel</button>
      </div>
    </div>
  );
}; 
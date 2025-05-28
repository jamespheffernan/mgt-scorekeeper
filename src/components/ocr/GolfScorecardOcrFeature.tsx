import React, { useState } from 'react';
import { Upload, Image, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';

// TypeScript interfaces for OCR results
interface OcrHole {
  hole_number: number;
  par?: number;
  stroke_index?: number;
  yardage?: number;
}

interface OcrPlayer {
  name: string;
  handicap?: number;
  scores?: number[];
}

interface OcrScorecardData {
  course_name?: string;
  played_on_date?: string;
  holes?: OcrHole[];
  players?: OcrPlayer[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: OcrScorecardData;
}

interface ParsedScorecardData {
  courseName: string | null;
  playedDate: string | null;
  holes: OcrHole[];
  players: OcrPlayer[];
  summary: {
    holesCount: number;
    playersCount: number;
    hasCompleteHoleData: boolean;
    hasPlayerScores: boolean;
  };
}

interface GolfScorecardOcrFeatureProps {
  className?: string;
}

export const GolfScorecardOcrFeature: React.FC<GolfScorecardOcrFeatureProps> = ({ 
  className = '' 
}) => {
  // State variables
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [rawOcrData, setRawOcrData] = useState<any>(null);
  const [parsedData, setParsedData] = useState<ParsedScorecardData | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // File size validation (10MB limit)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  // Validation function for OCR results
  const validateOcrData = (data: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if data exists and is an object
    if (!data || typeof data !== 'object') {
      errors.push('Invalid response format: Expected JSON object');
      return { isValid: false, errors, warnings };
    }

    // Handle Gemini API response structure
    let actualData = data;
    if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts)) {
        try {
          const textContent = candidate.content.parts[0]?.text;
          if (textContent) {
            actualData = JSON.parse(textContent);
          }
        } catch (parseError) {
          errors.push('Failed to parse response content as JSON');
          return { isValid: false, errors, warnings };
        }
      } else {
        errors.push('Invalid API response structure: No content found');
        return { isValid: false, errors, warnings };
      }
    }

    // Validate holes array
    if (actualData.holes && Array.isArray(actualData.holes)) {
      if (actualData.holes.length === 0) {
        warnings.push('No holes found in the scorecard');
      } else if (actualData.holes.length !== 18) {
        warnings.push(`Expected 18 holes, found ${actualData.holes.length}`);
      }

      // Validate each hole
      actualData.holes.forEach((hole: any, index: number) => {
        if (typeof hole.hole_number !== 'number') {
          errors.push(`Hole ${index + 1}: Missing or invalid hole number`);
        } else if (hole.hole_number < 1 || hole.hole_number > 18) {
          errors.push(`Hole ${index + 1}: Invalid hole number ${hole.hole_number} (must be 1-18)`);
        }

        if (hole.par !== undefined && (typeof hole.par !== 'number' || hole.par < 3 || hole.par > 5)) {
          warnings.push(`Hole ${hole.hole_number}: Unusual par value ${hole.par} (expected 3-5)`);
        }

        if (hole.stroke_index !== undefined && (typeof hole.stroke_index !== 'number' || hole.stroke_index < 1 || hole.stroke_index > 18)) {
          warnings.push(`Hole ${hole.hole_number}: Invalid stroke index ${hole.stroke_index} (expected 1-18)`);
        }
      });
    } else {
      warnings.push('No holes data found or holes is not an array');
    }

    // Validate players array
    if (actualData.players && Array.isArray(actualData.players)) {
      if (actualData.players.length === 0) {
        warnings.push('No players found in the scorecard');
      }

      actualData.players.forEach((player: any, index: number) => {
        if (!player.name || typeof player.name !== 'string') {
          warnings.push(`Player ${index + 1}: Missing or invalid name`);
        }

        if (player.handicap !== undefined && (typeof player.handicap !== 'number' || player.handicap < 0 || player.handicap > 54)) {
          warnings.push(`Player ${player.name || index + 1}: Unusual handicap ${player.handicap} (expected 0-54)`);
        }

        if (player.scores && Array.isArray(player.scores)) {
          if (player.scores.length > 18) {
            warnings.push(`Player ${player.name || index + 1}: Too many scores (${player.scores.length}), expected max 18`);
          }
          
          player.scores.forEach((score: any, scoreIndex: number) => {
            if (typeof score !== 'number' || score < 1 || score > 15) {
              warnings.push(`Player ${player.name || index + 1}: Unusual score ${score} on hole ${scoreIndex + 1}`);
            }
          });
        }
      });
    }

    // Validate course name
    if (actualData.course_name && typeof actualData.course_name !== 'string') {
      warnings.push('Course name is not a string');
    }

    // Validate date format
    if (actualData.played_on_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(actualData.played_on_date)) {
        warnings.push('Date format is not YYYY-MM-DD');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: actualData
    };
  };

  // Parse and normalize OCR data
  const parseOcrData = (validatedData: OcrScorecardData): ParsedScorecardData => {
    const holes = validatedData.holes || [];
    const players = validatedData.players || [];

    // Sort holes by hole number
    const sortedHoles = [...holes].sort((a, b) => a.hole_number - b.hole_number);

    // Calculate summary statistics
    const holesWithPar = sortedHoles.filter(h => h.par !== undefined);
    const holesWithSI = sortedHoles.filter(h => h.stroke_index !== undefined);
    const playersWithScores = players.filter(p => p.scores && p.scores.length > 0);

    return {
      courseName: validatedData.course_name || null,
      playedDate: validatedData.played_on_date || null,
      holes: sortedHoles,
      players,
      summary: {
        holesCount: sortedHoles.length,
        playersCount: players.length,
        hasCompleteHoleData: holesWithPar.length === sortedHoles.length && holesWithSI.length === sortedHoles.length,
        hasPlayerScores: playersWithScores.length > 0
      }
    };
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous messages and data
    setErrorMessage('');
    setSuccessMessage('');
    setRawOcrData(null);
    setParsedData(null);
    setValidationResult(null);

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMessage('Please select a valid image file (PNG, JPEG, WebP, or GIF).');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File size must be less than 10MB.');
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        // Remove data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        setImageBase64(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle OCR processing
  const handleProcessScorecard = async () => {
    if (!selectedFile || !imageBase64) {
      setErrorMessage('Please select an image first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setRawOcrData(null);
    setParsedData(null);
    setValidationResult(null);

    try {
      // Enhanced prompt for golf scorecard recognition
      const enhancedPrompt = `
You are analyzing a golf scorecard image. Please extract all relevant information and return it as structured JSON data.

IMPORTANT INSTRUCTIONS:
1. Look for the golf course name at the top of the scorecard
2. Find the date the round was played (if visible)
3. Identify all 18 holes with their details:
   - Hole number (1-18)
   - Par value for each hole
   - Stroke Index (handicap ranking, usually 1-18)
   - Yardage (if visible)
4. Look for player names and their scores if filled in
5. Pay attention to front 9 (holes 1-9) and back 9 (holes 10-18) sections
6. Look for totals, handicaps, and net scores if present

EXPECTED JSON STRUCTURE:
{
  "course_name": "Name of the golf course",
  "played_on_date": "YYYY-MM-DD format if date is visible",
  "holes": [
    {
      "hole_number": 1,
      "par": 4,
      "stroke_index": 5,
      "yardage": 350
    }
    // ... for all 18 holes
  ],
  "players": [
    {
      "name": "Player Name",
      "handicap": 12,
      "scores": [4, 3, 5, ...] // scores for each hole if filled in
    }
  ]
}

Please be as accurate as possible and only include information that is clearly visible in the image. If something is not visible or unclear, omit that field rather than guessing.
      `.trim();

      const response = await fetch('http://localhost:3001/api/process-scorecard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          imageBase64,
          mimeType: selectedFile.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      setRawOcrData(rawData);

      // Validate the OCR data
      const validation = validateOcrData(rawData);
      setValidationResult(validation);

      if (!validation.isValid) {
        setErrorMessage(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      // Parse and normalize the data
      if (validation.data) {
        const parsed = parseOcrData(validation.data);
        setParsedData(parsed);
        
        // Create success message with summary
        const { summary } = parsed;
        let message = 'Scorecard processed successfully!';
        if (summary.holesCount > 0) {
          message += ` Found ${summary.holesCount} holes`;
        }
        if (summary.playersCount > 0) {
          message += `, ${summary.playersCount} players`;
        }
        if (validation.warnings.length > 0) {
          message += ` (${validation.warnings.length} warnings)`;
        }
        
        setSuccessMessage(message);
      } else {
        setErrorMessage('No valid data found in OCR response');
      }

    } catch (error) {
      console.error('Error processing scorecard:', error);
      setErrorMessage(
        error instanceof Error 
          ? `Failed to process scorecard: ${error.message}` 
          : 'An unexpected error occurred while processing the scorecard.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Clear selection and reset state
  const handleClearSelection = () => {
    setSelectedFile(null);
    setImageBase64('');
    setPreviewUrl('');
    setErrorMessage('');
    setSuccessMessage('');
    setRawOcrData(null);
    setParsedData(null);
    setValidationResult(null);
    
    // Clear file input
    const fileInput = document.getElementById('scorecard-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Clean up object URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className={`golf-scorecard-ocr-feature ${className}`}>
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Image className="w-6 h-6" />
          Golf Scorecard OCR
        </h2>

        {/* File Upload Section */}
        <div className="mb-6">
          <label 
            htmlFor="scorecard-file-input" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Upload Scorecard Image
          </label>
          
          <div className="flex flex-col gap-4">
            <input
              id="scorecard-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            <div className="text-xs text-gray-500">
              Supported formats: PNG, JPEG, WebP, GIF (max 10MB)
            </div>
          </div>
        </div>

        {/* Image Preview Section */}
        {previewUrl && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Preview</h3>
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <img
                src={previewUrl}
                alt="Scorecard preview"
                className="max-w-full h-auto max-h-96 mx-auto rounded-lg shadow-sm"
              />
              <div className="mt-3 text-sm text-gray-600">
                File: {selectedFile?.name} ({(selectedFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleProcessScorecard}
            disabled={!selectedFile || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isLoading ? 'Processing...' : 'Process Scorecard'}
          </button>

          {selectedFile && (
            <button
              onClick={handleClearSelection}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-red-700 text-sm">{errorMessage}</div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-green-700 text-sm">{successMessage}</div>
          </div>
        )}

        {/* Validation Results Display */}
        {validationResult && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Validation Results
            </h3>
            
            {/* Validation Status */}
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
              validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              {validationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className={`font-medium ${validationResult.isValid ? 'text-green-700' : 'text-yellow-700'}`}>
                  {validationResult.isValid ? 'Data Valid' : 'Validation Issues'}
                </div>
                <div className={`text-sm ${validationResult.isValid ? 'text-green-600' : 'text-yellow-600'}`}>
                  {validationResult.isValid 
                    ? 'OCR data passed validation checks' 
                    : `${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings`
                  }
                </div>
              </div>
            </div>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div className="mb-3">
                <div className="font-medium text-red-700 mb-2">Errors:</div>
                <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="mb-3">
                <div className="font-medium text-yellow-700 mb-2">Warnings:</div>
                <ul className="text-sm text-yellow-600 list-disc list-inside space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Parsed Data Summary */}
        {parsedData && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Extracted Information</h3>
            
            {/* Course Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Course Information</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div><span className="font-medium">Course:</span> {parsedData.courseName || 'Not specified'}</div>
                <div><span className="font-medium">Date:</span> {parsedData.playedDate || 'Not specified'}</div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Holes:</span> {parsedData.summary.holesCount}
                  {parsedData.summary.hasCompleteHoleData && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Complete</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Players:</span> {parsedData.summary.playersCount}
                  {parsedData.summary.hasPlayerScores && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">With Scores</span>
                  )}
                </div>
              </div>
            </div>

            {/* Holes Data */}
            {parsedData.holes.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-800 mb-3">Holes ({parsedData.holes.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                  {parsedData.holes.map((hole) => (
                    <div key={hole.hole_number} className="text-sm bg-white p-3 rounded border">
                      <div className="font-medium text-gray-800">Hole {hole.hole_number}</div>
                      <div className="text-gray-600 space-y-1">
                        {hole.par && <div>Par: {hole.par}</div>}
                        {hole.stroke_index && <div>SI: {hole.stroke_index}</div>}
                        {hole.yardage && <div>Yardage: {hole.yardage}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Players Data */}
            {parsedData.players.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Players ({parsedData.players.length})</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {parsedData.players.map((player, index) => (
                    <div key={index} className="text-sm bg-white p-3 rounded border">
                      <div className="font-medium text-gray-800">{player.name}</div>
                      <div className="text-gray-600 space-y-1">
                        {player.handicap !== undefined && <div>Handicap: {player.handicap}</div>}
                        {player.scores && player.scores.length > 0 && (
                          <div>
                            <div>Scores: ({player.scores.length} holes)</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {player.scores.slice(0, 9).join(', ')}
                              {player.scores.length > 9 && ` ... +${player.scores.length - 9} more`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Raw OCR Data Display (Collapsible) */}
        {rawOcrData && (
          <div className="mb-6">
            <details className="bg-gray-50 border border-gray-200 rounded-lg">
              <summary className="p-4 cursor-pointer text-lg font-semibold text-gray-700 hover:bg-gray-100">
                Raw OCR Data (Click to expand)
              </summary>
              <div className="p-4 border-t border-gray-200">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-96 bg-white p-3 rounded border">
                  {JSON.stringify(rawOcrData, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}; 
import React, { useState } from 'react';
import { Upload, Image, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

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
  const [extractedJson, setExtractedJson] = useState<any>(null);

  // File size validation (10MB limit)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous messages
    setErrorMessage('');
    setSuccessMessage('');
    setExtractedJson(null);

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

      const data = await response.json();
      setExtractedJson(data);
      setSuccessMessage('Scorecard processed successfully!');
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
    setExtractedJson(null);
    
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

        {/* Extracted JSON Display */}
        {extractedJson && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Extracted Data</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-96">
                {JSON.stringify(extractedJson, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 
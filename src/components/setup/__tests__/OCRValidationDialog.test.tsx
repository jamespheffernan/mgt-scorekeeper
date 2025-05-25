import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OCRValidationDialog } from '../OCRValidationDialog';
import type { OCRResult } from '../../../types/ocr';

// Mock dependencies
jest.mock('../../../utils/scorecardParser', () => ({
  scorecardParser: {
    validateScorecardData: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    })
  }
}));

jest.mock('../../../db/courseValidation', () => ({
  validateCourse: jest.fn().mockReturnValue({
    isValid: true,
    errors: []
  })
}));

const mockOCRResult: OCRResult = {
  rawText: "Millbrook Golf Course\nPar 72\nHole 1: Par 4, 350 yards\nHole 2: Par 3, 160 yards",
  confidence: 85,
  words: [
    { text: "Millbrook", confidence: 0.9, bbox: { x0: 0, y0: 0, x1: 100, y1: 20 } },
    { text: "Golf", confidence: 0.85, bbox: { x0: 105, y0: 0, x1: 150, y1: 20 } },
    { text: "Course", confidence: 0.8, bbox: { x0: 155, y0: 0, x1: 220, y1: 20 } }
  ],
  extractedData: {
    courseName: "Millbrook Golf Course",
    courseLocation: "Millbrook, NY",
    date: "06/15/2024",
    holes: [
      { number: 1, par: 4, yardage: 350, handicap: 1, confidence: 0.8 },
      { number: 2, par: 3, yardage: 160, handicap: 2, confidence: 0.75 }
    ],
    tees: [
      { name: "Blue", color: "blue", rating: 72.5, slope: 125, confidence: 0.7 }
    ],
    confidence: 0.8
  }
};

describe('OCRValidationDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnImport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default state
    const { scorecardParser } = require('../../../utils/scorecardParser');
    scorecardParser.validateScorecardData.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
    const { validateCourse } = require('../../../db/courseValidation');
    validateCourse.mockReturnValue({
      isValid: true,
      errors: []
    });
  });

  it('renders dialog when open with OCR result', () => {
    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={mockOCRResult}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText('Review & Correct Scorecard Data')).toBeInTheDocument();
    expect(screen.getByText(/Overall Confidence: 80%/)).toBeInTheDocument();
    expect(screen.getByText('✅ Ready to Import')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <OCRValidationDialog
        isOpen={false}
        ocrResult={mockOCRResult}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    expect(screen.queryByText('Review & Correct Scorecard Data')).not.toBeInTheDocument();
  });

  it('does not render when no OCR result provided', () => {
    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={null}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    expect(screen.queryByText('Review & Correct Scorecard Data')).not.toBeInTheDocument();
  });

  it('shows tabs with correct counts', () => {
    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={mockOCRResult}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText(/Holes \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tees \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Raw OCR')).toBeInTheDocument();
  });

  it('displays validation errors when validation fails', () => {
    const { scorecardParser } = require('../../../utils/scorecardParser');
    scorecardParser.validateScorecardData.mockReturnValue({
      isValid: false,
      errors: ['Course name is missing'],
      warnings: ['Only 2 holes found (expected 9 or 18)']
    });

    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={mockOCRResult}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    expect(screen.getByText('❌ Needs Correction')).toBeInTheDocument();
    expect(screen.getByText('❌ Errors (must be fixed):')).toBeInTheDocument();
    expect(screen.getByText('Course name is missing')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Warnings (review recommended):')).toBeInTheDocument();
    expect(screen.getByText('Only 2 holes found (expected 9 or 18)')).toBeInTheDocument();
  });

  it('disables import button when validation fails', () => {
    const { scorecardParser } = require('../../../utils/scorecardParser');
    scorecardParser.validateScorecardData.mockReturnValue({
      isValid: false,
      errors: ['Course name is missing'],
      warnings: []
    });

    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={mockOCRResult}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    const importButton = screen.getByText('Import Course');
    expect(importButton).toBeDisabled();
  });

  it('enables import button when validation passes', () => {
    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={mockOCRResult}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    const importButton = screen.getByText('Import Course');
    expect(importButton).not.toBeDisabled();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={mockOCRResult}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    fireEvent.click(screen.getByText('×'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={mockOCRResult}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles missing extractedData gracefully', () => {
    const ocrResultWithoutData: OCRResult = {
      ...mockOCRResult,
      extractedData: undefined
    };

    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={ocrResultWithoutData}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    expect(screen.queryByText('Review & Correct Scorecard Data')).not.toBeInTheDocument();
  });

  it('shows confidence indicators with correct classes', () => {
    render(
      <OCRValidationDialog
        isOpen={true}
        ocrResult={mockOCRResult}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
    );

    // Check overall confidence badge (80% should be high confidence since >= 80%)
    const confidenceBadge = screen.getByText(/Overall Confidence: 80%/);
    expect(confidenceBadge.className).toContain('confidence-high');
  });
}); 
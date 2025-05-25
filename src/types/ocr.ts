export interface OCRProcessingState {
  isProcessing: boolean;
  progress: number; // 0-100
  status: string;
  error?: string;
}

export interface OCRResult {
  rawText: string;
  confidence: number;
  words: OCRWord[];
  extractedData?: ScorecardData;
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface ScorecardData {
  courseName?: string;
  courseLocation?: string;
  date?: string;
  playerName?: string;
  holes?: ScorecardHole[];
  tees?: ScorecardTee[];
  totalPar?: number;
  totalYardage?: number;
}

export interface ScorecardHole {
  number: number;
  par?: number;
  yardage?: number;
  handicap?: number; // stroke index
  score?: number;
  confidence: number; // for each field
}

export interface ScorecardTee {
  name?: string;
  color?: string;
  rating?: number;
  slope?: number;
  yardage?: number;
  confidence: number;
}

export interface PhotoImportSettings {
  enablePreprocessing: boolean;
  contrastEnhancement: boolean;
  noiseReduction: boolean;
  deskewing: boolean;
  confidenceThreshold: number; // 0-100
} 
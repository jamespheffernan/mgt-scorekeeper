import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Upload, Image, AlertCircle, CheckCircle2, Loader2, Info, Database, Plus, Search, Edit3, Save, X, RefreshCw, Wifi, Clock, Zap, HardDrive } from 'lucide-react';
import { millbrookDb } from '../../db/millbrookDb';
import { Course, TeeOption, HoleInfo } from '../../db/courseModel';

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

interface CourseMatchResult {
  course: Course;
  similarity: number;
  matchType: 'exact' | 'partial' | 'location';
}

// New interface for editable data
interface EditableOcrData {
  courseName: string;
  playedDate: string;
  holes: OcrHole[];
  players: OcrPlayer[];
}

interface GolfScorecardOcrFeatureProps {
  className?: string;
}

// New interfaces for error handling and retry mechanisms
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

interface ProcessingError {
  type: 'network' | 'timeout' | 'server' | 'validation' | 'parse' | 'unknown';
  message: string;
  retryable: boolean;
  statusCode?: number;
  attempt?: number;
  maxAttempts?: number;
}

interface RetryState {
  isRetrying: boolean;
  currentAttempt: number;
  maxAttempts: number;
  nextRetryIn: number; // seconds
  lastError: ProcessingError | null;
}

// New interfaces for performance optimization
interface ImageCompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-1
  format: 'image/jpeg' | 'image/webp';
}

interface CacheEntry {
  key: string;
  data: {
    rawOcrData: any;
    parsedData: ParsedScorecardData;
    validationResult: ValidationResult;
  };
  timestamp: number;
  size: number; // in bytes
}

interface PerformanceMetrics {
  imageCompressionTime: number;
  requestDuration: number;
  responseSize: number;
  cacheHit: boolean;
  originalImageSize: number;
  compressedImageSize: number;
}

interface LoadingProgress {
  stage: 'compressing' | 'uploading' | 'processing' | 'validating' | 'complete';
  progress: number; // 0-100
  message: string;
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
  
  // Course integration state
  const [existingCourses, setExistingCourses] = useState<Course[]>([]);
  const [courseMatches, setCourseMatches] = useState<CourseMatchResult[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showCourseIntegration, setShowCourseIntegration] = useState<boolean>(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState<boolean>(false);

  // New state for user feedback and correction capabilities
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editableData, setEditableData] = useState<EditableOcrData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // New state for error handling and retry mechanisms
  const [processingError, setProcessingError] = useState<ProcessingError | null>(null);
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    currentAttempt: 0,
    maxAttempts: 0,
    nextRetryIn: 0,
    lastError: null
  });
  const [retryTimeoutId, setRetryTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // New state for performance optimization
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  const [compressedImageBase64, setCompressedImageBase64] = useState<string>('');
  const [showPerformanceInfo, setShowPerformanceInfo] = useState<boolean>(false);
  
  // Refs for performance optimization
  const imageCompressionWorker = useRef<Worker | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Performance optimization configurations
  const COMPRESSION_OPTIONS: ImageCompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'image/jpeg'
  };

  const CACHE_CONFIG = {
    maxEntries: 50,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxTotalSize: 50 * 1024 * 1024 // 50MB
  };

  const DEBOUNCE_DELAY = 300; // milliseconds

  // Retry configuration
  const RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  };

  // Request timeout configuration
  const REQUEST_TIMEOUT = 30000; // 30 seconds

  // File size validation (10MB limit)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  // Load existing courses on component mount
  useEffect(() => {
    loadExistingCourses();
  }, []);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [retryTimeoutId]);

  // Cleanup performance optimization resources on unmount
  useEffect(() => {
    return () => {
      // Clear debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Clear cache
      cacheRef.current.clear();
      
      // Cleanup object URLs
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Utility functions for error handling and retry mechanisms
  const classifyError = (error: Error, statusCode?: number): ProcessingError => {
    // Network errors
    if (!navigator.onLine || error.message?.includes('fetch') || error.message?.includes('network')) {
      return {
        type: 'network',
        message: 'Network connection failed. Please check your internet connection.',
        retryable: true
      };
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Request timed out. The server took too long to respond.',
        retryable: true
      };
    }

    // Server errors (5xx) - retryable
    if (statusCode && statusCode >= 500) {
      return {
        type: 'server',
        message: `Server error (${statusCode}). The server is currently experiencing issues.`,
        retryable: true,
        statusCode
      };
    }

    // Client errors (4xx) - mostly not retryable
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      const retryable = statusCode === 429; // Rate limiting is retryable
      return {
        type: statusCode === 429 ? 'server' : 'validation',
        message: statusCode === 429 
          ? 'Rate limit exceeded. Please wait before trying again.'
          : `Request failed (${statusCode}). Please check your input and try again.`,
        retryable,
        statusCode
      };
    }

    // Parse errors
    if (error.message?.includes('JSON') || error.message?.includes('parse')) {
      return {
        type: 'parse',
        message: 'Failed to parse server response. The server may be experiencing issues.',
        retryable: true
      };
    }

    // Unknown errors
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      retryable: false
    };
  };

  const calculateRetryDelay = (attempt: number): number => {
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
      RETRY_CONFIG.maxDelay
    );
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  };

  const startRetryCountdown = (delayMs: number, attempt: number, error: ProcessingError) => {
    let remainingSeconds = Math.ceil(delayMs / 1000);
    
    setRetryState({
      isRetrying: true,
      currentAttempt: attempt,
      maxAttempts: RETRY_CONFIG.maxAttempts,
      nextRetryIn: remainingSeconds,
      lastError: error
    });

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      remainingSeconds--;
      setRetryState(prev => ({
        ...prev,
        nextRetryIn: remainingSeconds
      }));

      if (remainingSeconds <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    // Start the actual retry after delay
    const timeoutId = setTimeout(() => {
      clearInterval(countdownInterval);
      processOcrOptimized(attempt);
    }, delayMs);

    setRetryTimeoutId(timeoutId);
  };

  const resetRetryState = () => {
    setRetryState({
      isRetrying: false,
      currentAttempt: 0,
      maxAttempts: 0,
      nextRetryIn: 0,
      lastError: null
    });
    setProcessingError(null);
    
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      setRetryTimeoutId(null);
    }
  };

  const cancelRetry = () => {
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      setRetryTimeoutId(null);
    }
    
    setRetryState(prev => ({
      ...prev,
      isRetrying: false,
      nextRetryIn: 0
    }));
    
    setIsLoading(false);
  };

  // Load existing courses from database
  const loadExistingCourses = async () => {
    try {
      const courses = await millbrookDb.getAllCourses();
      setExistingCourses(courses);
    } catch (error) {
      console.error('Error loading existing courses:', error);
    }
  };

  // Find matching courses based on OCR data
  const findCourseMatches = (ocrData: ParsedScorecardData): CourseMatchResult[] => {
    if (!ocrData.courseName || existingCourses.length === 0) {
      return [];
    }

    const matches: CourseMatchResult[] = [];
    const lowerOcrName = ocrData.courseName.toLowerCase();

    for (const course of existingCourses) {
      const lowerCourseName = course.name.toLowerCase();
      const lowerLocation = course.location?.toLowerCase() || '';

      // Exact name match
      if (lowerCourseName === lowerOcrName) {
        matches.push({
          course,
          similarity: 1.0,
          matchType: 'exact'
        });
        continue;
      }

      // Partial name match
      if (lowerCourseName.includes(lowerOcrName) || lowerOcrName.includes(lowerCourseName)) {
        const similarity = Math.max(
          lowerCourseName.length / lowerOcrName.length,
          lowerOcrName.length / lowerCourseName.length
        ) * 0.8; // Reduce score for partial matches
        
        matches.push({
          course,
          similarity,
          matchType: 'partial'
        });
        continue;
      }

      // Location-based match (if OCR name contains location words)
      if (lowerLocation && (lowerOcrName.includes(lowerLocation) || lowerLocation.includes(lowerOcrName))) {
        matches.push({
          course,
          similarity: 0.6,
          matchType: 'location'
        });
      }
    }

    // Sort by similarity score
    return matches.sort((a, b) => b.similarity - a.similarity);
  };

  // Convert OCR data to Course format
  const convertOcrToCourse = (ocrData: ParsedScorecardData): Omit<Course, 'id'> => {
    // Create hole info from OCR holes
    const holes: HoleInfo[] = [];
    for (let i = 1; i <= 18; i++) {
      const ocrHole = ocrData.holes.find(h => h.hole_number === i);
      if (ocrHole) {
        holes.push({
          number: i,
          par: ocrHole.par || 4, // Default to par 4 if not specified
          yardage: ocrHole.yardage || 350, // Default yardage
          strokeIndex: ocrHole.stroke_index || i // Default stroke index
        });
      } else {
        // Create default hole if missing
        holes.push({
          number: i,
          par: 4,
          yardage: 350,
          strokeIndex: i
        });
      }
    }

    // Create default tee option
    const defaultTee: Omit<TeeOption, 'id'> = {
      name: 'Default',
      color: 'White',
      gender: 'Any',
      rating: 72.0,
      slope: 113,
      holes
    };

    return {
      name: ocrData.courseName || 'Imported Course',
      location: 'Unknown Location',
      teeOptions: [{ ...defaultTee, id: crypto.randomUUID() }],
      dateAdded: new Date(),
      lastPlayed: ocrData.playedDate ? new Date(ocrData.playedDate) : undefined
    };
  };

  // Create new course from OCR data
  const createCourseFromOcr = async () => {
    if (!parsedData) return;

    setIsCreatingCourse(true);
    setErrorMessage(''); // Clear any previous errors
    
    try {
      const courseData = convertOcrToCourse(parsedData);
      const newCourse: Course = {
        ...courseData,
        id: crypto.randomUUID()
      };

      await millbrookDb.saveCourse(newCourse);
      await loadExistingCourses(); // Refresh course list
      setSelectedCourseId(newCourse.id);
      setSuccessMessage(`Course "${newCourse.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating course:', error);
      
      // Enhanced error handling for course creation
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
        setErrorMessage('Failed to create course: Storage quota exceeded. Please free up space and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        setErrorMessage('Failed to create course: Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        setErrorMessage('Failed to create course: Permission denied. Please check your access rights.');
      } else {
        setErrorMessage(`Failed to create course: ${errorMessage}`);
      }
    } finally {
      setIsCreatingCourse(false);
    }
  };

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

  // Fetch with timeout wrapper
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
      }
      throw error;
    }
  };

  const calculateCompressionRatio = (original: number, compressed: number): number => {
    return Math.round(((original - compressed) / original) * 100);
  };

  // Memoized functions for performance optimization
  const memoizedFindCourseMatches = useMemo(() => {
    return (ocrData: ParsedScorecardData): CourseMatchResult[] => {
      return findCourseMatches(ocrData);
    };
  }, [existingCourses]);

  const memoizedValidateOcrData = useCallback((data: any): ValidationResult => {
    return validateOcrData(data);
  }, []);

  const memoizedParseOcrData = useCallback((validatedData: OcrScorecardData): ParsedScorecardData => {
    return parseOcrData(validatedData);
  }, []);

  // Debounced cache cleanup
  const debouncedCacheCleanup = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      cleanupCache();
    }, DEBOUNCE_DELAY);
  }, []);

  // Performance-optimized OCR processing with all optimizations
  const processOcrOptimized = async (attempt: number = 1): Promise<void> => {
    try {
      updateLoadingProgress('processing', 30, 'Checking cache...');
      
      // Use compressed image for better performance
      const imageDataToUse = compressedImageBase64 || imageBase64;
      const cachedResult = await getCachedResult(imageDataToUse);
      
      if (cachedResult) {
        // Cache hit - instant response
        updateLoadingProgress('processing', 90, 'Loading cached result...');
        
        setRawOcrData(cachedResult.data.rawOcrData);
        setParsedData(cachedResult.data.parsedData);
        setValidationResult(cachedResult.data.validationResult);
        
        // Update performance metrics
        setPerformanceMetrics(prev => prev ? {
          ...prev,
          cacheHit: true,
          requestDuration: 0,
          responseSize: JSON.stringify(cachedResult.data).length
        } : null);
        
        updateLoadingProgress('complete', 100, 'Cached result loaded successfully!');
        setSuccessMessage('Scorecard processed successfully (from cache)!');
        setIsLoading(false);
        
        // Use memoized course matching
        if (cachedResult.data.parsedData) {
          const matches = memoizedFindCourseMatches(cachedResult.data.parsedData);
          setCourseMatches(matches);
          
          const exactMatch = matches.find(match => match.matchType === 'exact');
          if (exactMatch) {
            setSelectedCourseId(exactMatch.course.id);
          }
          
          setShowCourseIntegration(true);
        }
        
        setTimeout(() => setLoadingProgress(null), 2000);
        return;
      }

      // No cache - proceed with optimized API request
      updateLoadingProgress('uploading', 50, 'Sending optimized request...');
      const requestStartTime = performance.now();
      
      const response = await fetchWithTimeout('http://localhost:3001/api/process-scorecard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataToUse,
          filename: selectedFile?.name || 'scorecard.jpg',
          compressed: !!compressedImageBase64
        }),
      }, REQUEST_TIMEOUT);

      updateLoadingProgress('processing', 70, 'Processing response...');
      const requestDuration = performance.now() - requestStartTime;

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(errorText);
        throw { ...error, statusCode: response.status };
      }

      const responseData = await response.json();
      const responseSize = JSON.stringify(responseData).length;
      
      updateLoadingProgress('validating', 85, 'Validating extracted data...');

      // Use memoized validation and parsing for better performance
      const validationResult = memoizedValidateOcrData(responseData);
      if (!validationResult.isValid) {
        throw new Error(`Invalid OCR data: ${validationResult.errors.join(', ')}`);
      }

      const parsedData = memoizedParseOcrData(validationResult.data!);
      
      // Update performance metrics
      setPerformanceMetrics(prev => prev ? {
        ...prev,
        requestDuration,
        responseSize,
        cacheHit: false
      } : null);

      // Cache the successful result with debounced cleanup
      await setCachedResult(imageDataToUse, {
        rawOcrData: responseData,
        parsedData,
        validationResult
      });
      debouncedCacheCleanup();

      // Update state
      setRawOcrData(responseData);
      setParsedData(parsedData);
      setValidationResult(validationResult);
      
      updateLoadingProgress('complete', 100, 'Processing complete!');
      setSuccessMessage('Scorecard processed successfully!');
      setIsLoading(false);
      resetRetryState();

      // Use memoized course matching
      const matches = memoizedFindCourseMatches(parsedData);
      setCourseMatches(matches);
      
      const exactMatch = matches.find(match => match.matchType === 'exact');
      if (exactMatch) {
        setSelectedCourseId(exactMatch.course.id);
      }
      
      setShowCourseIntegration(true);
      setTimeout(() => setLoadingProgress(null), 2000);

    } catch (error: any) {
      console.error('OCR processing error:', error);
      
      const classifiedError = classifyError(error, error.statusCode);
      
      setProcessingError({
        ...classifiedError,
        attempt,
        maxAttempts: RETRY_CONFIG.maxAttempts
      });
      
      setErrorMessage(classifiedError.message);
      setIsLoading(false);
      setLoadingProgress(null);

      if (classifiedError.retryable && attempt < RETRY_CONFIG.maxAttempts) {
        const delayMs = calculateRetryDelay(attempt);
        startRetryCountdown(delayMs, attempt, classifiedError);
      }
    }
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
    setShowCourseIntegration(false);
    setCourseMatches([]);
    setSelectedCourseId(null);
    setPerformanceMetrics(null);
    setLoadingProgress(null);
    setCompressedImageBase64('');

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

    // Convert to base64 and compress image
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      if (result) {
        // Remove data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        setImageBase64(base64);

        // Compress image for better performance
        try {
          updateLoadingProgress('compressing', 10, 'Compressing image...');
          const compression = await compressImage(file);
          setCompressedImageBase64(compression.compressedBase64);
          
          // Initialize performance metrics
          setPerformanceMetrics({
            imageCompressionTime: compression.compressionTime,
            requestDuration: 0,
            responseSize: 0,
            cacheHit: false,
            originalImageSize: compression.originalSize,
            compressedImageSize: compression.compressedSize
          });
          
          updateLoadingProgress('complete', 100, 'Image ready for processing');
          setTimeout(() => setLoadingProgress(null), 2000);
        } catch (error) {
          console.warn('Image compression failed, using original:', error);
          setCompressedImageBase64(base64);
        }
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
    setShowCourseIntegration(false);
    setCourseMatches([]);
    setSelectedCourseId(null);
    resetRetryState();

    await processOcrOptimized();
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
    setShowCourseIntegration(false);
    setCourseMatches([]);
    setSelectedCourseId(null);
    resetRetryState(); // Clear retry state
    
    // Clear performance optimization state
    setPerformanceMetrics(null);
    setLoadingProgress(null);
    setCompressedImageBase64('');
    setShowPerformanceInfo(false);
    
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

  // New functions for user feedback and correction capabilities
  const enterEditMode = () => {
    if (!parsedData) return;
    
    const editable: EditableOcrData = {
      courseName: parsedData.courseName || '',
      playedDate: parsedData.playedDate || '',
      holes: [...parsedData.holes],
      players: parsedData.players.map(player => ({
        ...player,
        scores: player.scores ? [...player.scores] : []
      }))
    };
    
    setEditableData(editable);
    setIsEditMode(true);
    setHasUnsavedChanges(false);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditableData(null);
    setHasUnsavedChanges(false);
  };

  const saveEditedData = () => {
    if (!editableData) return;
    
    // Update parsed data with edited values
    const updatedParsedData: ParsedScorecardData = {
      courseName: editableData.courseName || null,
      playedDate: editableData.playedDate || null,
      holes: editableData.holes,
      players: editableData.players,
      summary: {
        holesCount: editableData.holes.length,
        playersCount: editableData.players.length,
        hasCompleteHoleData: editableData.holes.every(h => h.par && h.yardage && h.stroke_index),
        hasPlayerScores: editableData.players.some(p => p.scores && p.scores.length > 0)
      }
    };
    
    setParsedData(updatedParsedData);
    
    // Re-validate the edited data
    const revalidated = validateOcrData({
      course_name: editableData.courseName,
      played_on_date: editableData.playedDate,
      holes: editableData.holes,
      players: editableData.players
    });
    setValidationResult(revalidated);
    
    // Update course matches if course name changed
    if (parsedData && editableData.courseName !== parsedData.courseName) {
      const matches = findCourseMatches(updatedParsedData);
      setCourseMatches(matches);
      
      // Auto-select exact match if found
      const exactMatch = matches.find(match => match.matchType === 'exact');
      if (exactMatch) {
        setSelectedCourseId(exactMatch.course.id);
      } else {
        setSelectedCourseId(null);
      }
    }
    
    setSuccessMessage('Changes saved successfully!');
    exitEditMode();
  };

  const updateEditableData = (updates: Partial<EditableOcrData>) => {
    if (!editableData) return;
    
    setEditableData(prev => ({
      ...prev!,
      ...updates
    }));
    setHasUnsavedChanges(true);
  };

  const updateHole = (holeIndex: number, updates: Partial<OcrHole>) => {
    if (!editableData) return;
    
    const updatedHoles = [...editableData.holes];
    updatedHoles[holeIndex] = { ...updatedHoles[holeIndex], ...updates };
    
    updateEditableData({ holes: updatedHoles });
  };

  const updatePlayer = (playerIndex: number, updates: Partial<OcrPlayer>) => {
    if (!editableData) return;
    
    const updatedPlayers = [...editableData.players];
    updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], ...updates };
    
    updateEditableData({ players: updatedPlayers });
  };

  const addHole = () => {
    if (!editableData) return;
    
    const nextHoleNumber = Math.max(...editableData.holes.map(h => h.hole_number), 0) + 1;
    const newHole: OcrHole = {
      hole_number: nextHoleNumber,
      par: 4,
      stroke_index: nextHoleNumber,
      yardage: 350
    };
    
    updateEditableData({ 
      holes: [...editableData.holes, newHole] 
    });
  };

  const removeHole = (holeIndex: number) => {
    if (!editableData) return;
    
    const updatedHoles = editableData.holes.filter((_, index) => index !== holeIndex);
    updateEditableData({ holes: updatedHoles });
  };

  const addPlayer = () => {
    if (!editableData) return;
    
    const newPlayer: OcrPlayer = {
      name: 'New Player',
      handicap: 0,
      scores: []
    };
    
    updateEditableData({ 
      players: [...editableData.players, newPlayer] 
    });
  };

  const removePlayer = (playerIndex: number) => {
    if (!editableData) return;
    
    const updatedPlayers = editableData.players.filter((_, index) => index !== playerIndex);
    updateEditableData({ players: updatedPlayers });
  };

  // Manual retry function
  const handleManualRetry = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setErrorMessage('');
    setProcessingError(null);
    resetRetryState();

    await processOcrOptimized();
  };

  // Performance optimization utility functions
  const generateImageHash = async (imageData: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(imageData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const compressImage = async (file: File): Promise<{ compressedBase64: string; compressionTime: number; originalSize: number; compressedSize: number }> => {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new (window as any).Image();
      
      img.onload = () => {
        // Calculate dimensions while maintaining aspect ratio
        let { width, height } = img;
        const aspectRatio = width / height;
        
        if (width > COMPRESSION_OPTIONS.maxWidth) {
          width = COMPRESSION_OPTIONS.maxWidth;
          height = width / aspectRatio;
        }
        
        if (height > COMPRESSION_OPTIONS.maxHeight) {
          height = COMPRESSION_OPTIONS.maxHeight;
          width = height * aspectRatio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'));
              return;
            }
            
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const compressedBase64 = result.split(',')[1];
              const compressionTime = performance.now() - startTime;
              
              resolve({
                compressedBase64,
                compressionTime,
                originalSize: file.size,
                compressedSize: blob.size
              });
            };
            reader.onerror = () => reject(new Error('Failed to read compressed image'));
            reader.readAsDataURL(blob);
          },
          COMPRESSION_OPTIONS.format,
          COMPRESSION_OPTIONS.quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  };

  const getCacheKey = async (imageData: string): Promise<string> => {
    const hash = await generateImageHash(imageData);
    return `ocr_${hash}`;
  };

  const getCachedResult = async (imageData: string): Promise<CacheEntry | null> => {
    const key = await getCacheKey(imageData);
    const entry = cacheRef.current.get(key);
    
    if (!entry) return null;
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > CACHE_CONFIG.maxAge) {
      cacheRef.current.delete(key);
      return null;
    }
    
    return entry;
  };

  const setCachedResult = async (imageData: string, data: CacheEntry['data']): Promise<void> => {
    const key = await getCacheKey(imageData);
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      size: JSON.stringify(data).length
    };
    
    // Add to cache
    cacheRef.current.set(key, entry);
    
    // Clean up cache if needed
    cleanupCache();
  };

  const cleanupCache = () => {
    const entries = Array.from(cacheRef.current.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    let totalSize = entries.reduce((sum, [, entry]) => sum + entry.size, 0);
    
    // Remove oldest entries if over limits
    while (
      (cacheRef.current.size > CACHE_CONFIG.maxEntries || 
       totalSize > CACHE_CONFIG.maxTotalSize) &&
      entries.length > 0
    ) {
      const [key, entry] = entries.shift()!;
      cacheRef.current.delete(key);
      totalSize -= entry.size;
    }
  };

  const updateLoadingProgress = (stage: LoadingProgress['stage'], progress: number, message: string) => {
    setLoadingProgress({ stage, progress, message });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

          {performanceMetrics && (
            <button
              onClick={() => setShowPerformanceInfo(!showPerformanceInfo)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Performance
            </button>
          )}
        </div>

        {/* Loading Progress */}
        {loadingProgress && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="font-medium text-blue-800 capitalize">
                {loadingProgress.stage}
              </span>
              <span className="text-blue-700 text-sm">
                {loadingProgress.progress}%
              </span>
            </div>
            
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress.progress}%` }}
              />
            </div>
            
            <div className="text-sm text-blue-700">
              {loadingProgress.message}
            </div>
          </div>
        )}

        {/* Performance Information */}
        {showPerformanceInfo && performanceMetrics && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-800">Performance Metrics</h3>
              {performanceMetrics.cacheHit && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  <HardDrive className="w-3 h-3" />
                  Cache Hit
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600 mb-1">Image Processing</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Original Size:</span>
                    <span className="font-mono">{formatFileSize(performanceMetrics.originalImageSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compressed Size:</span>
                    <span className="font-mono">{formatFileSize(performanceMetrics.compressedImageSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compression:</span>
                    <span className="font-mono text-green-600">
                      {calculateCompressionRatio(performanceMetrics.originalImageSize, performanceMetrics.compressedImageSize)}% reduction
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compression Time:</span>
                    <span className="font-mono">{performanceMetrics.imageCompressionTime.toFixed(0)}ms</span>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-gray-600 mb-1">API Performance</div>
                <div className="space-y-1">
                  {!performanceMetrics.cacheHit ? (
                    <>
                      <div className="flex justify-between">
                        <span>Request Time:</span>
                        <span className="font-mono">{performanceMetrics.requestDuration.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Response Size:</span>
                        <span className="font-mono">{formatFileSize(performanceMetrics.responseSize)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-green-600 font-medium">
                      Instant cache retrieval
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Cache Entries:</span>
                    <span className="font-mono">{cacheRef.current.size}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Message with Retry Status */}
        {(errorMessage || processingError || retryState.isRetrying) && (
          <div className="mb-4">
            {/* Retry Status - Show during automatic retry countdown */}
            {retryState.isRetrying && (
              <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="font-medium text-blue-800">
                    Retrying in {retryState.nextRetryIn} seconds...
                  </span>
                </div>
                <div className="text-sm text-blue-700 mb-3">
                  Attempt {retryState.currentAttempt} of {retryState.maxAttempts}
                  {retryState.lastError && ` • ${retryState.lastError.message}`}
                </div>
                <button
                  onClick={cancelRetry}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded text-sm font-medium hover:bg-gray-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel Retry
                </button>
              </div>
            )}

            {/* Error Message with Retry Options */}
            {errorMessage && !retryState.isRetrying && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  {processingError?.type === 'network' ? (
                    <Wifi className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : processingError?.type === 'timeout' ? (
                    <Clock className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="text-red-700 text-sm font-medium mb-1">
                      {processingError?.type === 'network' ? 'Network Error' :
                       processingError?.type === 'timeout' ? 'Timeout Error' :
                       processingError?.type === 'server' ? 'Server Error' :
                       processingError?.type === 'validation' ? 'Validation Error' :
                       processingError?.type === 'parse' ? 'Parse Error' : 'Processing Error'}
                    </div>
                    <div className="text-red-700 text-sm">{errorMessage}</div>
                    
                    {processingError && processingError.attempt && processingError.attempt > 1 && (
                      <div className="text-red-600 text-xs mt-2">
                        Failed after {processingError.attempt} attempt{processingError.attempt > 1 ? 's' : ''}
                        {processingError.statusCode && ` (HTTP ${processingError.statusCode})`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Retry Actions */}
                {processingError?.retryable && selectedFile && (
                  <div className="flex items-center gap-2 pt-2 border-t border-red-200">
                    <button
                      onClick={handleManualRetry}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Try Again
                    </button>
                    <span className="text-xs text-red-600">
                      {processingError?.type === 'network' ? 'Check your internet connection and try again' :
                       processingError?.type === 'timeout' ? 'Server response was slow, trying again may help' :
                       processingError?.type === 'server' ? 'Server may be temporarily unavailable' :
                       'Click to retry the request'}
                    </span>
                  </div>
                )}

                {/* Non-retryable error guidance */}
                {processingError && !processingError.retryable && (
                  <div className="pt-2 border-t border-red-200">
                    <div className="text-xs text-red-600">
                      {processingError?.type === 'validation' ? 'Please check your image and try a different scorecard' :
                       'This error cannot be automatically resolved. Please try with a different image.'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-green-700 text-sm">{successMessage}</div>
          </div>
        )}

        {/* Course Integration Section */}
        {showCourseIntegration && parsedData && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Course Integration
            </h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="mb-4">
                <h4 className="font-medium text-blue-800 mb-2">
                  Detected Course: "{parsedData.courseName}"
                </h4>
                
                {courseMatches.length > 0 ? (
                  <div className="mb-4">
                    <div className="text-sm text-blue-700 mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Found {courseMatches.length} potential match{courseMatches.length !== 1 ? 'es' : ''} in your course database:
                    </div>
                    
                    <div className="space-y-2">
                      {courseMatches.map((match) => (
                        <label key={match.course.id} className="flex items-center gap-3 p-3 bg-white rounded border hover:bg-blue-50 cursor-pointer">
                          <input
                            type="radio"
                            name="courseSelection"
                            value={match.course.id}
                            checked={selectedCourseId === match.course.id}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{match.course.name}</div>
                            <div className="text-sm text-gray-600">{match.course.location}</div>
                            <div className="text-xs text-gray-500">
                              {Math.round(match.similarity * 100)}% match ({match.matchType})
                              {match.course.teeOptions?.length && ` • ${match.course.teeOptions.length} tee option${match.course.teeOptions.length !== 1 ? 's' : ''}`}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="text-sm text-yellow-700">
                      No matching courses found in your database for "{parsedData.courseName}".
                    </div>
                  </div>
                )}
                
                {/* Create new course option */}
                <div className="border-t border-blue-200 pt-4">
                  <div className="text-sm text-blue-700 mb-3">
                    Or create a new course from this scorecard data:
                  </div>
                  
                  <label className="flex items-center gap-3 p-3 bg-white rounded border hover:bg-blue-50 cursor-pointer">
                    <input
                      type="radio"
                      name="courseSelection"
                      value="create-new"
                      checked={selectedCourseId === 'create-new'}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-800">Create New Course: "{parsedData.courseName}"</span>
                    </div>
                  </label>
                  
                  {selectedCourseId === 'create-new' && (
                    <div className="mt-3 ml-7">
                      <button
                        onClick={createCourseFromOcr}
                        disabled={isCreatingCourse}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                      >
                        {isCreatingCourse ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        {isCreatingCourse ? 'Creating...' : 'Create Course'}
                      </button>
                      <div className="text-xs text-gray-600 mt-2">
                        This will create a new course with {parsedData.holes.length} holes and default settings.
                        You can edit the course details later in the Course Manager.
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Course integration summary */}
                {selectedCourseId && selectedCourseId !== 'create-new' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Selected course: {courseMatches.find(m => m.course.id === selectedCourseId)?.course.name}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      OCR data will be associated with this existing course.
                    </div>
                  </div>
                )}
              </div>
            </div>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Extracted Information</h3>
              
              {/* Edit/Save/Cancel buttons */}
              <div className="flex items-center gap-2">
                {!isEditMode ? (
                  <button
                    onClick={enterEditMode}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={saveEditedData}
                      disabled={!hasUnsavedChanges}
                      className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={exitEditMode}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-500 text-white rounded text-sm font-medium hover:bg-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Unsaved changes warning */}
            {hasUnsavedChanges && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">You have unsaved changes</span>
              </div>
            )}
            
            {/* Course Information - Editable */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-800 mb-2">Course Information</h4>
              <div className="text-sm text-blue-700 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium min-w-[60px]">Course:</span>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editableData?.courseName || ''}
                      onChange={(e) => updateEditableData({ courseName: e.target.value })}
                      className="flex-1 px-2 py-1 border border-blue-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Course name"
                    />
                  ) : (
                    <span>{parsedData.courseName || 'Not specified'}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium min-w-[60px]">Date:</span>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={editableData?.playedDate || ''}
                      onChange={(e) => updateEditableData({ playedDate: e.target.value })}
                      className="px-2 py-1 border border-blue-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span>{parsedData.playedDate || 'Not specified'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Holes:</span> {isEditMode ? editableData?.holes.length || 0 : parsedData.summary.holesCount}
                  {(isEditMode ? (editableData?.holes?.every(h => h.par && h.yardage && h.stroke_index) || false) : parsedData.summary.hasCompleteHoleData) && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Complete</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Players:</span> {isEditMode ? editableData?.players.length || 0 : parsedData.summary.playersCount}
                  {(isEditMode ? (editableData?.players?.some(p => p.scores && p.scores.length > 0) || false) : parsedData.summary.hasPlayerScores) && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">With Scores</span>
                  )}
                </div>
              </div>
            </div>

            {/* Holes Data - Editable */}
            {(isEditMode ? (editableData?.holes?.length || 0) : parsedData.holes.length) > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">
                    Holes ({isEditMode ? (editableData?.holes?.length || 0) : parsedData.holes.length})
                  </h4>
                  {isEditMode && (
                    <button
                      onClick={addHole}
                      className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Hole
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                  {(isEditMode ? (editableData?.holes || []) : parsedData.holes).map((hole, index) => (
                    <div key={`${hole.hole_number}-${index}`} className="text-sm bg-white p-3 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-800">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={hole.hole_number}
                              onChange={(e) => updateHole(index, { hole_number: parseInt(e.target.value) || 1 })}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-sm text-center"
                              min="1"
                              max="18"
                            />
                          ) : (
                            `Hole ${hole.hole_number}`
                          )}
                        </div>
                        {isEditMode && (
                          <button
                            onClick={() => removeHole(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove hole"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      
                      <div className="text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-xs">Par:</span>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={hole.par || ''}
                              onChange={(e) => updateHole(index, { par: parseInt(e.target.value) || undefined })}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                              min="3"
                              max="6"
                              placeholder="4"
                            />
                          ) : (
                            hole.par && <span className="text-xs">{hole.par}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-xs">SI:</span>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={hole.stroke_index || ''}
                              onChange={(e) => updateHole(index, { stroke_index: parseInt(e.target.value) || undefined })}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                              min="1"
                              max="18"
                              placeholder="1"
                            />
                          ) : (
                            hole.stroke_index && <span className="text-xs">{hole.stroke_index}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-xs">Yards:</span>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={hole.yardage || ''}
                              onChange={(e) => updateHole(index, { yardage: parseInt(e.target.value) || undefined })}
                              className="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                              min="50"
                              max="700"
                              placeholder="350"
                            />
                          ) : (
                            hole.yardage && <span className="text-xs">{hole.yardage}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Players Data - Editable */}
            {(isEditMode ? (editableData?.players?.length || 0) : parsedData.players.length) > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">
                    Players ({isEditMode ? (editableData?.players?.length || 0) : parsedData.players.length})
                  </h4>
                  {isEditMode && (
                    <button
                      onClick={addPlayer}
                      className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Player
                    </button>
                  )}
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {(isEditMode ? (editableData?.players || []) : parsedData.players).map((player, index) => (
                    <div key={index} className="text-sm bg-white p-3 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-800">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={player.name}
                              onChange={(e) => updatePlayer(index, { name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Player name"
                            />
                          ) : (
                            player.name
                          )}
                        </div>
                        {isEditMode && (
                          <button
                            onClick={() => removePlayer(index)}
                            className="text-red-500 hover:text-red-700 p-1 ml-2"
                            title="Remove player"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      
                      <div className="text-gray-600 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-xs">Handicap:</span>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={player.handicap !== undefined ? player.handicap : ''}
                              onChange={(e) => updatePlayer(index, { handicap: e.target.value ? parseInt(e.target.value) : undefined })}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                              min="0"
                              max="54"
                              placeholder="0"
                            />
                          ) : (
                            player.handicap !== undefined && <span className="text-xs">{player.handicap}</span>
                          )}
                        </div>
                        
                        {player.scores && player.scores.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs">Scores: ({player.scores.length} holes)</span>
                            </div>
                            {isEditMode ? (
                              <div className="grid grid-cols-6 gap-1">
                                {player.scores.map((score, scoreIndex) => (
                                  <input
                                    key={scoreIndex}
                                    type="number"
                                    value={score}
                                    onChange={(e) => {
                                      const newScores = [...player.scores!];
                                      newScores[scoreIndex] = parseInt(e.target.value) || 0;
                                      updatePlayer(index, { scores: newScores });
                                    }}
                                    className="w-8 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                                    min="1"
                                    max="12"
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 mt-1">
                                {player.scores.slice(0, 9).join(', ')}
                                {player.scores.length > 9 && ` ... +${player.scores.length - 9} more`}
                              </div>
                            )}
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
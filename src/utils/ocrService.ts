import { createWorker, PSM } from 'tesseract.js';
import type { OCRProcessingState, OCRResult, OCRWord, PhotoImportSettings } from '../types/ocr';

export class OCRService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;

  /**
   * Initialize the OCR worker
   */
  async initialize(onProgress?: (state: OCRProcessingState) => void): Promise<void> {
    if (this.isInitialized) return;

    try {
      onProgress?.({ isProcessing: true, progress: 0, status: 'Initializing OCR engine...' });
      
      this.worker = await createWorker('eng');
      
      // Set OCR parameters for better scorecard recognition
      await this.worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT, // Good for mixed text layouts
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,()-/',
      });

      this.isInitialized = true;
      onProgress?.({ isProcessing: false, progress: 100, status: 'OCR engine ready' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize OCR';
      onProgress?.({ isProcessing: false, progress: 0, status: 'Initialization failed', error: errorMessage });
      throw error;
    }
  }

  /**
   * Process image with OCR and extract text
   */
  async processImage(
    imageFile: File,
    settings: PhotoImportSettings,
    onProgress?: (state: OCRProcessingState) => void
  ): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('OCR service not initialized. Call initialize() first.');
    }

    try {
      onProgress?.({ isProcessing: true, progress: 0, status: 'Preprocessing image...' });

      // Preprocess image if enabled
      let processedImage: File | HTMLCanvasElement = imageFile;
      if (settings.enablePreprocessing) {
        processedImage = await this.preprocessImage(imageFile, settings, onProgress);
      }

      onProgress?.({ isProcessing: true, progress: 30, status: 'Running OCR analysis...' });

      // Recognize text
      const { data } = await this.worker.recognize(processedImage);

      onProgress?.({ isProcessing: true, progress: 90, status: 'Processing results...' });

      // For now, create basic word structure from the raw text
      // TODO: In Task 3.2, we'll implement proper structured data extraction
      const words: OCRWord[] = this.extractBasicWords(data.text, settings.confidenceThreshold);

      const result: OCRResult = {
        rawText: data.text,
        confidence: data.confidence,
        words: words
      };

      onProgress?.({ isProcessing: false, progress: 100, status: 'OCR completed successfully' });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OCR processing failed';
      onProgress?.({ isProcessing: false, progress: 0, status: 'OCR failed', error: errorMessage });
      throw error;
    }
  }

  /**
   * Extract basic word structures from raw text
   * This is a simplified implementation for Task 3.1
   */
  private extractBasicWords(text: string, confidenceThreshold: number): OCRWord[] {
    const words = text.split(/\s+/).filter(word => word.trim().length > 0);
    return words.map((word, index) => ({
      text: word.trim(),
      confidence: 85, // Default confidence for basic extraction
      bbox: {
        x0: index * 50, // Placeholder coordinates
        y0: 0,
        x1: (index + 1) * 50,
        y1: 20
      }
    })).filter(word => word.confidence >= confidenceThreshold);
  }

  /**
   * Preprocess image for better OCR results
   */
  private async preprocessImage(
    imageFile: File,
    settings: PhotoImportSettings,
    onProgress?: (state: OCRProcessingState) => void
  ): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          onProgress?.({ isProcessing: true, progress: 10, status: 'Applying image filters...' });

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Apply preprocessing filters
          if (settings.contrastEnhancement) {
            this.enhanceContrast(ctx, canvas.width, canvas.height);
          }

          if (settings.noiseReduction) {
            this.reduceNoise(ctx, canvas.width, canvas.height);
          }

          onProgress?.({ isProcessing: true, progress: 25, status: 'Image preprocessing complete' });

          resolve(canvas);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  }

  /**
   * Enhance image contrast for better OCR
   */
  private enhanceContrast(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const factor = 1.5; // Contrast factor
    const intercept = 128 * (1 - factor);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] * factor + intercept;     // red
      data[i + 1] = data[i + 1] * factor + intercept; // green
      data[i + 2] = data[i + 2] * factor + intercept; // blue
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Reduce image noise using simple averaging
   */
  private reduceNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);

    // Simple 3x3 averaging filter
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let channel = 0; channel < 3; channel++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const index = ((y + dy) * width + (x + dx)) * 4 + channel;
              sum += data[index];
            }
          }
          const newIndex = (y * width + x) * 4 + channel;
          newData[newIndex] = sum / 9;
        }
      }
    }

    imageData.data.set(newData);
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Export a singleton instance
export const ocrService = new OCRService(); 
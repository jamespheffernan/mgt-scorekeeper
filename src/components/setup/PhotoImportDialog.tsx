import React, { useState, useRef, useCallback } from 'react';
import type { OCRProcessingState, OCRResult, PhotoImportSettings } from '../../types/ocr';
import { ocrService } from '../../utils/ocrService';
import './PhotoImportDialog.css';

interface PhotoImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (result: OCRResult) => void;
}

export const PhotoImportDialog: React.FC<PhotoImportDialogProps> = ({
  isOpen,
  onClose,
  onResult
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [processing, setProcessing] = useState<OCRProcessingState>({
    isProcessing: false,
    progress: 0,
    status: ''
  });
  const [settings, setSettings] = useState<PhotoImportSettings>({
    enablePreprocessing: true,
    contrastEnhancement: true,
    noiseReduction: true,
    deskewing: false, // TODO: Implement in future
    confidenceThreshold: 70
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isOcrInitialized, setIsOcrInitialized] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Initialize OCR when dialog opens
  React.useEffect(() => {
    if (isOpen && !isOcrInitialized) {
      initializeOCR();
    }
  }, [isOpen, isOcrInitialized]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      stopCamera();
    };
  }, [previewUrl]);

  const initializeOCR = async () => {
    try {
      await ocrService.initialize((state) => {
        setProcessing(state);
      });
      setIsOcrInitialized(true);
    } catch (error) {
      console.error('Failed to initialize OCR:', error);
      setProcessing({
        isProcessing: false,
        progress: 0,
        status: 'Failed to initialize OCR engine',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      stopCamera(); // Stop camera if active
    }
  }, [previewUrl]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions or upload a file instead.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'scorecard-photo.jpg', { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        stopCamera();
      }
    }, 'image/jpeg', 0.95);
  };

  const processImage = async () => {
    if (!selectedFile || !isOcrInitialized) return;

    try {
      setProcessing({ isProcessing: true, progress: 0, status: 'Starting OCR processing...' });
      
      const result = await ocrService.processImage(selectedFile, settings, (state) => {
        setProcessing(state);
      });

      onResult(result);
      
      // Reset state
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      onClose();
    } catch (error) {
      console.error('OCR processing failed:', error);
      setProcessing({
        isProcessing: false,
        progress: 0,
        status: 'Processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleClose = () => {
    if (processing.isProcessing) return; // Don't close during processing
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setSelectedFile(null);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="photo-import-overlay">
      <div className="photo-import-dialog">
        <div className="photo-import-header">
          <h2>Import Scorecard</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={processing.isProcessing}
          >
            ×
          </button>
        </div>

        <div className="photo-import-content">
          {/* File Input and Camera Controls */}
          <div className="import-controls">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input-hidden"
            />
            
            <div className="control-buttons">
              <button 
                className="control-button upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing.isProcessing}
              >
                📁 Upload Photo
              </button>
              
              {!isCameraActive ? (
                <button 
                  className="control-button camera"
                  onClick={startCamera}
                  disabled={processing.isProcessing}
                >
                  📷 Take Photo
                </button>
              ) : (
                <div className="camera-controls">
                  <button 
                    className="control-button capture"
                    onClick={capturePhoto}
                  >
                    📸 Capture
                  </button>
                  <button 
                    className="control-button cancel"
                    onClick={stopCamera}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Camera Video */}
          {isCameraActive && (
            <div className="camera-container">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="camera-video"
              />
              <canvas ref={canvasRef} className="capture-canvas" />
            </div>
          )}

          {/* Image Preview */}
          {previewUrl && !isCameraActive && (
            <div className="preview-container">
              <img src={previewUrl} alt="Selected scorecard" className="preview-image" />
            </div>
          )}

          {/* Processing Status */}
          {processing.isProcessing && (
            <div className="processing-status">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${processing.progress}%` }}
                />
              </div>
              <p className="status-text">{processing.status}</p>
            </div>
          )}

          {/* Error Display */}
          {processing.error && !processing.isProcessing && (
            <div className="error-message">
              <p>Error: {processing.error}</p>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="settings-section">
            <button 
              className="settings-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              ⚙️ Advanced Settings {showAdvanced ? '▼' : '▶'}
            </button>
            
            {showAdvanced && (
              <div className="advanced-settings">
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={settings.enablePreprocessing}
                    onChange={(e) => setSettings({
                      ...settings,
                      enablePreprocessing: e.target.checked
                    })}
                  />
                  Enable image preprocessing
                </label>

                {settings.enablePreprocessing && (
                  <>
                    <label className="setting-item">
                      <input
                        type="checkbox"
                        checked={settings.contrastEnhancement}
                        onChange={(e) => setSettings({
                          ...settings,
                          contrastEnhancement: e.target.checked
                        })}
                      />
                      Enhance contrast
                    </label>

                    <label className="setting-item">
                      <input
                        type="checkbox"
                        checked={settings.noiseReduction}
                        onChange={(e) => setSettings({
                          ...settings,
                          noiseReduction: e.target.checked
                        })}
                      />
                      Reduce noise
                    </label>
                  </>
                )}

                <label className="setting-item">
                  <span>Confidence threshold: {settings.confidenceThreshold}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.confidenceThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      confidenceThreshold: parseInt(e.target.value)
                    })}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="dialog-actions">
            <button 
              className="action-button cancel"
              onClick={handleClose}
              disabled={processing.isProcessing}
            >
              Cancel
            </button>
            
            <button 
              className="action-button process"
              onClick={processImage}
              disabled={!selectedFile || processing.isProcessing || !isOcrInitialized}
            >
              {processing.isProcessing ? 'Processing...' : 'Process Image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 
import React, { useState, useEffect, useRef, useCallback } from 'react';
import CameraPanel from '../components/CameraPanel';
import PredictionCard from '../components/PredictionCard';
import RecognizedText from '../components/RecognizedText';
import ControlBar from '../components/ControlBar';
import { sendPredictionFrame, saveTranslationHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PREDICTION_INTERVAL_MS = 400; // Capture & predict ~2.5 frames/second
const STABLE_FRAMES_REQUIRED = 3;   // Hold gesture for ~1.2 seconds to commit

export default function Translator({ onNavigateToAuth }) {
  const { isAuthenticated } = useAuth();
  const cameraRef = useRef(null);
  const isProcessingRef = useRef(false);
  const intervalRef = useRef(null);

  // Stability & debouncing tracking
  const stabilityRef = useRef({ letter: null, count: 0 });
  const lastCommittedRef = useRef(null);
  const confidencesRef = useRef([]);

  // Component state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognitionPaused, setIsRecognitionPaused] = useState(false);

  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [currentConfidence, setCurrentConfidence] = useState(null);
  const [handDetected, setHandDetected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [recognizedText, setRecognizedText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Commit letter to recognized text
  const commitLetter = useCallback((letter, conf) => {
    setRecognizedText((prev) => prev + letter);
    if (typeof conf === 'number') {
      confidencesRef.current.push(conf);
    }
  }, []);

  // Frame processing loop
  const processFrame = useCallback(async () => {
    // Prevent overlapping in-flight requests or running when paused/inactive
    if (
      !isCameraActive ||
      isRecognitionPaused ||
      isProcessingRef.current ||
      !cameraRef.current
    ) {
      return;
    }

    const frameBase64 = cameraRef.current.captureFrame();
    if (!frameBase64) return;

    isProcessingRef.current = true;
    setIsAnalyzing(true);

    try {
      const result = await sendPredictionFrame(frameBase64);
      setApiError(null);

      if (result.success && result.hand_detected) {
        setHandDetected(true);
        const letter = result.prediction;
        const conf = result.confidence;

        setCurrentPrediction(letter);
        setCurrentConfidence(conf);

        // Stability debouncing logic
        if (letter && conf && conf >= 0.45) {
          if (stabilityRef.current.letter === letter) {
            stabilityRef.current.count += 1;
          } else {
            stabilityRef.current = { letter, count: 1 };
          }

          // Commit when stable threshold reached and not immediately duplicated
          if (
            stabilityRef.current.count === STABLE_FRAMES_REQUIRED &&
            lastCommittedRef.current !== letter
          ) {
            commitLetter(letter, conf);
            lastCommittedRef.current = letter;
          }
        }
      } else {
        // No hand detected in this frame
        setHandDetected(false);
        setCurrentPrediction(null);
        setCurrentConfidence(null);

        // Reset stability tracking and allow next gesture to commit
        stabilityRef.current = { letter: null, count: 0 };
        lastCommittedRef.current = null;
      }
    } catch (err) {
      console.warn('[Prediction Error]:', err.message || err);
      setApiError('Unable to connect to recognition service');
      setHandDetected(false);
      setCurrentPrediction(null);
      setCurrentConfidence(null);
      stabilityRef.current = { letter: null, count: 0 };
    } finally {
      isProcessingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [isCameraActive, isRecognitionPaused, commitLetter]);

  // Interval timer for live webcam frame prediction
  useEffect(() => {
    if (isCameraActive && !isRecognitionPaused) {
      intervalRef.current = setInterval(processFrame, PREDICTION_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsAnalyzing(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isCameraActive, isRecognitionPaused, processFrame]);

  // Handler functions
  const handleToggleCamera = () => {
    setIsCameraActive((prev) => {
      const next = !prev;
      if (!next) {
        // Reset prediction display when turning off camera
        setCurrentPrediction(null);
        setCurrentConfidence(null);
        setHandDetected(false);
        setApiError(null);
        stabilityRef.current = { letter: null, count: 0 };
        lastCommittedRef.current = null;
      }
      return next;
    });
  };

  const handleTogglePause = () => {
    setIsRecognitionPaused((prev) => !prev);
  };

  const handleAddSpace = () => {
    setRecognizedText((prev) => (prev ? prev + ' ' : prev));
    lastCommittedRef.current = ' ';
  };

  const handleBackspace = () => {
    setRecognizedText((prev) => prev.slice(0, -1));
  };

  const handleClearText = () => {
    setRecognizedText('');
    confidencesRef.current = [];
    stabilityRef.current = { letter: null, count: 0 };
    lastCommittedRef.current = null;
  };

  const handleSaveTranslation = async () => {
    const textToSave = recognizedText.trim();
    if (!textToSave) return;

    if (!isAuthenticated) {
      setSaveMessage({
        type: 'error',
        text: 'Please sign in to save translations to your account history.',
      });
      setTimeout(() => setSaveMessage(null), 4000);
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    let avgConf = 1.0;
    if (confidencesRef.current.length > 0) {
      const sum = confidencesRef.current.reduce((a, b) => a + b, 0);
      avgConf = Math.round((sum / confidencesRef.current.length) * 100) / 100;
    } else if (currentConfidence) {
      avgConf = Math.round(currentConfidence * 100) / 100;
    }

    try {
      await saveTranslationHistory({
        recognizedText: textToSave,
        averageConfidence: avgConf,
      });
      setSaveMessage({
        type: 'success',
        text: 'Translation saved to your history!',
      });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Could not save translation to database.';
      setSaveMessage({
        type: 'error',
        text: msg,
      });
      setTimeout(() => setSaveMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="translator-page">
      {/* Header Section */}
      <div className="page-header">
        <span className="page-header-eyebrow">Indian Sign Language</span>
        <h1 className="page-header-title">Real-time gesture recognition</h1>
        <p className="page-header-desc">
          Position your hand in front of the camera to translate Indian Sign Language (ISL) alphabet gestures into text using MediaPipe computer vision and machine learning.
        </p>
      </div>

      {/* Main Workspace */}
      <div className="translator-workspace">
        {/* Left Column: Webcam Card & Control Bar (60-65%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <CameraPanel
            ref={cameraRef}
            isCameraActive={isCameraActive}
            isRecognitionPaused={isRecognitionPaused}
            onStartCamera={() => setIsCameraActive(true)}
            onStopCamera={() => setIsCameraActive(false)}
          />

          <div className="camera-card-footer" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <ControlBar
              isCameraActive={isCameraActive}
              isRecognitionPaused={isRecognitionPaused}
              onToggleCamera={handleToggleCamera}
              onTogglePause={handleTogglePause}
              onAddSpace={handleAddSpace}
              onBackspace={handleBackspace}
              onClearText={handleClearText}
              hasText={recognizedText.length > 0}
            />
          </div>
        </div>

        {/* Right Column: Prediction Results & Recognized Text (35-40%) */}
        <div className="prediction-stack">
          <PredictionCard
            prediction={currentPrediction}
            confidence={currentConfidence}
            handDetected={handDetected}
            isAnalyzing={isAnalyzing}
            isCameraActive={isCameraActive}
            apiError={apiError}
          />

          <RecognizedText
            text={recognizedText}
            onClear={handleClearText}
            onAddSpace={handleAddSpace}
            onBackspace={handleBackspace}
            onSave={handleSaveTranslation}
            isSaving={isSaving}
            saveMessage={saveMessage}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </div>
  );
}

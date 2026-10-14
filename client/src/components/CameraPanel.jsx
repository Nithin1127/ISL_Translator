import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import StatusBadge from './StatusBadge';

/**
 * CameraPanel component handles webcam stream initialization,
 * rendering, permission error boundaries, and frame extraction.
 */
const CameraPanel = forwardRef(function CameraPanel(
  {
    isCameraActive,
    isRecognitionPaused,
    onStartCamera,
    onStopCamera,
  },
  ref
) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const isStartingRef = useRef(false);

  // Camera states: 'unstarted' | 'starting' | 'active' | 'stopped' | 'error'
  const [cameraState, setCameraState] = useState('unstarted');
  const [errorMessage, setErrorMessage] = useState(null);
  const [testImageSrc, setTestImageSrc] = useState(null);

  useEffect(() => {
    const handleSetFrame = (e) => {
      if (e.detail) {
        setTestImageSrc(e.detail);
        setCameraState('active');
        if (onStartCamera) onStartCamera();
      } else {
        setTestImageSrc(null);
      }
    };
    window.addEventListener('isl:set-test-frame', handleSetFrame);
    return () => window.removeEventListener('isl:set-test-frame', handleSetFrame);
  }, [onStartCamera]);

  // Expose frame capture method to parent component
  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (testImageSrc) {
        return testImageSrc;
      }
      if (typeof window !== 'undefined' && window.__ISL_TEST_FRAME__) {
        return window.__ISL_TEST_FRAME__;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        return null;
      }

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.85);
    },
  }));

  // Handle camera start
  const startStream = async () => {
    if (isStartingRef.current || (streamRef.current && cameraState === 'active')) {
      return;
    }

    isStartingRef.current = true;
    setCameraState('starting');
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support webcam video capture.');
      }

      console.log('[Camera] Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      console.log('[Camera] Permission granted');
      console.log('[Camera] Stream:', stream);
      console.log('[Camera] Video tracks:', stream.getVideoTracks());

      streamRef.current = stream;

      const video = videoRef.current;
      console.log('[Camera] Video element:', video);

      if (!video) {
        throw new Error('Video element reference is not available.');
      }

      video.srcObject = stream;

      console.log(
        '[Camera] Video dimensions (initial):',
        video.videoWidth,
        video.videoHeight
      );

      // Wait for loadedmetadata before starting playback
      await new Promise((resolve) => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolve();
          return;
        }

        let timeoutId;
        const handleMetadata = () => {
          clearTimeout(timeoutId);
          video.onloadedmetadata = null;
          console.log('[Camera] loadedmetadata event fired');
          resolve();
        };

        video.onloadedmetadata = handleMetadata;

        timeoutId = setTimeout(() => {
          video.onloadedmetadata = null;
          console.warn('[Camera] loadedmetadata wait timed out, continuing to play');
          resolve();
        }, 3000);
      });

      // Explicitly start playback
      try {
        await video.play();
        console.log('[Camera] Video playback started successfully');
      } catch (error) {
        console.error('[Camera] Video playback failed:', error);
        throw error;
      }

      console.log(
        '[Camera] Video dimensions:',
        video.videoWidth,
        video.videoHeight
      );
      console.log(
        '[Camera] Video readyState:',
        video.readyState,
        'paused:',
        video.paused
      );

      setCameraState('active');
      if (onStartCamera) onStartCamera();
    } catch (err) {
      console.warn('[Camera] Stream initialization error:', err.name, err.message);
      setCameraState('error');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser URL bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device was detected on your computer.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage('Camera is currently in use by another application.');
      } else {
        setErrorMessage(err.message || 'Unable to access camera.');
      }

      if (onStopCamera) onStopCamera();
    } finally {
      isStartingRef.current = false;
    }
  };

  // Handle camera stop
  const stopStream = () => {
    console.log('[Camera] Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      videoRef.current.srcObject = null;
    }

    setCameraState('stopped');
    setTestImageSrc(null);
    if (typeof window !== 'undefined') {
      window.__ISL_TEST_FRAME__ = null;
    }
    if (onStopCamera) onStopCamera();
  };

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('[Camera] Cleaning up camera on component unmount...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // Sync external camera active prop
  useEffect(() => {
    if (isCameraActive) {
      if (cameraState !== 'active' && cameraState !== 'starting') {
        startStream();
      }
    } else {
      if (cameraState === 'active' || cameraState === 'starting') {
        stopStream();
      }
    }
  }, [isCameraActive]);

  // Determine badge status
  let badgeStatus = 'inactive';
  let badgeLabel = 'Camera Off';
  if (cameraState === 'active') {
    badgeStatus = isRecognitionPaused ? 'paused' : 'active';
    badgeLabel = isRecognitionPaused ? 'Recognition Paused' : 'Camera & Recognition Active';
  } else if (cameraState === 'starting') {
    badgeStatus = 'paused';
    badgeLabel = 'Starting Camera...';
  } else if (cameraState === 'error') {
    badgeStatus = 'error';
    badgeLabel = 'Camera Error';
  }

  return (
    <div className="camera-card">
      <div className="camera-card-header">
        <div className="camera-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          Live Camera Feed
        </div>
        <StatusBadge status={badgeStatus} label={badgeLabel} />
      </div>

      <div className="camera-viewport-container">
        {/* Live Video Element */}
        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
        />

        {/* Test gesture preview overlay when testing */}
        {testImageSrc && (
          <img
            src={testImageSrc}
            alt="Simulated ISL Hand Gesture"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#03060c',
              zIndex: 3,
            }}
          />
        )}

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* State 1: Unstarted / Stopped */}
        {(cameraState === 'unstarted' || cameraState === 'stopped') && (
          <div className="camera-placeholder">
            <div className="camera-placeholder-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
            <h3 className="camera-placeholder-title">Start Your Camera</h3>
            <p className="camera-placeholder-text">
              Position your hand clearly inside the frame to begin real-time gesture recognition.
            </p>
            <button
              className="btn btn-primary"
              onClick={startStream}
              type="button"
            >
              Start Camera
            </button>
          </div>
        )}

        {/* State 2: Starting */}
        {cameraState === 'starting' && (
          <div className="camera-placeholder">
            <div className="camera-placeholder-icon">
              <span className="status-dot" style={{ width: 16, height: 16, background: 'var(--accent-blue)' }} />
            </div>
            <h3 className="camera-placeholder-title">Connecting to Camera</h3>
            <p className="camera-placeholder-text">Please allow browser camera permissions if prompted.</p>
          </div>
        )}

        {/* State 3: Error / Permission Denied */}
        {cameraState === 'error' && (
          <div className="camera-placeholder">
            <div className="camera-placeholder-icon" style={{ borderColor: 'rgba(244,63,94,0.3)', color: 'var(--accent-rose)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 className="camera-placeholder-title">Camera Permission Required</h3>
            <p className="camera-placeholder-text" style={{ color: 'var(--accent-rose)' }}>
              {errorMessage}
            </p>
            <button
              className="btn btn-primary"
              onClick={startStream}
              type="button"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default CameraPanel;

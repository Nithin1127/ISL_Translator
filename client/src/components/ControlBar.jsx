import React from 'react';

export default function ControlBar({
  isCameraActive,
  isRecognitionPaused,
  onToggleCamera,
  onTogglePause,
  onAddSpace,
  onBackspace,
  onClearText,
  hasText,
}) {
  return (
    <div className="control-bar" role="toolbar" aria-label="Translator Controls">
      {/* Camera Toggle */}
      <button
        className={`btn ${isCameraActive ? 'btn-danger' : 'btn-primary'}`}
        onClick={onToggleCamera}
        type="button"
      >
        {isCameraActive ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            Stop Camera
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            Start Camera
          </>
        )}
      </button>

      {/* Recognition Pause / Resume (Only when camera is active) */}
      {isCameraActive && (
        <button
          className="btn btn-secondary"
          onClick={onTogglePause}
          type="button"
          aria-label={isRecognitionPaused ? 'Resume Recognition' : 'Pause Recognition'}
        >
          {isRecognitionPaused ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Resume Recognition
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              Pause Recognition
            </>
          )}
        </button>
      )}

      {/* Text Modification Shortcuts */}
      <button
        className="btn btn-secondary"
        onClick={onAddSpace}
        type="button"
        disabled={!hasText}
        title="Add space between words"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
        </svg>
        Space
      </button>

      <button
        className="btn btn-secondary"
        onClick={onBackspace}
        type="button"
        disabled={!hasText}
        title="Remove last character"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0 2-2z"></path>
          <line x1="18" y1="9" x2="12" y2="15"></line>
          <line x1="12" y1="9" x2="18" y2="15"></line>
        </svg>
        Backspace
      </button>

      <button
        className="btn btn-secondary"
        onClick={onClearText}
        type="button"
        disabled={!hasText}
        title="Clear all accumulated text"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        Clear Text
      </button>
    </div>
  );
}

import React from 'react';

/**
 * PredictionCard displays the recognized ISL sign, confidence level,
 * hand detection status, and user guidance.
 */
export default function PredictionCard({
  prediction,
  confidence,
  handDetected,
  isAnalyzing,
  isCameraActive,
  apiError,
}) {
  // Convert confidence float (e.g. 0.916) to rounded percentage
  const confidencePercent =
    typeof confidence === 'number' && !isNaN(confidence)
      ? Math.round(confidence * 100)
      : null;

  return (
    <section className="prediction-card" aria-label="Sign Prediction Results">
      <div className="prediction-header">
        <span className="prediction-title">Current Sign</span>
        {isAnalyzing && (
          <span
            style={{
              fontSize: '0.78rem',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span
              className="status-dot"
              style={{
                width: 6,
                height: 6,
                backgroundColor: 'var(--accent-cyan)',
              }}
            />
            Analyzing...
          </span>
        )}
      </div>

      <div className="prediction-body">
        {/* State 1: Backend / Network Error */}
        {apiError ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                color: 'var(--accent-rose)',
                marginBottom: '0.5rem',
                fontSize: '1.75rem',
              }}
            >
              ⚠️
            </div>
            <p style={{ color: 'var(--accent-rose)', fontWeight: 600, fontSize: '0.92rem' }}>
              Unable to connect to recognition service
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
              Please ensure the backend gateway and AI service are active.
            </p>
          </div>
        ) : !isCameraActive ? (
          /* State 2: Camera not started */
          <div className="prediction-idle-text">
            <p>Start camera to begin sign recognition</p>
          </div>
        ) : !handDetected ? (
          /* State 3: Camera active but no hand in frame */
          <div className="prediction-idle-text" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✋</div>
            <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              Show your hand in the camera
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Ensure your hand is clearly visible and well-lit.
            </p>
          </div>
        ) : (
          /* State 4: Hand Detected and Valid Prediction */
          <>
            <div className="prediction-letter-display" aria-live="polite">
              {prediction || '—'}
            </div>

            {/* Confidence Progress Bar */}
            <div className="confidence-section">
              <div className="confidence-header">
                <span>Confidence</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {confidencePercent !== null ? `${confidencePercent}%` : 'N/A'}
                </span>
              </div>
              <div className="confidence-bar-bg" role="progressbar" aria-valuenow={confidencePercent || 0} aria-valuemin="0" aria-valuemax="100">
                <div
                  className="confidence-bar-fill"
                  style={{
                    width: `${confidencePercent || 0}%`,
                    background:
                      confidencePercent > 80
                        ? 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))'
                        : confidencePercent > 50
                        ? 'linear-gradient(90deg, var(--accent-amber), var(--accent-blue))'
                        : 'var(--text-muted)',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Meta Footer */}
      <div className="prediction-meta-footer">
        <span>Hand Status:</span>
        <span
          style={{
            fontWeight: 600,
            color: handDetected ? 'var(--accent-emerald)' : 'var(--text-muted)',
          }}
        >
          {handDetected ? '● Hand Detected' : '○ No Hand Detected'}
        </span>
      </div>
    </section>
  );
}

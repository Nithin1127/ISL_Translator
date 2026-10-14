import React from 'react';

export default function Home({ onStartTranslating }) {
  return (
    <div className="home-page">
      {/* Hero Banner */}
      <section className="hero-banner">
        <span className="hero-eyebrow">Accessibility & Computer Vision</span>
        <h1 className="hero-title">
          Indian Sign Language <br />
          <span className="hero-title-gradient">Real-Time Gesture Recognition</span>
        </h1>
        <p className="hero-subtitle">
          Translate Indian Sign Language alphabet gestures into accessible digital text in real-time using MediaPipe 3D hand tracking and machine learning.
        </p>

        <div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', borderRadius: 'var(--radius-lg)' }}
            onClick={onStartTranslating}
          >
            <span>Start Translating</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </section>

      {/* 3-Step Process Cards */}
      <section style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          How It Works
        </h2>

        <div className="feature-grid">
          <div className="feature-card">
            <span className="feature-step-num">Step 01</span>
            <h3 className="feature-card-title">Show Your Hand</h3>
            <p className="feature-card-text">
              Enable your webcam and position your hand naturally in the frame under standard ambient lighting.
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-step-num">Step 02</span>
            <h3 className="feature-card-title">Detect Hand Landmarks</h3>
            <p className="feature-card-text">
              MediaPipe extracts 21 three-dimensional skeletal landmarks, invariant to hand position and scale.
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-step-num">Step 03</span>
            <h3 className="feature-card-title">Recognize the Sign</h3>
            <p className="feature-card-text">
              A trained Random Forest classifier classifies 63 normalized coordinates into A–Z alphabet signs with high confidence.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

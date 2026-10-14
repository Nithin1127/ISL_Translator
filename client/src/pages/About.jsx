import React from 'react';

export default function About() {
  return (
    <div className="about-page" style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div className="page-header">
        <span className="page-header-eyebrow">Project Overview</span>
        <h1 className="page-header-title">About ISL Translator</h1>
        <p className="page-header-desc">
          An accessible web platform designed to bridge communication gaps by translating Indian Sign Language (ISL) alphabet gestures into digital text in real-time.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Purpose */}
        <div className="feature-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-cyan)' }}>
            Mission & Accessibility
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Indian Sign Language (ISL) is the primary mode of communication for millions of deaf and hard-of-hearing individuals across India. Despite its cultural and linguistic importance, assistive digital tools remain limited. This project provides a real-time vision-based translation tool that recognizes individual static alphabet signs (A–Z) directly within a standard web browser.
          </p>
        </div>

        {/* Technical Pipeline */}
        <div className="feature-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-blue)' }}>
            Technical Architecture
          </h2>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.92rem' }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Computer Vision Pipeline:</strong> Uses Google MediaPipe Hands to detect human hands and extract 21 3D spatial landmarks (wrist, thumb, index, middle, ring, pinky).
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Feature Engineering:</strong> The 21 coordinates are normalized relative to the wrist and scaled by the maximum bounding dimension, yielding a translation- and scale-invariant 63-dimensional feature vector.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Machine Learning Classifier:</strong> A Scikit-learn Random Forest classifier trained on over 16,000 preprocessed ISL gesture images classifies hand shapes into A–Z alphabet characters.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Full-Stack Microservices:</strong> Modern React + Vite frontend communicates with a Node.js/Express API Gateway, which securely routes prediction frames to a high-performance Python FastAPI service.
            </li>
          </ul>
        </div>

        {/* Current Scope & Limitations */}
        <div className="feature-card" style={{ borderLeft: '4px solid var(--accent-indigo)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Scope & Continuous Improvement
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.92rem' }}>
            The current system specializes in static one-handed and two-handed alphabet gestures (A–Z). It does not claim full natural-language sentence or dynamic sign recognition. Ongoing enhancements focus on expanded vocabulary, temporal gesture sequencing, and database session history.
          </p>
        </div>
      </div>
    </div>
  );
}

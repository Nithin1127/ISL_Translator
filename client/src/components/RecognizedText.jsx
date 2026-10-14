import React, { useState } from 'react';

/**
 * RecognizedText displays the accumulated string of recognized signs
 * with formatting, cursor, and management actions (space, backspace, clear, copy).
 */
export default function RecognizedText({
  text,
  onClear,
  onAddSpace,
  onBackspace,
  onSave,
  isSaving,
  saveMessage,
  isAuthenticated,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  const handleSpeak = () => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className="text-card" aria-label="Recognized Text Workspace">
      <div className="text-card-header">
        <span className="text-card-title">Recognized Text</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {text.length} {text.length === 1 ? 'character' : 'characters'}
        </span>
      </div>

      <div className="text-output-display" aria-live="polite">
        {text ? (
          <>
            <span>{text}</span>
            <span className="cursor-blink" aria-hidden="true" />
          </>
        ) : (
          <span className="text-empty-prompt">
            Recognized signs will accumulate here as you hold gestures...
          </span>
        )}
      </div>

      {saveMessage && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            backgroundColor: saveMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            color: saveMessage.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            border: `1px solid ${saveMessage.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
          }}
        >
          {saveMessage.text}
        </div>
      )}

      <div className="text-card-actions">
        {/* Speak Audio */}
        {'speechSynthesis' in window && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSpeak}
            disabled={!text}
            title="Read out recognized text"
            aria-label="Text to speech"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Speak
          </button>
        )}

        {/* Copy to Clipboard */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCopy}
          disabled={!text}
          title="Copy text to clipboard"
        >
          {copied ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-emerald)' }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy
            </>
          )}
        </button>

        {/* Save Translation */}
        {onSave && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onSave}
            disabled={!text || isSaving}
            title={isAuthenticated ? 'Save translation to MongoDB History' : 'Sign in to save translation to history'}
          >
            {isSaving ? (
              'Saving...'
            ) : saveMessage?.type === 'success' ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-emerald)' }}>
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Saved!
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save
              </>
            )}
          </button>
        )}

        {/* Clear Text */}
        <button
          type="button"
          className="btn btn-danger"
          onClick={onClear}
          disabled={!text}
          title="Clear all recognized text"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Clear Text
        </button>
      </div>
    </section>
  );
}


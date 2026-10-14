import React, { useState, useEffect } from 'react';
import { fetchTranslationHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function History({ onNavigateToTranslator, onNavigateToAuth }) {
  const { isAuthenticated, user } = useAuth();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadHistory = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchTranslationHistory();
      if (data && data.history) {
        setHistoryItems(data.history);
      } else {
        setHistoryItems([]);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Could not load translation history. Please check database connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated]);

  return (
    <div className="history-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="page-header-eyebrow">Session Logs</span>
          <h1 className="page-header-title">Recognition History</h1>
          <p className="page-header-desc">
            Review your previously saved Indian Sign Language translations and confidence metrics.
          </p>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadHistory}
            disabled={loading}
            title="Refresh history records"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Case 1: User is not logged in */}
      {!isAuthenticated && (
        <div className="empty-state-card">
          <div className="empty-state-icon" aria-hidden="true">
            🔒
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Authentication Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Sign in to your account to record and view your personal translation history.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNavigateToAuth}
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Case 2: Loading State */}
      {isAuthenticated && loading && historyItems.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-state-icon" aria-hidden="true">
            ⏳
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Loading your saved translations from database...
          </p>
        </div>
      )}

      {/* Case 3: Error State */}
      {isAuthenticated && error && (
        <div className="empty-state-card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
          <div className="empty-state-icon" aria-hidden="true" style={{ color: 'var(--accent-rose)' }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-rose)' }}>
            Database Error
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {error}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadHistory}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Case 4: Authenticated, no records found */}
      {isAuthenticated && !loading && !error && historyItems.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-state-icon" aria-hidden="true">
            🕒
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No Saved Translations Yet
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            You haven't saved any translations yet. Perform gestures in the Translator and click "Save" to build your history log.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNavigateToTranslator}
          >
            Go to Translator
          </button>
        </div>
      )}

      {/* Case 5: Authenticated with records */}
      {isAuthenticated && !error && historyItems.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <span>Showing <strong>{historyItems.length}</strong> saved {historyItems.length === 1 ? 'translation' : 'translations'} for <strong>{user?.name || 'User'}</strong></span>
          </div>

          <div className="history-grid">
            {historyItems.map((item) => {
              const confPct = Math.round((item.averageConfidence ?? 1) * 100);
              const formattedDate = item.createdAt
                ? new Date(item.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Just now';

              return (
                <div key={item._id} className="history-card">
                  <div className="history-card-header">
                    <span
                      className="status-badge active"
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    >
                      <span className="status-dot" />
                      Confidence: {confPct}%
                    </span>
                  </div>

                  <div className="history-text">
                    {item.recognizedText}
                  </div>

                  <div className="history-card-footer">
                    <span>{formattedDate}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ID: {item._id.substring(item._id.length - 6)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

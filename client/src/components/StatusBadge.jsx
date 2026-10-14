import React from 'react';

/**
 * Reusable StatusBadge component
 * @param {string} status - 'active' | 'paused' | 'inactive' | 'error'
 * @param {string} label - Text to display next to dot
 */
export default function StatusBadge({ status = 'inactive', label }) {
  return (
    <div className={`status-badge ${status}`} role="status">
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  );
}

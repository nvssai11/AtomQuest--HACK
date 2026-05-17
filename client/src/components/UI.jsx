import React, { useState } from 'react';

export const Badge = ({ children, variant = 'brand', tooltip }) => {
  return (
    <span className={`badge badge-${variant}`} title={tooltip || undefined}>
      {children}
    </span>
  );
};

export const ProgressBar = ({ progress, variant = 'brand', showLabel = false }) => {
  const clamped = Math.min(Math.max(progress, 0), 100);
  let fillColor = 'var(--brand-500)';
  if (variant === 'success' || clamped >= 100) fillColor = 'var(--success)';
  if (variant === 'warning' || (clamped > 0 && clamped < 50)) fillColor = 'var(--warning)';
  if (variant === 'danger' || clamped === 0) fillColor = 'var(--danger)';

  return (
    <div className="progress-bar-track">
      <div
        className="progress-bar-fill"
        style={{ width: `${clamped}%`, backgroundColor: fillColor }}
      />
      {showLabel && (
        <span className="progress-bar-label">{clamped}%</span>
      )}
    </div>
  );
};
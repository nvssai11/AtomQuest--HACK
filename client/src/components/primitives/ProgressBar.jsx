import React from 'react';

const ProgressBar = ({ progress, variant = 'brand', showLabel = false, className = '' }) => {
  const clamped = Math.min(Math.max(progress, 0), 100);
  
  const colors = {
    brand: 'bg-brand-500',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger'
  };

  const bgColor = colors[variant] || colors.brand;

  return (
    <div className={`w-full bg-bg-secondary rounded-full h-2.5 overflow-hidden border border-border-color ${className}`}>
      <div
        className={`h-full rounded-full ${bgColor} transition-all duration-500 ease-out`}
        style={{ width: `${clamped}%` }}
      ></div>
      {showLabel && (
        <div className="mt-1 text-xs text-text-secondary text-right">{clamped}%</div>
      )}
    </div>
  );
};

export default ProgressBar;

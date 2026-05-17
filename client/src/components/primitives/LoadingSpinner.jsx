/* src/components/primitives/LoadingSpinner.jsx */
import React from 'react';
/**
 * Simple CSS‑based spinner.
 * Props:
 *   size: 'sm' | 'md' | 'lg' (controls width/height)
 */
const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  const classes = `${sizeMap[size] || sizeMap.md} border-2 border-brand-500 border-t-transparent rounded-full animate-spin ${className}`.trim();
  return <div className={classes} aria-label="Loading" />;
};

export default LoadingSpinner;

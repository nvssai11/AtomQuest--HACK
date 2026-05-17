/* src/components/primitives/EmptyState.jsx */
import React from 'react';

const EmptyState = ({ title, description, icon = '📂', className = '' }) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">{icon}</div>
        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
        {description && <p className="text-text-secondary max-w-sm mx-auto">{description}</p>}
      </div>
    </div>
  );
};

export default EmptyState;

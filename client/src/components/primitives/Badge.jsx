import React from 'react';

const Badge = ({ children, variant = 'brand', className }) => {
  const map = {
    brand: 'badge badge-brand',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
  };
  return <span className={`${map[variant] || map.brand} ${className || ''}`}>{children}</span>;
};

export default Badge;

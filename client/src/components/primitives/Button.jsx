import React from 'react';
const VARIANT_CLASS = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger',
  success: 'btn btn-success',
};

const Button = ({ children, variant = 'primary', className, ...rest }) => {
  const classes = `${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} ${className || ''}`.trim();
  return <button className={classes} {...rest}>{children}</button>;
};

export default Button;

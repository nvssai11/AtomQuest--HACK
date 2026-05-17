import React from 'react';

const Input = React.forwardRef(({ label, id, className, error, as, children, ...props }, ref) => {
  const baseClass = `input-field ${error ? 'border-danger' : ''}`;

  let inputElement = <input id={id} ref={ref} className={baseClass} {...props} />;

  if (as === 'textarea') {
    inputElement = <textarea id={id} ref={ref} className={baseClass} {...props} />;
  } else if (as === 'select') {
    inputElement = (
      <select id={id} ref={ref} className={baseClass} {...props}>
        {children}
      </select>
    );
  }

  return (
    <div className={`input-group ${className || ''}`}>
      {label && <label className="input-label" htmlFor={id}>{label}</label>}
      {inputElement}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
});

export default Input;

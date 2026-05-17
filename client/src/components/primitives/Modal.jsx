import React, { useEffect, useRef } from 'react';

const Modal = ({ open, isOpen, onClose, size = 'md', children, ariaLabelledBy, title }) => {
  const ref = useRef(null);
  const isCurrentlyOpen = open || isOpen;

  useEffect(() => {
    if (!isCurrentlyOpen) return;
    const focusable = ref.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [];
    if (focusable.length) focusable[0].focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isCurrentlyOpen, onClose]);

  if (!isCurrentlyOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={ariaLabelledBy} className={`modal-container modal-${size}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">&times;</button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

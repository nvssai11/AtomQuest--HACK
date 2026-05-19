import React, { useEffect, useRef } from 'react';

const Modal = ({ open, isOpen, onClose, size = 'md', children, ariaLabelledBy, title }) => {
  const ref = useRef(null);
  const isCurrentlyOpen = open || isOpen;

  useEffect(() => {
    if (isCurrentlyOpen) {
      const focusable = ref.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [];
      if (focusable.length) {
        // Only focus if active element is outside the modal to prevent resetting cursor
        if (!ref.current.contains(document.activeElement)) {
          focusable[0].focus();
        }
      }
    }
  }, [isCurrentlyOpen]);

  useEffect(() => {
    if (!isCurrentlyOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isCurrentlyOpen, onClose]);

  if (!isCurrentlyOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose && onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={ariaLabelledBy} className={`modal-container modal-${size}`}>
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

import React from 'react';
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const ICONS = {
  success: FaCheckCircle,
  error: FaExclamationTriangle,
  warning: FaExclamationTriangle,
  info: FaInfoCircle,
};

const NotificationToast = ({ notifications, onDismiss }) => {
  return (
    <div className="toast-root">
      {notifications.map((notification) => {
        const Icon = ICONS[notification.type] || ICONS.info;

        return (
          <div key={notification.id} className={`toast-card toast-${notification.type}`}>
            <div className="toast-body">
              <div className="toast-icon-wrap">
                <Icon className="toast-icon" />
              </div>
              <div className="toast-copy">
                {notification.title && <p className="toast-title">{notification.title}</p>}
                <p className="toast-message">{notification.message}</p>
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={() => onDismiss(notification.id)}
                aria-label="Dismiss notification"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationToast;

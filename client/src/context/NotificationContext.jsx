import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import NotificationToast from '../components/NotificationToast';

const NotificationContext = createContext({ notify: null });

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const addNotification = useCallback((type, message, title = '', duration = 5000) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setNotifications((current) => [...current, { id, type, title, message }]);
    window.setTimeout(() => removeNotification(id), duration);
  }, [removeNotification]);

  const notify = useMemo(() => ({
    success: (message, title = 'Success', duration = 5000) => addNotification('success', message, title, duration),
    error: (message, title = 'Error', duration = 7000) => addNotification('error', message, title, duration),
    warning: (message, title = 'Warning', duration = 6000) => addNotification('warning', message, title, duration),
    info: (message, title = 'Info', duration = 5000) => addNotification('info', message, title, duration),
  }), [addNotification]);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <NotificationToast notifications={notifications} onDismiss={removeNotification} />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

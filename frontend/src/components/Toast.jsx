import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const Toast = ({ message, type, onDismiss }) => {
  const icons = {
    success: <CheckCircle className="text-green-500" />,
    info: <Info className="text-teal-500" />,
    warning: <AlertTriangle className="text-amber-500" />,
  };

  const colors = {
    success: 'border-green-500',
    info: 'border-teal-500',
    warning: 'border-amber-500',
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`flex items-center bg-gray-800 border-l-4 ${colors[type]} text-white p-4 rounded-lg shadow-lg animate-slide-in-right`}>
      <div className="mr-3">{icons[type]}</div>
      <div className="flex-1">{message}</div>
      <button onClick={onDismiss} className="ml-4 text-gray-400 hover:text-white">
        <X size={18} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[2000] space-y-3">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

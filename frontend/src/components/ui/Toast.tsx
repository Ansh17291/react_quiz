import React, { useState, useCallback, createContext, useContext } from 'react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

const ToastContext = createContext<{
    addToast: (message: string, type: Toast['type']) => void;
} | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type, duration: 3000 }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
    const bgColor = {
        success: 'bg-green-900 border-green-700',
        error: 'bg-red-900 border-red-700',
        info: 'bg-blue-900 border-blue-700',
        warning: 'bg-yellow-900 border-yellow-700',
    }[toast.type];

    const textColor = {
        success: 'text-green-200',
        error: 'text-red-200',
        info: 'text-blue-200',
        warning: 'text-yellow-200',
    }[toast.type];

    const icon = {
        success: '✓',
        error: '✕',
        info: 'ⓘ',
        warning: '⚠',
    }[toast.type];

    return (
        <div className={`${bgColor} border rounded-lg p-3 flex items-center gap-2 min-w-80 animate-slideIn`}>
            <span className="text-lg">{icon}</span>
            <span className={textColor}>{toast.message}</span>
        </div>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

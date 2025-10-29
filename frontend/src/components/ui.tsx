import React, { useState, createContext, useContext } from 'react';
import ReactDOM from 'react-dom';

type ButtonProps<C extends React.ElementType> = {
  as?: C;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
} & React.ComponentPropsWithoutRef<C>;

export const Button = <C extends React.ElementType = 'button'>({
  as,
  variant = 'primary',
  children,
  ...props
}: ButtonProps<C>) => {
  const Component = as || 'button';
  
  const baseClasses = 'px-4 py-2 rounded-md font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transform active:scale-95 hover:scale-[1.03]';
  
  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-slate-600 hover:bg-slate-700 focus:ring-slate-500',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <Component className={`${baseClasses} ${variantClasses[variant]}`} {...props}>
      {children}
    </Component>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-slate-800 shadow-lg rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
};

export const Spinner = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
                        <button onClick={onClose} className="text-slate-500 text-3xl leading-none hover:text-slate-200">&times;</button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Toast Functionality ---
type ToastType = 'success' | 'error' | 'info';
interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (message: string, type: ToastType) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
        }, 5000);
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {ReactDOM.createPortal(
                toasts.map(toast => <Toast key={toast.id} {...toast} />),
                document.getElementById('toast-container')!
            )}
        </ToastContext.Provider>
    );
}

const Toast: React.FC<ToastMessage> = ({ message, type }) => {
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600',
    };
    return (
        <div className={`text-white px-6 py-3 rounded-md shadow-lg ${colors[type]}`}>
            {message}
        </div>
    );
};

// --- Tabs Functionality ---
interface TabsProps {
    tabs: string[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
    return (
        <div className="border-b border-slate-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`${
                            activeTab === tab
                                ? 'border-primary-500 text-primary-500'
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        {tab}
                    </button>
                ))}
            </nav>
        </div>
    );
};
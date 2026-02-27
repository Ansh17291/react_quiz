import React, { useState, createContext, useContext } from "react";
import ReactDOM from "react-dom";

// ─── Button ─────────────────────────────────────────────────────────────────
type ButtonProps<C extends React.ElementType> = {
  as?: C;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
} & React.ComponentPropsWithoutRef<C>;

export const Button = <C extends React.ElementType = "button">({
  as,
  variant = "primary",
  children,
  className,
  ...props
}: ButtonProps<C>) => {
  const Component = as || "button";

  const base =
    "px-4 py-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 active:scale-95 hover:scale-[1.02] text-sm";

  const variants: Record<string, string> = {
    primary:
      "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[var(--shadow-sm)] focus:ring-[var(--accent)]",
    secondary:
      "bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] focus:ring-[var(--accent)]",
    danger:
      "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    ghost:
      "bg-transparent hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] focus:ring-[var(--accent)]",
  };

  return (
    <Component
      className={`${base} ${variants[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </Component>
  );
};

// ─── Card ────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = "", style, ...props }) => (
  <div
    className={`bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)] rounded-xl p-6 theme-transition ${className}`}
    style={style}
    {...props}
  >
    {children}
  </div>
);

// ─── Spinner ─────────────────────────────────────────────────────────────────
export const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--accent)]" />
);

// ─── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-start p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-top-4 duration-300 pointer-events-auto mt-16 theme-transition"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--border)] sticky top-0 z-10 bg-[var(--surface)]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text)] w-8 h-8 rounded-full flex items-center justify-center text-xl leading-none hover:bg-[var(--surface-2)] transition-colors"
            >
              &times;
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar text-[var(--text)]">{children}</div>
      </div>
    </div>
  );
};

// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastMessage { id: number; message: string; type: ToastType; }
interface ToastContextType { addToast: (message: string, type: ToastType) => void; }

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 5000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {ReactDOM.createPortal(
        toasts.map((toast) => <Toast key={toast.id} {...toast} />),
        document.getElementById("toast-container")!
      )}
    </ToastContext.Provider>
  );
};

const Toast: React.FC<ToastMessage> = ({ message, type }) => {
  const colors: Record<ToastType, string> = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    info: "bg-[var(--accent)]",
  };
  return (
    <div className={`text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${colors[type]} animate-slideIn`}>
      {message}
    </div>
  );
};

// ─── Tabs ────────────────────────────────────────────────────────────────────
interface TabsProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => (
  <div className="border-b border-[var(--border)]">
    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`${activeTab === tab
            ? "border-[var(--accent)] text-[var(--accent)] font-semibold"
            : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-2)]"
            } whitespace-nowrap py-3 px-1 border-b-2 text-sm transition-all duration-200`}
        >
          {tab}
        </button>
      ))}
    </nav>
  </div>
);

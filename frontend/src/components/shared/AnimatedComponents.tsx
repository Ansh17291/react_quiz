import React, { useState, useEffect } from 'react';

export const AnimatedWrapper: React.FC<{ children?: React.ReactNode, className?: string, style?: React.CSSProperties }> = ({ children, className = '', style }) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        // Delay slightly to ensure transition is visible on mount
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`} style={style}>
            {children}
        </div>
    );
};

export const StaggeredList: React.FC<{ children?: React.ReactNode, className?: string, style?: React.CSSProperties }> = ({ children, className = '', style }) => {
    return (
        <div className={className} style={style}>
            {React.Children.map(children, (child, index) => (
                <div
                    className="transition-all duration-500 ease-out opacity-0 translate-y-3"
                    style={{ animation: `fadeInUp 500ms ease-out ${index * 100}ms forwards` }}
                >
                    {child}
                </div>
            ))}
            <style>{`
                @keyframes fadeInUp {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

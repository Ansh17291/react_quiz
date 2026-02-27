import React, { useState } from 'react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarIcon
} from '../Icons';

interface CalendarEvent {
    date: Date;
    title: string;
    type?: 'quiz' | 'poll' | 'other';
    color?: string;
    onClick?: () => void;
}

interface CalendarProps {
    events: CalendarEvent[];
    onDateClick?: (date: Date) => void;
    className?: string;
    compact?: boolean;
}

const Calendar: React.FC<CalendarProps> = ({ events, onDateClick, className = "", compact = false }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    // Padding for start of month
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`pad-${i}`} className={`${compact ? 'h-16 md:h-20' : 'h-24 md:h-32'} bg-transparent border-t border-l border-[var(--border)] opacity-30`} />);
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
        const date = new Date(year, month, d);
        const isToday = date.getTime() === today.getTime();

        const dayEvents = events.filter(e => {
            const eDate = new Date(e.date);
            return eDate.getDate() === d && eDate.getMonth() === month && eDate.getFullYear() === year;
        });

        days.push(
            <div
                key={d}
                onClick={() => onDateClick?.(date)}
                className={`${compact ? 'h-16 md:h-20' : 'h-24 md:h-32'} p-1 md:p-2 border-t border-l border-[var(--border)] transition-colors hover:bg-[var(--surface-3)] cursor-pointer relative group ${isToday ? 'bg-[var(--accent)]/5' : 'bg-[var(--surface-2)]/30'}`}
            >
                <span className={`${compact ? 'text-[10px]' : 'text-xs md:text-sm'} font-medium ${isToday ? 'bg-[var(--accent)] text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center p-0 mb-1' : 'text-[var(--text-muted)]'}`}>
                    {d}
                </span>
                <div className="mt-0.5 space-y-0.5 overflow-y-auto max-h-[calc(100%-20px)] custom-scrollbar">
                    {dayEvents.map((event, idx) => (
                        <div
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); event.onClick?.(); }}
                            className={`text-[9px] md:text-[10px] p-1 rounded truncate border leading-none font-medium theme-transition shadow-sm ${event.type === 'quiz' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                } hover:brightness-125`}
                            title={event.title}
                        >
                            • {event.title}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xl theme-transition ${className}`}>
            {/* Calendar Header */}
            <div className={`flex items-center justify-between ${compact ? 'p-2 md:p-3' : 'p-4 md:p-6'} bg-[var(--surface-2)] border-b border-[var(--border)]`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--accent)]/10 rounded-xl">
                        <CalendarIcon className="w-5 h-5 text-[var(--accent)]" />
                    </div>
                    <h2 className={`${compact ? 'text-sm md:text-base' : 'text-xl md:text-2xl'} font-bold text-[var(--text)]`}>
                        {monthNames[month]} <span className="text-[var(--text-muted)] font-normal">{year}</span>
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors border border-[var(--border)]"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-3)] rounded-lg transition-colors border border-[var(--border)]"
                    >
                        Today
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-[var(--surface-3)] rounded-lg transition-colors border border-[var(--border)]"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* WeekDays Header */}
            <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-2)]/50">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className={`${compact ? 'py-1' : 'py-3'} text-center text-[10px] md:text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-l border-[var(--border)] first:border-l-0`}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 border-r border-b border-[var(--border)]">
                {days}
            </div>
        </div>
    );
};

export default Calendar;

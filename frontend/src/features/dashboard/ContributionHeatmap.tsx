import React, { useMemo } from 'react';
import type { QuizResult } from '../../types';

export const ContributionHeatmap = ({ results }: { results: QuizResult[] }) => {
    // These values are stable for the lifetime of the component
    const today = useMemo(() => new Date(), []);
    const startDate = useMemo(() => {
        const date = new Date(today);
        date.setFullYear(date.getFullYear() - 1);
        date.setDate(date.getDate() + 1);
        return date;
    }, [today]);

    const contributions: Record<string, number> = useMemo(() => {
        const map: Record<string, number> = {};
        results.forEach(r => {
            const dateStr = new Date(r.submittedAt).toISOString().split('T')[0];
            map[dateStr] = (map[dateStr] || 0) + 1;
        });
        return map;
    }, [results]);

    const days = useMemo(() => {
        const dayArray: (Date | null)[] = [];
        let currentDate = new Date(startDate);
        while (currentDate <= today) {
            dayArray.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const firstDayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        for (let i = 0; i < firstDayOfWeek; i++) {
            dayArray.unshift(null);
        }
        return dayArray;
    }, [startDate, today]);

    const monthLabels = useMemo(() => {
        const labels: { label: string, colStart: number }[] = [];
        let lastMonth = -1;
        
        days.forEach((day, index) => {
            if (day) {
                const month = day.getMonth();
                const colStart = Math.floor(index / 7) + 1;
                // Add label only if it's a new column to avoid clutter
                if (month !== lastMonth && colStart > (labels[labels.length - 1]?.colStart || 0)) {
                    labels.push({
                        label: day.toLocaleString('default', { month: 'short' }),
                        colStart: colStart
                    });
                    lastMonth = month;
                }
            }
        });
        return labels;
    }, [days]);


    const getColorClass = (count: number) => {
        if (count === 0) return 'bg-slate-700';
        if (count <= 1) return 'bg-primary-900';
        if (count <= 3) return 'bg-primary-700';
        if (count <= 5) return 'bg-primary-500';
        return 'bg-primary-300';
    };

    const numCols = Math.ceil(days.length / 7);

    return (
        <div className="flex gap-3">
             {/* Day Labels */}
            <div className="grid grid-rows-7 gap-1 text-xs text-slate-400 shrink-0 mt-6 text-right">
                <div className="h-4"></div>
                <div className="h-4 flex items-center">Mon</div>
                <div className="h-4"></div>
                <div className="h-4 flex items-center">Wed</div>
                <div className="h-4"></div>
                <div className="h-4 flex items-center">Fri</div>
                <div className="h-4"></div>
            </div>

            <div className="overflow-x-auto w-full">
                {/* Month Labels */}
                <div className={`grid grid-cols-[repeat(${numCols},minmax(0,1fr))] gap-1 mb-1`}>
                    {monthLabels.map(({ label, colStart }) => (
                        <div key={`${label}-${colStart}`} className="text-xs text-slate-400" style={{ gridColumnStart: colStart }}>
                            {label}
                        </div>
                    ))}
                </div>

                {/* Heatmap Grid */}
                <div className={`grid grid-flow-col grid-rows-7 gap-1`}>
                   {days.map((day, index) => {
                        if (!day) return <div key={`pad-${index}`} className="w-4 h-4 rounded-sm bg-transparent" />;
                        const dateStr = day.toISOString().split('T')[0];
                        const count = contributions[dateStr] || 0;
                        return (
                             <div key={index} className="relative group">
                                <div className={`w-4 h-4 rounded-sm ${getColorClass(count)}`}></div>
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                    {count} {count === 1 ? 'quiz' : 'quizzes'} on {day.toLocaleDateString()}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
                                </div>
                            </div>
                        );
                   })} 
                </div>
            </div>
        </div>
    );
};

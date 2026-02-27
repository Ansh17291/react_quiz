import { useMemo } from "react";
import type { QuizResult } from "../../types";

export const ContributionHeatmap = ({ results }: { results: QuizResult[] }) => {
  // These values are stable for the lifetime of the component
  const today = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const date = new Date(today);
    date.setFullYear(date.getFullYear() - 1);
    date.setDate(date.getDate() + 1);
    return date;
  }, [today]);

  const formatLocalYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const contributions: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    results.forEach((r) => {
      const d = new Date(r.submittedAt as any);
      if (isNaN(d.getTime())) return;
      // Normalize to local day to avoid timezone off-by-ones
      const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dateStr = formatLocalYmd(local);
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
    const labels: { label: string; colStart: number }[] = [];
    let lastMonth = -1;

    days.forEach((day, index) => {
      if (day) {
        const month = day.getMonth();
        const colStart = Math.floor(index / 7) + 1;
        // Add label only if it's a new column to avoid clutter
        if (
          month !== lastMonth &&
          colStart > (labels[labels.length - 1]?.colStart || 0)
        ) {
          labels.push({
            label: day.toLocaleString("default", { month: "short" }),
            colStart: colStart,
          });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [days]);

  const maxCount = useMemo(() => {
    return Object.values(contributions).reduce((m, v) => Math.max(m, v || 0), 0);
  }, [contributions]);

  const getColorClass = (count: number) => {
    if (count === 0) return "theme-transition"; // Replaced bg-slate-700, custom styling logic required below
    if (maxCount <= 1) return "bg-green-500";
    const q1 = Math.max(1, Math.floor(maxCount * 0.25));
    const q2 = Math.max(2, Math.floor(maxCount * 0.5));
    const q3 = Math.max(3, Math.floor(maxCount * 0.75));
    if (count <= q1) return "bg-green-900";
    if (count <= q2) return "bg-green-700";
    if (count <= q3) return "bg-green-500";
    return "bg-green-300";
  };

  const numCols = Math.ceil(days.length / 7);

  return (
    <div className="flex gap-3">
      {/* Day Labels */}
      <div className="grid grid-rows-7 gap-1 text-xs shrink-0 mt-6 text-right" style={{ color: 'var(--text-muted)' }}>
        <div className="h-4"></div>
        <div className="h-4 flex items-center">Mon</div>
        <div className="h-4"></div>
        <div className="h-4 flex items-center">Wed</div>
        <div className="h-4"></div>
        <div className="h-4 flex items-center">Fri</div>
        <div className="h-4"></div>
      </div>

      <div className="overflow-x-auto w-full custom-scrollbar">
        {/* Month Labels */}
        <div
          className={`grid grid-cols-[repeat(${numCols},minmax(0,1fr))] gap-1 mb-1`}
        >
          {monthLabels.map(({ label, colStart }) => (
            <div
              key={`${label}-${colStart}`}
              className="text-xs"
              style={{ gridColumnStart: colStart, color: 'var(--text-muted)' }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className={`grid grid-flow-col grid-rows-7 gap-1`}>
          {days.map((day, index) => {
            if (!day)
              return (
                <div
                  key={`pad-${index}`}
                  className="w-4 h-4 rounded-sm bg-transparent"
                />
              );
            const dateStr = formatLocalYmd(day);
            const count = contributions[dateStr] || 0;
            return (
              <div key={index} className="relative group">
                <div
                  className={`w-4 h-4 rounded-sm transition-transform duration-150 group-hover:scale-110 ${count > 0 ? getColorClass(count) : ''}`}
                  style={count === 0 ? { background: 'var(--surface-3)' } : {}}
                ></div>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none" style={{ background: 'var(--text)' }}>
                  {count} {count === 1 ? "quiz" : "quizzes"} on{" "}
                  {day.toLocaleDateString()}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4" style={{ borderTopColor: 'var(--text)' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

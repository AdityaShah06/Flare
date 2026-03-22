"use client";

import { useMemo, useState } from "react";
import { format, addDays, startOfWeek, parseISO, isSameDay } from "date-fns";

interface CalendarAssignment {
  title: string;
  due_date: string;
  submitted: boolean;
  status?: string;
}

interface HeatmapCalendarProps {
  assignments: CalendarAssignment[];
}

export default function HeatmapCalendar({ assignments }: HeatmapCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const { days, weekLabels } = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const daysList: { date: Date; dateStr: string; items: CalendarAssignment[]; hasOverdue: boolean }[] = [];

    for (let i = 0; i < 28; i++) {
      const d = addDays(start, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const dayAssignments = assignments.filter((a) => {
        try {
          return isSameDay(parseISO(a.due_date), d);
        } catch {
          return false;
        }
      });
      const hasOverdue = dayAssignments.some((a) => !a.submitted && d < today);

      daysList.push({ date: d, dateStr, items: dayAssignments, hasOverdue });
    }

    return {
      days: daysList,
      weekLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    };
  }, [assignments]);

  const getCellColor = (count: number, hasOverdue: boolean): string => {
    if (hasOverdue) return "bg-risk-critical/30 border-risk-critical/40";
    if (count >= 3) return "bg-risk-medium/30 border-risk-medium/30";
    if (count >= 1) return "bg-risk-medium/15 border-risk-medium/20";
    return "bg-surface border-border/50";
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h3 className="text-xs font-display font-semibold text-text-secondary uppercase tracking-wider mb-3">Assignment Density — 28 Days</h3>

      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {weekLabels.map((label) => (
          <div key={label} className="text-center text-[8px] text-text-muted font-mono">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={`relative aspect-square rounded-sm border text-center flex items-center justify-center cursor-default transition-colors ${getCellColor(day.items.length, day.hasOverdue)}`}
            onMouseEnter={() => setHoveredDay(day.dateStr)}
            onMouseLeave={() => setHoveredDay(null)}
          >
            <span className="text-[9px] font-mono text-text-secondary">
              {format(day.date, "d")}
            </span>

            {hoveredDay === day.dateStr && day.items.length > 0 && (
              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 bg-elevated border border-border rounded-md p-1.5 shadow-xl">
                {day.items.map((item, i) => (
                  <div key={i} className="text-[9px] text-text-secondary truncate leading-relaxed">
                    <span className={item.submitted ? "text-risk-low" : day.hasOverdue ? "text-risk-critical" : "text-risk-medium"}>
                      {"\u2022"}{" "}
                    </span>
                    {item.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 mt-2.5 text-[9px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-surface border border-border/50" /> None
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-risk-medium/15 border border-risk-medium/20" /> 1-2
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-risk-medium/30 border border-risk-medium/30" /> 3+
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-risk-critical/30 border border-risk-critical/40" /> Overdue
        </span>
      </div>
    </div>
  );
}

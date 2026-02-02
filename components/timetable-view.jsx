'use client';

import { useMemo, useState, useEffect } from 'react';
import clsx from 'clsx';
import { Clock } from 'lucide-react';

// Predefined color palettes suitable for both light and dark modes
const COLOR_PALETTES = [
    {
        name: 'blue',
        classes: "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-800"
    },
    {
        name: 'green',
        classes: "bg-green-100 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-100 dark:border-green-800"
    },
    {
        name: 'purple',
        classes: "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/30 dark:text-purple-100 dark:border-purple-800"
    },
    {
        name: 'orange',
        classes: "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900/30 dark:text-orange-100 dark:border-orange-800"
    },
    {
        name: 'pink',
        classes: "bg-pink-100 text-pink-900 border-pink-200 dark:bg-pink-900/30 dark:text-pink-100 dark:border-pink-800"
    },
    {
        name: 'teal',
        classes: "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-900/30 dark:text-teal-100 dark:border-teal-800"
    },
    {
        name: 'indigo',
        classes: "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-100 dark:border-indigo-800"
    },
    {
        name: 'cyan',
        classes: "bg-cyan-100 text-cyan-900 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-100 dark:border-cyan-800"
    },
    {
        name: 'rose',
        classes: "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-900/30 dark:text-rose-100 dark:border-rose-800"
    }
];

function getSubjectStyle(subjectName) {
    if (!subjectName) return COLOR_PALETTES[0].classes;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
        hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLOR_PALETTES.length;
    return COLOR_PALETTES[index].classes;
}

export function TimetableView({ timetable }) {
  const [currentDayIndex, setCurrentDayIndex] = useState(null);

  useEffect(() => {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const today = new Date().getDay();
    setCurrentDayIndex(today);
  }, []);

  const { periods, rows } = useMemo(() => {
    if (!timetable || timetable.length === 0) return { periods: [], rows: [] };

    const periodMap = new Map();
    timetable.forEach(item => {
        if (!periodMap.has(item.period)) {
            periodMap.set(item.period, {
                period: item.period,
                start: item.start,
                end: item.end
            });
        }
    });

    const sortedPeriods = Array.from(periodMap.values()).sort((a, b) => a.period - b.period);

    const dayIndices = [1, 2, 3, 4, 5, 6];
    const dayNames = { 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr', 6: 'Sa' };
    const fullDayNames = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

    const rows = dayIndices.map(dayIndex => {
        const dayLessons = timetable.filter(t => t.day_index === dayIndex);
        const lessonsByPeriod = {};
        
        dayLessons.forEach(l => {
            if (!lessonsByPeriod[l.period]) {
                lessonsByPeriod[l.period] = [];
            }
            lessonsByPeriod[l.period].push(l);
        });

        return {
            dayIndex,
            shortName: dayNames[dayIndex],
            fullName: fullDayNames[dayIndex],
            lessonsByPeriod
        };
    });

    return { periods: sortedPeriods, rows };
  }, [timetable]);

  if (!timetable || timetable.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-10 text-muted-foreground bg-card rounded-xl border">
            <p>No timetable data available for SE-22.</p>
        </div>
      );
  }

  return (
    <div className="overflow-x-auto rounded-lg border shadow-sm bg-background">
        <table className="w-full text-sm border-collapse min-w-[800px]">
            <thead className="text-xs uppercase bg-muted/30 text-muted-foreground">
                <tr>
                    <th className="border p-4 text-center w-16 font-bold bg-muted/10">
                        Day
                    </th>
                    {periods.map((p) => (
                        <th key={p.period} className="border p-2 text-center min-w-[140px]">
                            <div className="font-bold text-lg text-foreground">{p.period}.</div>
                            <div className="text-[11px] font-mono mt-0.5 text-muted-foreground whitespace-nowrap">
                                {p.start} - {p.end}
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => {
                    const isToday = row.dayIndex === currentDayIndex;
                    return (
                        <tr 
                            key={row.dayIndex} 
                            className={clsx(
                                "transition-colors relative",
                                isToday 
                                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 ring-2 ring-emerald-500/50 z-10" 
                                    : "bg-card hover:bg-muted/5"
                            )}
                        >
                            <td className={clsx(
                                "border p-4 text-center italic font-serif text-2xl relative",
                                isToday ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/20" : "text-primary/80 bg-muted/5"
                            )}>
                                <span title={row.fullName}>{row.shortName}</span>
                                {isToday && (
                                    <div className="absolute top-1 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                        <span className="bg-emerald-600 text-white text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                                             Today
                                        </span>
                                    </div>
                                )}
                            </td>
                            {periods.map((p) => {
                                const lessons = row.lessonsByPeriod[p.period];
                                return (
                                    <td key={p.period} className={clsx("border p-1.5 align-top h-32 relative", isToday && "border-emerald-500/20")}>
                                        {lessons && lessons.length > 0 ? (
                                            <div className="flex flex-col gap-2 h-full">
                                                {lessons.map((lesson, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className={clsx(
                                                            "p-3 rounded shadow-sm border h-full flex flex-col justify-between transition-all hover:shadow-md hover:scale-[1.01] duration-200",
                                                            getSubjectStyle(lesson.subject)
                                                        )}
                                                    >
                                                        <div className="font-bold text-sm leading-tight mb-2">
                                                            {lesson.subject}
                                                        </div>
                                                        
                                                        <div className="flex flex-col gap-1 mt-auto">
                                                            <div className="flex items-center gap-1.5 text-xs opacity-90 font-medium">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                                                <span className="truncate" title={lesson.teachers.join(', ')}>
                                                                    {lesson.teachers[0]}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs opacity-90 font-medium">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                                                <span className="truncate" title={lesson.rooms.join(', ')}>
                                                                    {lesson.rooms.join(', ')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            isToday && (
                                                <div className="h-full w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <div className="text-[10px] text-emerald-600/50 bg-emerald-50/50 px-2 py-1 rounded-full">Free Time</div>
                                                </div>
                                            )
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
  );
}

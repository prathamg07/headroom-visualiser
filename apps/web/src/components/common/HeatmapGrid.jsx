import React, { useState } from 'react';
import { DateTime } from 'luxon';

export function HeatmapGrid({ days = [], currency = 'INR', buffer = 2000, onSelectDay }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const currSymbol = currency === 'INR' ? '₹' : '$';

  return (
    <div className="w-full relative">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mb-4 text-xs font-medium lowercase text-ink-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-fill border-2 border-black" />
          <span>safe (&gt; buffer + margin)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-fill border-2 border-black" />
          <span>tight (near buffer)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-fill border-2 border-black" />
          <span>below buffer (&lt; {currSymbol}{buffer.toLocaleString()})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0 h-0 border-t-[8px] border-t-black border-l-[8px] border-l-transparent" />
          <span>collision run (2+ red days)</span>
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const dt = DateTime.fromISO(day.date);
          const dayNumber = dt.day;
          const dayName = dt.toFormat('ccc').toLowerCase();
          const isToday = day.dayIndex === 0;

          // Semantic fill mapping
          let bgClass = 'bg-white';
          let textColor = 'text-black';

          if (day.status === 'safe') {
            bgClass = 'bg-blue-fill';
            textColor = 'text-white';
          } else if (day.status === 'tight') {
            bgClass = 'bg-yellow-fill';
            textColor = 'text-black';
          } else if (day.status === 'danger') {
            bgClass = 'bg-red-fill';
            textColor = 'text-white';
          }

          return (
            <div
              key={day.date}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => onSelectDay && onSelectDay(day)}
              className={`h-16 md:h-20 border-2 border-black rounded-0 p-2 relative cursor-pointer transition-none flex flex-col justify-between ${bgClass} hover:border-3 hover:z-10`}
            >
              {/* Today inset ring marker (Design System 9.1) */}
              {isToday && (
                <div className="absolute inset-1 border-2 border-black pointer-events-none" />
              )}

              {/* Collision triangle marker in top-right */}
              {day.isCollision && (
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[14px] border-t-black border-l-[14px] border-l-transparent pointer-events-none" />
              )}

              {/* Date & Day of week */}
              <div className="flex items-center justify-between text-xs font-semibold leading-none">
                <span className={textColor}>{dayNumber}</span>
                <span className={`text-[10px] uppercase opacity-75 ${textColor}`}>
                  {dayName}
                </span>
              </div>

              {/* Projected balance */}
              <div className={`text-right text-xs md:text-sm font-mono font-bold leading-none ${textColor}`}>
                {currSymbol}
                {Math.round(day.balance).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover Tooltip Card (Design System 9.1) */}
      {hoveredDay && (
        <div className="mt-4 p-4 bg-white border-2 border-black rounded-0">
          <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-2">
            <span className="font-semibold text-sm lowercase">
              {DateTime.fromISO(hoveredDay.date).toFormat('cccc, d LLLL yyyy').toLowerCase()}
            </span>
            <span className="font-mono font-bold text-sm">
              end-of-day: {currSymbol}{Math.round(hoveredDay.balance).toLocaleString()}
            </span>
          </div>

          {hoveredDay.events && hoveredDay.events.length > 0 ? (
            <div className="flex flex-col gap-1 text-xs">
              {hoveredDay.events.map((ev, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-ink-300">
                  <span className="text-ink-700">
                    {ev.merchant || ev.label || 'Transaction'}{' '}
                    {ev.isProjected ? '(recurring planned)' : ''}
                  </span>
                  <span
                    className={`font-mono font-medium ${
                      ev.direction === 'credit' ? 'text-blue-primary' : 'text-red-primary'
                    }`}
                  >
                    {ev.direction === 'credit' ? '+' : '-'}
                    {currSymbol}{Math.abs(Number(ev.amount)).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-500">no scheduled transactions for this day</p>
          )}
        </div>
      )}
    </div>
  );
}

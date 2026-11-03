import React from 'react';
import { DateTime } from 'luxon';

export function HeadroomTile({ headroomDays = 30, headroomDate, burnRate = 0, currency = 'INR', horizonDays = 30 }) {
  const isDanger = headroomDays < 7;
  const formattedDate = headroomDate
    ? DateTime.fromISO(headroomDate).toFormat('d LLL').toLowerCase()
    : '30+ days';

  // Calculate percentage of timeline before headroom runs out
  const safePercent = Math.min(Math.max((headroomDays / horizonDays) * 100, 0), 100);

  return (
    <div className="bg-surface border-2 border-black rounded-0 p-8 flex flex-col md:flex-row items-center justify-between gap-8 mb-6">
      {/* Left side: Hero Number */}
      <div className="flex flex-col items-start min-w-[200px]">
        <span className="text-xs uppercase tracking-wider text-ink-500 font-medium mb-1">
          available headroom
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-7xl font-bold tabular-nums font-mono leading-none ${
              isDanger ? 'text-red-primary' : 'text-black'
            }`}
          >
            {headroomDays}
          </span>
          <span className="text-2xl font-medium text-ink-700 lowercase">days</span>
        </div>
        <span className="text-xs text-ink-500 mt-2 lowercase">
          at current burn rate of {currency === 'INR' ? '₹' : '$'}
          {burnRate.toLocaleString()}/day
        </span>
      </div>

      {/* Right side: Split Timeline */}
      <div className="flex-1 w-full flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-ink-500 lowercase font-medium">
          <span>today</span>
          <span>forecast horizon ({horizonDays}d)</span>
        </div>

        {/* Timeline bar 48px tall */}
        <div className="h-12 w-full border-2 border-black flex overflow-hidden relative bg-red-fill">
          {/* Safe portion (blue fill) */}
          <div
            className="h-full bg-blue-fill border-r-2 border-black transition-none"
            style={{ width: `${safePercent}%` }}
          />

          {/* Today indicator: 4px black vertical bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-black" />
        </div>

        {/* Target date label */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-900 lowercase">
            headroom safe until: <strong className="font-semibold">{formattedDate}</strong>
          </span>
          <span className="text-xs text-ink-500 font-mono">
            {safePercent.toFixed(0)}% runway
          </span>
        </div>
      </div>
    </div>
  );
}

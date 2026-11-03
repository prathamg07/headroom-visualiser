import React, { useState } from 'react';
import { Button } from './Button.jsx';
import { CloseIcon } from './Icons.jsx';

export function CollisionBanner({ collisions = [], onSeeDetails }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !collisions || collisions.length === 0) return null;

  const first = collisions[0];

  return (
    <div className="w-full bg-red-fill text-white px-6 py-4 border-2 border-black flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        {/* Solid white triangle icon */}
        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-white flex-shrink-0" />
        <span className="text-base font-medium">
          Collision ahead: {first.startDate} to {first.endDate} projected below buffer line ({first.lengthDays} days tight).
        </span>
      </div>

      <div className="flex items-center gap-3">
        {onSeeDetails && (
          <Button variant="white-outline" size="small" onClick={onSeeDetails}>
            see details
          </Button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-white hover:text-black p-1 transition-none"
          aria-label="Dismiss banner"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

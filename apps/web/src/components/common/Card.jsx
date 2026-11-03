import React from 'react';

export function Card({ title, action, children, className = '', noPadding = false }) {
  return (
    <div
      className={`bg-surface border-2 border-black rounded-0 ${
        noPadding ? 'p-0' : 'p-6'
      } ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-4">
          {title && (
            <h3 className="text-xl font-medium tracking-tight text-ink-900 lowercase">
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

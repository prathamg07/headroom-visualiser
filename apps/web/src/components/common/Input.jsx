import React from 'react';
import { WarningTriangle } from './Icons.jsx';

export function Input({
  label,
  helperText,
  error,
  type = 'text',
  className = '',
  id,
  isNumeric = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="text-sm font-medium text-black lowercase">
            {label}
          </label>
          {error && <WarningTriangle className="w-4 h-4 text-red-primary" />}
        </div>
      )}
      <input
        id={inputId}
        type={type}
        className={`h-12 px-4 bg-white border-2 rounded-1 text-base text-ink-900 focus:outline-none focus:ring-3 focus:ring-blue-primary focus:ring-offset-2 ${
          isNumeric ? 'tabular-nums text-right font-mono' : ''
        } ${
          error ? 'border-red-primary' : 'border-black'
        } disabled:bg-ground disabled:border-ink-300 disabled:text-ink-500 ${className}`}
        {...props}
      />
      {error ? (
        <span className="text-xs text-red-primary font-medium">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-ink-500">{helperText}</span>
      ) : null}
    </div>
  );
}

import React from 'react';

export function Badge({ children, variant = 'default', className = '' }) {
  const base =
    'inline-flex items-center justify-center h-6 px-2 text-xs font-medium rounded-1 lowercase';

  const styles = {
    default: 'bg-white border-2 border-black text-black',
    blue: 'bg-blue-primary text-white font-bold',
    red: 'bg-red-primary text-white font-bold',
    yellow: 'bg-yellow-primary text-black font-bold',
  };

  return <span className={`${base} ${styles[variant]} ${className}`}>{children}</span>;
}

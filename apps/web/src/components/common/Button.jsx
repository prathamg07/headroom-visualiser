import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'destructive' | 'secondary' | 'tertiary' | 'white-outline'
  size = 'default',    // 'small' | 'default' | 'large'
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-none border-2 border-black rounded-1 lowercase focus:outline-none focus:ring-3 focus:ring-blue-primary focus:ring-offset-2 active:translate-x-[1px] active:translate-y-[1px]';

  const sizeStyles = {
    small: 'h-8 px-4 text-xs',
    default: 'h-12 px-6 text-sm',
    large: 'h-14 px-8 text-base font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-blue-primary text-white hover:bg-black hover:text-white disabled:bg-ink-300 disabled:border-ink-300 disabled:text-white',
    destructive:
      'bg-red-primary text-white hover:bg-black hover:text-white disabled:bg-ink-300 disabled:border-ink-300 disabled:text-white',
    secondary:
      'bg-white text-black hover:bg-black hover:text-white disabled:bg-ground disabled:border-ink-300 disabled:text-ink-500',
    'white-outline':
      'bg-transparent text-white border-white hover:bg-white hover:text-black',
    tertiary:
      'border-0 bg-transparent text-black underline hover:text-blue-primary h-auto px-0 py-1 shadow-none',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

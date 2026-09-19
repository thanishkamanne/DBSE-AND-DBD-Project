import React from 'react';

export function IconButton({
  icon,
  'aria-label': ariaLabel,
  variant = 'outline', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-xl transition-all select-none focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
    outline: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-400 shadow-xs',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300',
    danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100 focus:ring-rose-400',
  };

  const sizes = {
    sm: 'w-8 h-8 min-w-[32px] min-h-[32px]',
    md: 'w-11 h-11 min-w-[44px] min-h-[44px]',
    lg: 'w-13 h-13 min-w-[52px] min-h-[52px]',
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variants[variant] || variants.outline}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  );
}

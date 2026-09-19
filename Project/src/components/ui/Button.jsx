import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'emergency' | 'safe'
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-all select-none rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const variants = {
    // Deep charcoal primary
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900 shadow-sm',
    // Secondary light neutral
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400',
    // Outline
    outline:
      'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400 shadow-xs',
    // Ghost
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300',
    // Safe emerald
    safe:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600 shadow-sm',
    // Coral / Red strictly for emergency or destructive actions
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600 shadow-sm',
    // Large Emergency trigger button
    emergency:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-md ring-4 ring-rose-100',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-5 py-3 min-h-[50px] gap-2.5',
    xl: 'text-lg px-6 py-4 min-h-[58px] gap-3 font-bold',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {rightIcon && !loading && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

import React from 'react';

export function Badge({
  children,
  variant = 'neutral', // 'safe' | 'danger' | 'warning' | 'neutral' | 'accent'
  size = 'md', // 'sm' | 'md'
  className = '',
}) {
  const variants = {
    safe: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200/80',
    accent: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide',
    md: 'text-xs px-2.5 py-1 rounded-lg font-semibold tracking-wide',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 border uppercase leading-none select-none
        ${variants[variant] || variants.neutral}
        ${sizes[size] || sizes.md}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

import React from 'react';

export function StatusIndicator({
  status = 'active', // 'active' | 'risk' | 'setup' | 'off'
  label,
  subLabel,
  pulse = false,
  size = 'md',
  className = '',
}) {
  const dotColors = {
    active: 'bg-emerald-500',
    risk: 'bg-rose-500',
    setup: 'bg-amber-500',
    off: 'bg-slate-400',
  };

  const ringColors = {
    active: 'ring-emerald-100',
    risk: 'ring-rose-100',
    setup: 'ring-amber-100',
    off: 'ring-slate-100',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              dotColors[status] || dotColors.active
            }`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ring-4 ${
            dotColors[status] || dotColors.active
          } ${ringColors[status] || ringColors.active}`}
        />
      </span>

      {label && (
        <span className="text-xs font-bold text-slate-900 tracking-tight">
          {label}
        </span>
      )}

      {subLabel && (
        <span className="text-[11px] text-slate-500 font-medium">
          {subLabel}
        </span>
      )}
    </div>
  );
}

import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export function Alert({
  children,
  variant = 'info', // 'info' | 'safe' | 'warning' | 'danger'
  title,
  dismissible = false,
  onDismiss,
  className = '',
}) {
  const configs = {
    info: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-800',
      icon: <Info className="w-4 h-4 text-slate-500 shrink-0" />,
    },
    safe: {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
    },
    danger: {
      bg: 'bg-rose-50/70',
      border: 'border-rose-200',
      text: 'text-rose-900',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
    },
  };

  const config = configs[variant] || configs.info;

  return (
    <div
      role="alert"
      className={`
        rounded-xl border p-3.5 flex items-start gap-3
        ${config.bg} ${config.border} ${config.text}
        ${className}
      `}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 text-xs leading-relaxed">
        {title && <h5 className="font-bold mb-0.5 text-sm">{title}</h5>}
        <div>{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded-md"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

import React from 'react';
import { Button } from './Button.jsx';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) return Icon;
    if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null && Icon.$$typeof)) {
      return <Icon className="w-6 h-6" />;
    }
    return null;
  };

  return (
    <div
      className={`
        p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-white
        flex flex-col items-center justify-center space-y-3
        ${className}
      `}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
          {renderIcon()}
        </div>
      )}

      <div>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

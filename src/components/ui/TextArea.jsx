import React from 'react';

export function TextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  helperText,
  disabled = false,
  required = false,
  maxLength,
  showCount = false,
  className = '',
  ...props
}) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-xs font-bold text-slate-800">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {showCount && maxLength && (
            <span className="text-[11px] text-slate-400">
              {(value || '').length}/{maxLength}
            </span>
          )}
        </div>
      )}

      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        required={required}
        className={`
          w-full rounded-xl border text-sm font-medium text-slate-900 bg-white
          p-3 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 resize-none
          ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-200 focus:border-slate-800 focus:ring-slate-100'
          }
          disabled:bg-slate-50 disabled:text-slate-400
          ${className}
        `}
        {...props}
      />

      {error ? (
        <p className="text-xs text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}

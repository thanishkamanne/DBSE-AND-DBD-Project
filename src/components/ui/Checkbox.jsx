import React from 'react';
import { Check } from 'lucide-react';

export function Checkbox({
  id,
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  className = '',
}) {
  return (
    <label
      htmlFor={id}
      className={`
        flex items-start gap-3 select-none cursor-pointer
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
    >
      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={`
            w-5 h-5 rounded-lg border transition-all flex items-center justify-center
            peer-focus:ring-2 peer-focus:ring-slate-800 peer-focus:ring-offset-1
            ${
              checked
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-300 hover:border-slate-400'
            }
          `}
        >
          {checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </div>
      </div>

      {(label || description) && (
        <div className="text-xs space-y-0.5">
          {label && <p className="font-bold text-slate-800 leading-snug">{label}</p>}
          {description && <p className="text-slate-500 text-[11px] leading-relaxed">{description}</p>}
        </div>
      )}
    </label>
  );
}

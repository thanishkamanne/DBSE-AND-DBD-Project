import React from 'react';
import { User } from 'lucide-react';

/**
 * Reusable frontend helper for generating initials from currently displayed user name.
 * Rules:
 * - "Thanu" → "T"
 * - "Thanu Manne" → "TM"
 * - "John Doe" → "JD"
 * - "John" → "J"
 * - Empty / missing name → "" (signals use of neutral generic profile icon)
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Reusable UserAvatar Component
 * Displays dynamic initials from user name or neutral generic profile icon when empty/missing.
 */
export function UserAvatar({
  name,
  className = 'w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm',
  iconClassName = 'w-5 h-5 text-slate-400',
  title,
}) {
  const initials = getInitials(name);

  return (
    <div
      className={`flex items-center justify-center select-none shrink-0 overflow-hidden ${className}`}
      title={title || name || 'User Profile'}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <User className={iconClassName} />
      )}
    </div>
  );
}

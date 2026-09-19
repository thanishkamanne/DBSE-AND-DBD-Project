import React from 'react';
import { Phone, MessageSquare, Edit2, Trash2, ArrowUp, ArrowDown, Bell, BellOff } from 'lucide-react';
import { Badge } from './Badge.jsx';
import { IconButton } from './IconButton.jsx';

export function ContactCard({
  contact,
  index,
  totalCount,
  onEdit,
  onDelete,
  onToggleEnabled,
  onMoveUp,
  onMoveDown,
}) {
  const isFirst = index === 0;
  const isLast = index === totalCount - 1;
  const isEnabled = contact.is_enabled !== undefined ? Boolean(contact.is_enabled) : (contact.enabled !== false);

  return (
    <div
      className={`
        p-4 bg-white rounded-2xl border transition-all flex items-center justify-between gap-3
        ${!isEnabled ? 'opacity-60 border-dashed border-slate-300' : contact.isPrimary ? 'border-slate-800/80 shadow-xs' : 'border-slate-200'}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Priority Rank badge */}
        <div
          className={`
            w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0
            ${
              contact.isPrimary
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600'
            }
          `}
        >
          {index + 1}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {contact.name}
            </h4>
            {contact.isPrimary ? (
              <Badge variant="accent" size="sm">
                Primary
              </Badge>
            ) : contact.priority ? (
              <Badge variant="neutral" size="sm">
                {contact.priority}
              </Badge>
            ) : null}
            {!isEnabled && (
              <Badge variant="neutral" size="sm" className="bg-slate-200 text-slate-700">
                Disabled
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-0.5 text-xs text-slate-500">
            <span className="font-mono">{contact.phone}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              <span className="text-[11px]">
                {isEnabled ? 'Alerts Active' : 'Muted for SOS'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Enable / Disable Toggle */}
        {onToggleEnabled && (
          <IconButton
            icon={isEnabled ? <Bell className="w-3.5 h-3.5 text-emerald-600" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
            aria-label={isEnabled ? 'Mute contact alerts' : 'Enable contact alerts'}
            variant="ghost"
            size="sm"
            onClick={() => onToggleEnabled(contact.id, !isEnabled)}
          />
        )}

        {/* Call direct link */}
        <a
          href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
          aria-label={`Call ${contact.name}`}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
        >
          <Phone className="w-4 h-4" />
        </a>

        {/* Message link */}
        <a
          href={`sms:${contact.phone.replace(/[^0-9+]/g, '')}`}
          aria-label={`Message ${contact.name}`}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
        </a>

        {/* Reorder Buttons */}
        {onMoveUp && (
          <IconButton
            icon={<ArrowUp className="w-3.5 h-3.5" />}
            aria-label="Move Up"
            variant="ghost"
            size="sm"
            disabled={isFirst}
            onClick={() => onMoveUp(index)}
          />
        )}
        {onMoveDown && (
          <IconButton
            icon={<ArrowDown className="w-3.5 h-3.5" />}
            aria-label="Move Down"
            variant="ghost"
            size="sm"
            disabled={isLast}
            onClick={() => onMoveDown(index)}
          />
        )}

        {/* Edit & Delete */}
        <IconButton
          icon={<Edit2 className="w-3.5 h-3.5" />}
          aria-label="Edit contact"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(contact)}
        />
        <IconButton
          icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
          aria-label="Delete contact"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(contact.id)}
        />
      </div>
    </div>
  );
}

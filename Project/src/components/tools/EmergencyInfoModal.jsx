import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  Shield,
  MapPin,
  Lock,
  ExternalLink,
  User,
  Phone
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { UserAvatar } from '../ui/UserAvatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSafety } from '../../context/SafetyContext.jsx';

export function EmergencyInfoModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { contacts } = useSafety();

  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Emergency Information"
      description="Critical medical data and emergency contacts displayed to first responders."
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-between items-center w-full">
          <Link to="/profile" onClick={onClose}>
            <Button variant="outline" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
              Edit in Profile
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* User Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={user?.name}
              className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm"
              iconClassName="w-5 h-5 text-slate-400"
            />
            <div>
              <h4 className="text-sm font-bold text-slate-900">{user?.name || 'Not added'}</h4>
              <p className="text-xs text-slate-500">{user?.phone || 'Not added'}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
            Medical ID
          </span>
        </div>

        {/* Medical Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
            <span className="text-[10px] font-bold uppercase text-rose-700 block">
              Blood Group
            </span>
            <span className="text-base font-black text-rose-950 mt-0.5 block">
              {user?.bloodGroup || 'Not added'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
            <span className="text-[10px] font-bold uppercase text-amber-700 block">
              Known Allergies
            </span>
            <span className="text-xs font-semibold text-amber-950 mt-0.5 block truncate">
              {user?.allergies || 'Not added'}
            </span>
          </div>
        </div>

        {/* Medical notes */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Medical Conditions & Notes
          </span>
          <p className="text-slate-700 leading-relaxed">
            {user?.medicalNotes || 'Not added'}
          </p>
        </div>

        {/* Emergency Address */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Registered Emergency Address
            </span>
            <p className="text-slate-700 mt-0.5">
              {user?.emergencyAddress || 'Not added'}
            </p>
          </div>
        </div>

        {/* Primary Contact */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Primary Emergency Contact
            </span>
            <p className="font-bold text-slate-900 mt-0.5">
              {primaryContact ? `${primaryContact.name} (${primaryContact.relationship})` : '0 / 7 contacts configured'}
            </p>
            {primaryContact && (
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {primaryContact.phone}
              </p>
            )}
          </div>
          {primaryContact && (
            <a href={`tel:${primaryContact.phone}`}>
              <Button size="sm" variant="outline" leftIcon={<Phone className="w-3 h-3" />}>
                Call
              </Button>
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}

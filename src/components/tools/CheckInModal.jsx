import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ShieldAlert,
  BellRing,
  ExternalLink,
  PhoneCall
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Badge } from '../ui/Badge.jsx';

export function CheckInModal() {
  const {
    checkIn,
    checkInModalOpen,
    setCheckInModalOpen,
    startCheckIn,
    extendCheckIn,
    cancelCheckIn,
    resolveMissedCheckIn,
    startSosCountdown,
    contacts,
  } = useSafety();

  const [promptText, setPromptText] = useState('Heading home / walking alone.');
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('00:00');
  const [graceLeftStr, setGraceLeftStr] = useState('05:00');

  // Format active countdown timer
  useEffect(() => {
    let timer = null;
    if (checkIn.isActive && checkIn.endsAt) {
      const updateTimer = () => {
        const diff = Math.max(0, checkIn.endsAt - Date.now());
        const totalSeconds = Math.floor(diff / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        setTimeLeftStr(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(timer);
  }, [checkIn.isActive, checkIn.endsAt]);

  // Format 5-minute grace period timer (5:00 countdown)
  useEffect(() => {
    let timer = null;
    if (checkIn.status === 'missed' && checkIn.graceEndsAt) {
      const updateGrace = () => {
        const diff = Math.max(0, checkIn.graceEndsAt - Date.now());
        const totalSeconds = Math.floor(diff / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        setGraceLeftStr(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      };
      updateGrace();
      timer = setInterval(updateGrace, 1000);
    }
    return () => clearInterval(timer);
  }, [checkIn.status, checkIn.graceEndsAt]);

  const handleStart = (e) => {
    e.preventDefault();
    const duration = isCustom ? parseInt(customDuration, 10) || 30 : selectedDuration;
    startCheckIn(duration, promptText);
  };

  if (!checkInModalOpen) return null;

  // --- 1. STATE: CHECK-IN MISSED (5-MINUTE GRACE PERIOD) ---
  if (checkIn.status === 'missed') {
    return (
      <Modal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        title="CHECK-IN MISSED"
        description="Grace period active. Please confirm your safety to prevent escalation."
        maxWidth="max-w-md"
      >
        <div className="text-center py-3 space-y-4">
          <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border-4 border-amber-200 animate-pulse">
            <BellRing className="w-9 h-9" />
          </div>

          <div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
              Grace Period Active
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Are you safe?
            </h3>
            <p className="text-sm font-medium text-slate-600 mt-1">
              You didn't confirm your safety.
            </p>
            {checkIn.destination && (
              <p className="text-xs text-slate-400 mt-1 italic">
                Destination: "{checkIn.destination}"
              </p>
            )}
          </div>

          {/* 5-minute countdown clock */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-inner">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Automatic Escalation In
            </div>
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-wider text-amber-400 mt-1">
              {graceLeftStr}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              If no response after 5 minutes, emergency escalation starts automatically.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {/* Primary Action: I'm Safe (Resolves check-in, NO escalation) */}
            <Button
              id="btn-checkin-im-safe"
              variant="safe"
              size="lg"
              fullWidth
              onClick={resolveMissedCheckIn}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
            >
              I'm Safe
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => extendCheckIn(15)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Extend (+15m)
              </Button>
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={() => {
                  setCheckInModalOpen(false);
                  startSosCountdown();
                }}
                leftIcon={<ShieldAlert className="w-4 h-4" />}
              >
                SOS Emergency
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // --- 2. STATE: RESOLVED (NO ESCALATION) ---
  if (checkIn.status === 'resolved') {
    return (
      <Modal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        title="CHECK-IN RESOLVED"
        description="Your safety confirmation has been registered."
        maxWidth="max-w-md"
      >
        <div className="text-center py-4 space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border-4 border-emerald-100">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Check-In Resolved
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Safety confirmed. Emergency escalation cancelled.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800">
            No escalation was triggered. Your trusted contacts know you are safe.
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setCheckInModalOpen(false)}
          >
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  // --- 3. STATE: ESCALATION STARTED (GRACE PERIOD EXPIRED WITHOUT RESPONSE) ---
  if (checkIn.status === 'escalated') {
    return (
      <Modal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        title="ESCALATION STARTED"
        description="5-minute grace period elapsed without response."
        maxWidth="max-w-md"
      >
        <div className="text-center py-3 space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border-4 border-rose-200 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div>
            <Badge variant="danger" size="md">
              Emergency Escalation Active
            </Badge>
            <h3 className="text-xl font-bold text-rose-900 mt-2">
              Escalation triggered: In-app emergency incident created
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              5-minute grace period expired without response. In-app emergency incident recorded. Use SMS Composer below to dispatch alerts to your contacts via your mobile carrier.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
            <div className="font-semibold text-slate-800">Escalation Actions:</div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Real device coordinates captured &amp; attached</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Emergency incident record generated for safety audit</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              variant="safe"
              size="md"
              fullWidth
              onClick={resolveMissedCheckIn}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              I am Safe (Resolve Now)
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // --- 4. STATE: ACTIVE RUNNING CHECK-IN ---
  if (checkIn.isActive) {
    return (
      <Modal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        title="Active Safety Check-In"
        description="Your safety timer is monitoring your commute."
        maxWidth="max-w-md"
      >
        <div className="text-center py-4 space-y-4">
          <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border-4 border-emerald-100 animate-pulse">
            <Clock className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs uppercase font-bold text-emerald-600 tracking-wider">
              TIME REMAINING
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono text-slate-900 mt-1">
              {timeLeftStr}
            </div>
            {checkIn.destination && (
              <p className="text-xs text-slate-500 mt-2 font-medium">
                "{checkIn.destination}"
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left">
            <span className="font-semibold text-slate-800 block mb-0.5">Automated Grace Period Policy:</span>
            When this timer ends, you will have a <strong>5-minute grace period</strong> to tap "I'm Safe" before emergency escalation automatically starts.
          </div>

          <div className="space-y-2 pt-2">
            <Button
              variant="safe"
              size="lg"
              fullWidth
              onClick={() => {
                cancelCheckIn();
                setCheckInModalOpen(false);
              }}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
            >
              I am Safe
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => extendCheckIn(15)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Extend (+15m)
              </Button>
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => {
                  cancelCheckIn();
                  setCheckInModalOpen(false);
                }}
              >
                Cancel Timer
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // --- 5. START CHECK-IN FORM ---
  return (
    <Modal
      isOpen={checkInModalOpen}
      onClose={() => setCheckInModalOpen(false)}
      title="Set Safety Check-In"
      description="Start an active countdown timer for your commute or transit."
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => setCheckInModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleStart} leftIcon={<Clock className="w-4 h-4" />}>
            Start Timer
          </Button>
        </>
      }
    >
      <form onSubmit={handleStart} className="space-y-4">
        <Input
          id="checkin-prompt"
          label="Safety Note / Activity"
          placeholder="Heading home / walking alone."
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Timer Duration
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '15 min', val: 15 },
              { label: '30 min', val: 30 },
              { label: '1 hour', val: 60 },
              { label: 'Custom', val: 'custom' },
            ].map((dur) => (
              <button
                key={dur.label}
                type="button"
                onClick={() => {
                  if (dur.val === 'custom') {
                    setIsCustom(true);
                  } else {
                    setIsCustom(false);
                    setSelectedDuration(dur.val);
                  }
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  (isCustom && dur.val === 'custom') || (!isCustom && selectedDuration === dur.val)
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {dur.label}
              </button>
            ))}
          </div>

          {isCustom && (
            <div className="mt-3">
              <Input
                id="custom-dur"
                type="number"
                min="1"
                max="300"
                placeholder="Minutes (e.g. 45)"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                label="Custom Minutes"
              />
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed space-y-1">
          <div className="font-semibold text-slate-700">How Escalation Works:</div>
          <p>
            When the timer finishes, a <strong>5-minute grace period</strong> begins with a prompt: "Check-In Missed. Are you safe?".
          </p>
          <p>
            If you confirm "I'm Safe", the timer resolves with <strong>no escalation</strong>. If 5 minutes pass without response, emergency escalation alerts your trusted contacts automatically.
          </p>
        </div>
      </form>
    </Modal>
  );
}

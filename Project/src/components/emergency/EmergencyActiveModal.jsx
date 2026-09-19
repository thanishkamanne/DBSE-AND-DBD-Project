import React, { useState } from 'react';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  Phone,
  Radio,
  MapPin,
  Lock,
  MessageSquare,
  WifiOff,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';

export function EmergencyActiveModal() {
  const {
    sosState,
    isSecretSos,
    countdown,
    cancelSosCountdown,
    resolveSos,
    sirenActive,
    toggleSiren,
    contacts,
    location,
    lastKnownLocation,
    isOnline,
    activeSosEvent,
    transmissionStatus,
    retryStatus,
    openSmsFallback,
    settings,
  } = useSafety();

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState('');
  const [resolving, setResolving] = useState(false);

  // If idle, or if this is Secret SOS in stealth mode, do NOT show the obvious red modal
  if (sosState === 'idle') return null;
  if (isSecretSos) return null; // Secret SOS keeps the screen discreet

  // --- 1. Countdown Screen ---
  if (sosState === 'countdown') {
    return (
      <div className="fixed inset-0 z-50 bg-rose-600 text-white flex flex-col items-center justify-between p-6 sm:p-8 animate-in fade-in duration-150">
        <div className="w-full text-center pt-8">
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
            Emergency Activation
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-3 tracking-tight">
            SOS ACTIVATING
          </h2>
          <p className="text-xs sm:text-sm text-rose-100 mt-1">
            Dispatching to {contacts.length} trusted contacts
          </p>
        </div>

        {/* Large Countdown Digit */}
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-white/40 flex items-center justify-center bg-white/10 animate-pulse">
            <span className="text-6xl sm:text-7xl font-black font-mono">
              {countdown}
            </span>
          </div>
          <p className="text-xs text-rose-100 font-medium mt-4">
            Tap Cancel below if triggered by mistake
          </p>
        </div>

        {/* Cancel Button */}
        <div className="w-full max-w-sm pb-6">
          <button
            type="button"
            onClick={cancelSosCountdown}
            className="w-full py-4 rounded-2xl bg-white text-rose-600 font-bold text-lg shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Cancel SOS ({countdown}s)
          </button>
        </div>
      </div>
    );
  }

  // --- 2. Active Emergency State Screen ---
  const handleResolve = async (e) => {
    e.preventDefault();
    const clean = pinInput.trim();
    if (!clean || clean.length !== 4) {
      setPinError('Please enter your 4-digit Emergency PIN.');
      return;
    }
    setResolving(true);
    setPinError('');
    try {
      const res = await resolveSos(clean);
      if (!res?.success) {
        setPinError(res?.error || 'Incorrect Emergency PIN. Emergency broadcast remains active.');
      } else {
        setShowPinInput(false);
        setPinInput('');
        setPinError('');
      }
    } catch (err) {
      setPinError(err?.message || 'Failed to verify Emergency PIN.');
    } finally {
      setResolving(false);
    }
  };

  const handleSmsFallback = () => {
    const res = openSmsFallback();
    setSmsFeedback(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Red Emergency Banner */}
        <div className="bg-rose-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">SOS ACTIVE</h3>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
              <p className="text-xs text-rose-100">
                {isOnline ? 'Transmitting coordinates' : 'Offline: Local queue active'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSiren}
            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              sirenActive
                ? 'bg-white text-rose-600 shadow-sm'
                : 'bg-white/20 text-white'
            }`}
          >
            {sirenActive ? (
              <>
                <Volume2 className="w-4 h-4 animate-bounce" />
                <span>Siren On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Siren Off</span>
              </>
            )}
          </button>
        </div>

        {/* Live Status Content */}
        <div className="p-5 space-y-4">
          {/* Status grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Location</span>
              <span className="font-bold text-slate-900 flex items-center justify-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${location.latitude ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {location.latitude ? 'Available' : 'Pending'}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Contacts</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {contacts.length} / {contacts.length}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Safety Net</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {settings.safetyNetworkEnabled ? 'Searching...' : 'Off'}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Status</span>
              <span
                className={`font-bold block mt-0.5 ${
                  transmissionStatus === 'Sent' || transmissionStatus === 'Delivered'
                    ? 'text-emerald-600'
                    : transmissionStatus === 'Pending'
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {!isOnline
                  ? 'Pending'
                  : retryStatus
                  ? retryStatus.charAt(0).toUpperCase() + retryStatus.slice(1)
                  : transmissionStatus}
              </span>
            </div>
          </div>

          {/* Offline Notice & SMS Fallback */}
          {!isOnline && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <WifiOff className="w-4 h-4 text-amber-600" />
                <span>No internet connection. SOS Pending.</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Emergency broadcast saved locally. It will automatically retry transmission once connectivity is restored. Use direct SMS below for immediate cellular alerting.
              </p>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={handleSmsFallback}
                leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
              >
                Open SMS Emergency Composer
              </Button>
              {smsFeedback && (
                <p className="text-[11px] text-emerald-700 font-medium text-center">
                  {smsFeedback}
                </p>
              )}
            </div>
          )}

          {/* Location & Coordinates snapshot */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
            {location.latitude !== null ? (
              <div>
                <div className="flex items-center justify-between text-slate-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-time GPS Location</span>
                  </span>
                  <span className="text-emerald-700 font-mono text-[11px]">
                    ±{location.accuracy || 15} m
                  </span>
                </div>
                <div className="font-mono text-slate-800 text-xs mt-1">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Updated: {location.lastUpdated || 'Just now'} • {activeSosEvent?.timestamp || 'Active'}
                </div>
              </div>
            ) : lastKnownLocation?.latitude ? (
              <div>
                <div className="flex items-center justify-between text-amber-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Last known location</span>
                  </span>
                  <span className="text-amber-800 font-mono text-[11px]">
                    ±{lastKnownLocation.accuracy} m
                  </span>
                </div>
                <div className="font-mono text-amber-950 text-xs mt-1">
                  {lastKnownLocation.latitude.toFixed(5)}, {lastKnownLocation.longitude.toFixed(5)}
                </div>
                <div className="text-[11px] text-amber-800 mt-0.5">
                  Updated: {lastKnownLocation.updatedAt || 'Earlier fix'}
                </div>
              </div>
            ) : (
              <div className="text-center py-1">
                <div className="font-bold text-slate-700">Location unavailable</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  No real browser GPS position has been recorded.
                </div>
              </div>
            )}
          </div>

          {/* Rapid Helpline Shortcut */}
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-rose-950">Universal Emergency Line</p>
              <p className="text-[11px] text-rose-700">Native cellular connection</p>
            </div>
            <a href="tel:112">
              <Button size="sm" variant="danger" leftIcon={<Phone className="w-3.5 h-3.5" />}>
                Call 112
              </Button>
            </a>
          </div>

          {/* Resolve Section with PIN */}
          {!showPinInput ? (
            <div className="pt-2">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setShowPinInput(true)}
                leftIcon={<Lock className="w-4 h-4 text-slate-600" />}
              >
                I'm Safe - Cancel / Resolve SOS
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResolve} className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-800">
                Enter Emergency PIN to Deactivate
              </p>
              <Input
                id="emergency-pin-resolve"
                type="password"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                error={pinError}
                autoFocus
                disabled={resolving}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  disabled={resolving}
                  onClick={() => {
                    setShowPinInput(false);
                    setPinError('');
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="safe"
                  size="sm"
                  fullWidth
                  type="submit"
                  disabled={resolving || pinInput.length !== 4}
                >
                  {resolving ? 'Verifying PIN...' : 'Confirm PIN Deactivation'}
                </Button>
              </div>
            </form>
          )}

          {/* Disclaimer */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 justify-center text-center">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Browser Emergency Simulation • Local audit log maintained</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  PhoneCall,
  Clock,
  Mic,
  Wifi,
  WifiOff,
  BookOpen,
  EyeOff,
  Battery,
  BatteryCharging,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Flashlight,
  HeartPulse,
  Radio,
  Lock,
  ArrowUpRight,
  RefreshCw,
  Share2
} from 'lucide-react';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useSafety } from '../context/SafetyContext.jsx';
import { EvidenceRecorderModal } from '../components/tools/EvidenceRecorderModal.jsx';
import { OfflineModeModal } from '../components/tools/OfflineModeModal.jsx';
import { SafetyChecklistModal } from '../components/tools/SafetyChecklistModal.jsx';
import { EmergencyInfoModal } from '../components/tools/EmergencyInfoModal.jsx';
import { ScreenLightModal } from '../components/tools/ScreenLightModal.jsx';

export function ToolsPage() {
  const {
    sirenActive,
    toggleSiren,
    setFakeCallOpen,
    setCheckInModalOpen,
    setDiscreetMaskOpen,
    isOnline,
    recordings,
    pendingSosEvents,
    checkIn,
    broadcastSafeStatus,
    triggerSecretSos,
    settings,
  } = useSafety();

  // Modals state
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [emergencyInfoOpen, setEmergencyInfoOpen] = useState(false);
  const [screenLightOpen, setScreenLightOpen] = useState(false);
  const [batteryModalOpen, setBatteryModalOpen] = useState(false);

  // Safe status feedback
  const [safeFeedback, setSafeFeedback] = useState('');

  // Battery monitoring
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [isCharging, setIsCharging] = useState(false);
  const [batterySupported, setBatterySupported] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      navigator
        .getBattery()
        .then((battery) => {
          setBatterySupported(true);
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);

          const handleLevel = () => setBatteryLevel(Math.round(battery.level * 100));
          const handleCharging = () => setIsCharging(battery.charging);

          battery.addEventListener('levelchange', handleLevel);
          battery.addEventListener('chargingchange', handleCharging);
        })
        .catch(() => {
          setBatterySupported(false);
        });
    }
  }, []);

  const handleBroadcastSafe = () => {
    const res = broadcastSafeStatus();
    setSafeFeedback(res.message);
    setTimeout(() => setSafeFeedback(''), 4000);
  };

  return (
    <div className="py-4 space-y-6">
      <Container size="default">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Safety Tools & Defense Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Browser-native deterrence, situational response tools, and offline utilities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOfflineModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'
                }`}
              />
              <span>{isOnline ? 'Network Online' : 'Offline Mode'}</span>
              {pendingSosEvents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {pendingSosEvents.length} queued
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Feedback Toast */}
        {safeFeedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{safeFeedback}</span>
            </div>
          </div>
        )}

        {/* Responsive Grid of Tool Cards:
            Mobile: 1-2 cols | Tablet: 2-3 cols | Desktop/Laptop: 4-6 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {/* 1. Acoustic Siren */}
          <div
            onClick={toggleSiren}
            className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs hover:shadow-md select-none ${
              sirenActive
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform ${
                  sirenActive
                    ? 'bg-rose-600 text-white animate-bounce'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                {sirenActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <Badge variant={sirenActive ? 'danger' : 'neutral'} size="sm">
                {sirenActive ? 'Active Siren' : 'Standby'}
              </Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Acoustic Siren
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                High-decibel dual-frequency acoustic alarm for emergency attention.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-rose-600 flex items-center gap-1">
              <span>{sirenActive ? 'Tap to silence' : 'Tap to trigger'}</span>
            </div>
          </div>

          {/* 2. Fake Call */}
          <div
            onClick={() => setFakeCallOpen(true)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <Badge variant="neutral" size="sm">Exit Tool</Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Fake Call
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Simulated incoming phone call to discreetly exit awkward or unsafe encounters.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-indigo-600 flex items-center gap-1">
              <span>Schedule Call</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          {/* 3. Evidence Recorder */}
          <div
            onClick={() => setEvidenceModalOpen(true)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <Badge variant="neutral" size="sm">
                {recordings.length} Saved
              </Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Evidence Recorder
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Capture on-device ambient audio evidence with instant local playback.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-violet-700 flex items-center gap-1">
              <span>Open Recorder</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          {/* 4. Offline Connectivity & Queue */}
          <div
            onClick={() => setOfflineModalOpen(true)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <Badge variant={isOnline ? 'safe' : 'warning'} size="sm">
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Offline Mode
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Connection monitor, offline emergency queuing, and auto-sync recovery.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span>View Connectivity</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          {/* 5. Walk Safe / Safety Timer */}
          <div
            onClick={() => setCheckInModalOpen(true)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <Badge variant={checkIn.isActive ? 'safe' : 'neutral'} size="sm">
                {checkIn.isActive ? 'Running' : 'Ready'}
              </Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Walk Safe Timer
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Countdown timer for night walks and rideshares with escalation alert.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-teal-700 flex items-center gap-1">
              <span>{checkIn.isActive ? 'View Timer' : 'Set Timer'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          {/* 6. Flashlight & Screen Light Fallback */}
          <div
            onClick={() => setScreenLightOpen(true)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Flashlight className="w-5 h-5" />
              </div>
              <Badge variant="neutral" size="sm">Hardware + Screen</Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Flashlight / Lantern
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Camera LED illuminator with high-visibility bright white screen mode.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-amber-700 flex items-center gap-1">
              <span>Activate Light</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          {/* 7. Quick Exit Mask */}
          <div
            onClick={() => setDiscreetMaskOpen(true)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <EyeOff className="w-5 h-5" />
              </div>
              <Badge variant="neutral" size="sm">Discreet</Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Quick Exit Disguise
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Instantly disguise screen with a realistic weather report dashboard.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span>Activate Mask</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          {/* 8. Emergency Info Card */}
          <div
            onClick={() => setEmergencyInfoOpen(true)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <Badge variant="neutral" size="sm">Medical ID</Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Emergency Information
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                First responder profile with blood group, allergies, and emergency PIN.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-rose-700 flex items-center gap-1">
              <span>View Medical ID</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          {/* 9. Safety Protocols Guide */}
          <div
            onClick={() => setChecklistModalOpen(true)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <Badge variant="neutral" size="sm">Protocols</Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Safety Checklist
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Field checklists for rideshares, night corridors, and solo living.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-blue-700 flex items-center gap-1">
              <span>Open Checklist</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          {/* 10. Device & Battery Monitor */}
          <div
            onClick={() => setBatteryModalOpen(true)}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                {isCharging ? (
                  <BatteryCharging className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Battery className="w-5 h-5" />
                )}
              </div>
              <Badge variant="neutral" size="sm">
                {batteryLevel}%
              </Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Device Monitor
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Hardware battery metrics, vibration capabilities, and sensor status.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span>View Hardware</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          {/* 11. Broadcast "I'm Safe" */}
          <div
            onClick={handleBroadcastSafe}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <Badge variant="safe" size="sm">One-Tap</Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                "I'm Safe" Broadcast
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Rapidly notify registered contacts that you arrived safely at your destination.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <span>Dispatch Check-In</span>
              <Share2 className="w-3 h-3" />
            </div>
          </div>

          {/* 12. Secret SOS Trigger */}
          <div
            onClick={() => triggerSecretSos()}
            className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[170px] cursor-pointer shadow-2xs select-none"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <Badge variant="neutral" size="sm">Stealth</Badge>
            </div>

            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Secret SOS Test
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                Silent alert dispatch without acoustic sirens or screen changes.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-bold text-slate-900 flex items-center gap-1">
              <span>Test Stealth Alert</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </Container>

      {/* Modals */}
      <EvidenceRecorderModal
        isOpen={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
      />

      <OfflineModeModal
        isOpen={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
      />

      <SafetyChecklistModal
        isOpen={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
      />

      <EmergencyInfoModal
        isOpen={emergencyInfoOpen}
        onClose={() => setEmergencyInfoOpen(false)}
      />

      <ScreenLightModal
        isOpen={screenLightOpen}
        onClose={() => setScreenLightOpen(false)}
      />

      {/* Battery & Hardware Sensors Modal */}
      {batteryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Device Hardware & Sensors</h3>
              <button
                type="button"
                onClick={() => setBatteryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Battery className="w-5 h-5 text-slate-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Battery Level</span>
                    <p className="text-[11px] text-slate-500">
                      {batterySupported ? (isCharging ? 'Connected to power' : 'Running on battery') : 'Battery API restricted in browser'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black font-mono text-slate-900">{batteryLevel}%</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-slate-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Web Audio Synthesis</span>
                    <p className="text-[11px] text-slate-500">Acoustic siren & ringtone oscillators</p>
                  </div>
                </div>
                <Badge variant="safe" size="sm">Available</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-slate-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Device Vibration</span>
                    <p className="text-[11px] text-slate-500">Haptic feedback motor</p>
                  </div>
                </div>
                <Badge variant={typeof navigator !== 'undefined' && 'vibrate' in navigator ? 'safe' : 'neutral'} size="sm">
                  {typeof navigator !== 'undefined' && 'vibrate' in navigator ? 'Supported' : 'Fallback Visual'}
                </Badge>
              </div>
            </div>

            <Button variant="primary" size="sm" fullWidth onClick={() => setBatteryModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Grid,
  Clock,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext.jsx';
import { audioAlert } from '../../services/audioAlert.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Modal } from '../ui/Modal.jsx';

export function FakeCallModal() {
  const { fakeCallOpen, setFakeCallOpen } = useSafety();

  // Presets as specified in requirements
  const presets = [
    { name: 'Mom', number: '+1 (555) 019-2834', avatar: 'M' },
    { name: 'Police Dispatch', number: 'Emergency Dispatch (112)', avatar: 'P' },
    { name: 'Boss', number: '+1 (555) 304-9812', avatar: 'B' },
    { name: 'Custom', number: '+1 (555) 839-4412', avatar: 'C' },
  ];

  const [callerName, setCallerName] = useState(presets[0].name);
  const [callerNumber, setCallerNumber] = useState(presets[0].number);
  const [callerAvatar, setCallerAvatar] = useState(presets[0].avatar);
  const [delaySeconds, setDelaySeconds] = useState(0);

  // States: 'setup' | 'waiting' | 'ringing' | 'active'
  const [callState, setCallState] = useState('setup');
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [callDuration, setCallDuration] = useState(0);

  // In-call toggles
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);

  const durationTimerRef = useRef(null);

  const handlePresetSelect = (preset) => {
    setCallerName(preset.name);
    setCallerNumber(preset.number);
    setCallerAvatar(preset.avatar);
  };

  const handleStartFakeCall = () => {
    if (delaySeconds === 0) {
      setCallState('ringing');
      audioAlert.startRingtone();
    } else {
      setCountdownRemaining(delaySeconds);
      setCallState('waiting');
    }
  };

  useEffect(() => {
    let timer = null;
    if (callState === 'waiting') {
      if (countdownRemaining > 0) {
        timer = setTimeout(() => {
          setCountdownRemaining((prev) => prev - 1);
        }, 1000);
      } else {
        setCallState('ringing');
        audioAlert.startRingtone();
      }
    }
    return () => clearTimeout(timer);
  }, [callState, countdownRemaining]);

  const handleAnswer = () => {
    audioAlert.stopRingtone();
    setCallState('active');
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleEndCall = () => {
    audioAlert.stopRingtone();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setCallState('setup');
    setFakeCallOpen(false);
    setIsMuted(false);
    setIsSpeaker(false);
    setShowKeypad(false);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!fakeCallOpen) return null;

  // --- FULL SCREEN SIMULATED INCOMING CALL SCREEN ---
  if (callState === 'ringing') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 animate-in fade-in duration-200">
        <div className="text-center pt-8">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            INCOMING CALL
          </span>
          <h2 className="text-3xl font-bold mt-2">{callerName}</h2>
          <p className="text-sm text-slate-400 font-mono mt-1">{callerNumber}</p>
        </div>

        <div className="my-auto flex flex-col items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl font-bold text-white shadow-xl relative z-10">
              {callerAvatar || callerName.charAt(0)}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-5 animate-pulse">
            Simulated Call Deterrent
          </p>
        </div>

        <div className="w-full max-w-sm mx-auto pb-8">
          <div className="flex items-center justify-around gap-6">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleEndCall}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              <span className="text-xs text-slate-400 font-medium">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleAnswer}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-bounce cursor-pointer"
              >
                <Phone className="w-8 h-8" />
              </button>
              <span className="text-xs text-slate-400 font-medium">Answer</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- FULL SCREEN SIMULATED ACTIVE CALL SCREEN ---
  if (callState === 'active') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 animate-in fade-in duration-150">
        <div className="text-center pt-8">
          <h2 className="text-3xl font-bold">{callerName}</h2>
          <p className="text-base font-mono text-emerald-400 mt-2 font-semibold">
            {formatDuration(callDuration)}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300 mt-3">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Simulated Call Session (Safe Deterrent)</span>
          </div>
        </div>

        <div className="my-auto flex flex-col items-center justify-center">
          {showKeypad ? (
            <div className="grid grid-cols-3 gap-4 max-w-xs w-full text-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="w-14 h-14 rounded-full bg-slate-800 text-lg font-bold hover:bg-slate-700 active:scale-95 transition-all mx-auto"
                >
                  {digit}
                </button>
              ))}
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-bold">
              {callerAvatar || callerName.charAt(0)}
            </div>
          )}
        </div>

        <div className="w-full max-w-sm mx-auto space-y-8 pb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isMuted ? 'bg-white text-slate-900' : 'bg-slate-800 text-white'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <span className="text-[11px] text-slate-400">
                {isMuted ? 'Muted' : 'Mute'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKeypad(!showKeypad)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  showKeypad ? 'bg-white text-slate-900' : 'bg-slate-800 text-white'
                }`}
              >
                <Grid className="w-6 h-6" />
              </button>
              <span className="text-[11px] text-slate-400">Keypad</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isSpeaker ? 'bg-white text-slate-900' : 'bg-slate-800 text-white'
                }`}
              >
                <Volume2 className="w-6 h-6" />
              </button>
              <span className="text-[11px] text-slate-400">
                {isSpeaker ? 'Speaker On' : 'Speaker'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleEndCall}
              className="w-18 h-18 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
            <span className="text-xs text-slate-400">End Call</span>
          </div>
        </div>
      </div>
    );
  }

  // --- WAITING TIMER SCREEN ---
  if (callState === 'waiting') {
    return (
      <Modal
        isOpen={true}
        onClose={handleEndCall}
        title="Fake Call Scheduled"
        description="Incoming call simulation will ring momentarily."
      >
        <div className="text-center py-6 space-y-4">
          <div className="w-20 h-20 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center animate-pulse">
            <Clock className="w-10 h-10" />
          </div>
          <div>
            <span className="text-3xl font-black font-mono text-slate-900">
              00:{countdownRemaining.toString().padStart(2, '0')}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Caller: <strong>{callerName}</strong>
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={handleEndCall}>
            Cancel Scheduled Call
          </Button>
        </div>
      </Modal>
    );
  }

  // --- SETUP CONFIGURATION MODAL ---
  return (
    <Modal
      isOpen={fakeCallOpen}
      onClose={() => setFakeCallOpen(false)}
      title="Fake Call Deterrent"
      description="Simulate an incoming call to discreetly exit uncomfortable or suspicious situations."
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => setFakeCallOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleStartFakeCall} leftIcon={<Phone className="w-4 h-4" />}>
            Start Fake Call
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Caller Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  callerName === preset.name
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <Input
          id="fc-caller-name"
          label="Caller Name"
          value={callerName}
          onChange={(e) => setCallerName(e.target.value)}
          placeholder="e.g. Mom, Elena, Security"
          required
        />

        <Input
          id="fc-caller-phone"
          label="Caller Number (Display Only)"
          value={callerNumber}
          onChange={(e) => setCallerNumber(e.target.value)}
          placeholder="+91 XXXXX XXXXX"
          type="tel"
        />

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Delay Options
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Now (0s)', secs: 0 },
              { label: '5 seconds', secs: 5 },
              { label: '15 seconds', secs: 15 },
              { label: '30 seconds', secs: 30 },
            ].map((item) => (
              <button
                key={item.secs}
                type="button"
                onClick={() => setDelaySeconds(item.secs)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center ${
                  delaySeconds === item.secs
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-[11px] text-slate-500">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Simulated Tool: Plays custom Web Audio ringtone and activates device vibration. No cellular charges or real phone calls occur.
          </span>
        </div>
      </div>
    </Modal>
  );
}

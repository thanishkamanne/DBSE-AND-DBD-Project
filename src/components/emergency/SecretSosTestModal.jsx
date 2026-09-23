import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle2, AlertCircle, RefreshCw, X, Eye, HelpCircle } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';

export function SecretSosTestModal({ isOpen, onClose, triggerType = 'discreet_gesture' }) {
  const [tapCount, setTapCount] = useState(0);
  const [testSuccess, setTestSuccess] = useState(false);
  const [timerLeft, setTimerLeft] = useState(3);
  const [testCountdownActive, setTestCountdownActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTapCount(0);
      setTestSuccess(false);
      setTestCountdownActive(false);
      setTimerLeft(3);
    }
  }, [isOpen]);

  const handleTestGestureTap = () => {
    if (testSuccess || testCountdownActive) return;
    const next = tapCount + 1;
    setTapCount(next);

    if (next >= 3) {
      setTestCountdownActive(true);
      let count = 3;
      const interval = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(interval);
          setTestCountdownActive(false);
          setTestSuccess(true);
        } else {
          setTimerLeft(count);
        }
      }, 700);
    }
  };

  const handleReset = () => {
    setTapCount(0);
    setTestSuccess(false);
    setTestCountdownActive(false);
    setTimerLeft(3);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secret SOS — Practice Test Mode"
      description="Practice activating your discreet trigger. No emergency contacts will be alerted."
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-center py-2">
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold">Test Sandbox:</span> Real emergency dispatch is disabled. This practice mode lets you verify your discreet trigger gesture.
          </div>
        </div>

        {testSuccess ? (
          <div className="py-6 space-y-3">
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border-4 border-emerald-100">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">
                Trigger Successfully Verified!
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                Your discreet gesture was registered smoothly. In a real emergency, Secret SOS will activate quietly without sounding the acoustic siren.
              </p>
            </div>
            <div className="flex gap-2 pt-2 justify-center">
              <Button variant="outline" size="sm" onClick={handleReset} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Practice Again
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : testCountdownActive ? (
          <div className="py-6 space-y-3">
            <div className="w-20 h-20 rounded-full bg-slate-900 text-white mx-auto flex items-center justify-center animate-pulse">
              <span className="text-3xl font-black font-mono">{timerLeft}</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Secret Countdown Active...
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Discreet activation confirmed without screen flash.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="text-xs text-slate-600">
              Trigger configuration: <strong>Header Shield Logo (3 Quick Taps)</strong>
            </div>

            {/* Interactive practice target */}
            <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-3">
              <p className="text-xs font-semibold text-slate-600">
                Tap the shield target below 3 times:
              </p>

              <button
                type="button"
                id="btn-test-secret-sos-tap"
                onClick={handleTestGestureTap}
                className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-300 hover:border-slate-900 active:scale-90 transition-all flex flex-col items-center justify-center shadow-xs cursor-pointer"
              >
                <Shield className="w-8 h-8 text-slate-700" />
                <span className="text-[10px] font-bold text-slate-500 mt-1">
                  Tap {tapCount}/3
                </span>
              </button>

              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      tapCount >= step ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Note: Browsers cannot capture hardware button presses. Discreet on-screen taps provide the highest reliability across all mobile browsers.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

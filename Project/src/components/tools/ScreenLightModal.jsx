import React, { useState, useEffect, useRef } from 'react';
import {
  Flashlight,
  Sun,
  AlertTriangle,
  X,
  Zap,
  Lightbulb,
  Maximize2
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';

export function ScreenLightModal({ isOpen, onClose }) {
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [screenLightActive, setScreenLightActive] = useState(false);
  const [strobeActive, setStrobeActive] = useState(false);
  const [strobeState, setStrobeState] = useState(true);

  const streamRef = useRef(null);
  const strobeIntervalRef = useRef(null);

  // Probe camera torch support
  useEffect(() => {
    let track = null;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          streamRef.current = stream;
          const [videoTrack] = stream.getVideoTracks();
          track = videoTrack;
          const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
          if (capabilities.torch) {
            setTorchSupported(true);
          } else {
            setTorchSupported(false);
          }
          // Stop track probe immediately
          videoTrack.stop();
        })
        .catch(() => {
          setTorchSupported(false);
        });
    } else {
      setTorchSupported(false);
    }

    return () => {
      if (track) track.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Strobe effect interval
  useEffect(() => {
    if (strobeActive && screenLightActive) {
      strobeIntervalRef.current = setInterval(() => {
        setStrobeState((prev) => !prev);
      }, 250);
    } else {
      if (strobeIntervalRef.current) {
        clearInterval(strobeIntervalRef.current);
        strobeIntervalRef.current = null;
      }
      setStrobeState(true);
    }

    return () => {
      if (strobeIntervalRef.current) clearInterval(strobeIntervalRef.current);
    };
  }, [strobeActive, screenLightActive]);

  const toggleHardwareTorch = async () => {
    try {
      if (!torchActive) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', advanced: [{ torch: true }] },
        });
        streamRef.current = stream;
        const [videoTrack] = stream.getVideoTracks();
        await videoTrack.applyConstraints({ advanced: [{ torch: true }] });
        setTorchActive(true);
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        setTorchActive(false);
      }
    } catch (e) {
      console.warn('Hardware torch error, falling back to Screen Light:', e);
      setTorchSupported(false);
      setScreenLightActive(true);
    }
  };

  const handleClose = () => {
    if (torchActive && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      setTorchActive(false);
    }
    setScreenLightActive(false);
    setStrobeActive(false);
    onClose();
  };

  if (!isOpen) return null;

  // --- FULL SCREEN BRIGHT WHITE ILLUMINATION VIEW ---
  if (screenLightActive) {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col justify-between p-6 transition-colors duration-100 ${
          strobeActive && !strobeState ? 'bg-black text-white' : 'bg-white text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-6 h-6 text-amber-500 fill-current" />
            <span className="text-sm font-bold uppercase tracking-wider">
              {strobeActive ? 'SOS Strobe Light' : 'Maximum Screen Illumination'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setScreenLightActive(false)}
            className="p-3 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
            <span>Exit Bright Screen</span>
          </button>
        </div>

        <div className="text-center my-auto">
          <p className="text-sm font-bold opacity-80">
            Set device brightness to 100% for maximum visibility in dark environments.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setStrobeActive(!strobeActive)}
            className={`px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-2 ${
              strobeActive
                ? 'bg-rose-600 text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{strobeActive ? 'Stop Strobe' : 'Activate Strobe SOS Flash'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Flashlight & Screen Light"
      description="High-output visual signal and path lighting with automatic hardware fallback."
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Hardware torch card */}
        {torchSupported ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Flashlight className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Rear Camera Flash</h4>
                <p className="text-[11px] text-slate-500">Hardware LED illuminator</p>
              </div>
            </div>
            <Button
              variant={torchActive ? 'danger' : 'primary'}
              size="sm"
              onClick={toggleHardwareTorch}
            >
              {torchActive ? 'Turn Off' : 'Turn On'}
            </Button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Camera torch not supported on this browser/device. Screen Light mode is fully supported.
            </span>
          </div>
        )}

        {/* Screen light option */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <Sun className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Screen Light Mode</h4>
              <p className="text-[11px] text-slate-400">Pure white 100% display illumination</p>
            </div>
          </div>
          <Button
            variant="safe"
            size="sm"
            onClick={() => setScreenLightActive(true)}
            leftIcon={<Maximize2 className="w-3.5 h-3.5" />}
          >
            Launch Screen Light
          </Button>
        </div>
      </div>
    </Modal>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useSafety } from '../../context/SafetyContext.jsx';
import { audioAlert } from '../../services/audioAlert.js';

export function SosHoldButton({ onActivate }) {
  const { sosState, startSosCountdown } = useSafety();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdIntervalRef = useRef(null);
  const holdCompletedRef = useRef(false);

  const startHold = () => {
    // Crucial: Unlock browser audio context synchronously inside the user's initial touch/mouse event
    audioAlert.unlockAudio();

    if (sosState !== 'idle') return;
    holdCompletedRef.current = false;
    setHolding(true);
    setProgress(0);

    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds hold to activate

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        holdCompletedRef.current = true;
        setHolding(false);
        setProgress(0);
        if (onActivate) {
          onActivate();
        } else {
          startSosCountdown();
        }
      }
    }, 30);
  };

  const endHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  };

  const handleClick = (e) => {
    e.preventDefault();
    audioAlert.unlockAudio();

    // If the hold timer already triggered activation, ignore the subsequent click event
    if (holdCompletedRef.current) {
      holdCompletedRef.current = false;
      return;
    }

    if (sosState === 'idle') {
      if (onActivate) {
        onActivate();
      } else {
        startSosCountdown();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center select-none py-3">
      {/* Outer Pulse Container */}
      <div className="relative flex items-center justify-center">
        {/* Animated outer emergency glow rings */}
        <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-rose-500/10 pointer-events-none" />

        {/* Circular progress SVG */}
        <svg
          className="absolute w-36 h-36 sm:w-44 sm:h-44 -rotate-90 pointer-events-none"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            className="stroke-rose-100"
            strokeWidth="5"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            className="stroke-rose-600 transition-all duration-75"
            strokeWidth="6"
            strokeDasharray="276"
            strokeDashoffset={276 - (276 * progress) / 100}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* SOS Primary Push Target */}
        <button
          type="button"
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          onClick={handleClick}
          className={`
            relative z-10 w-32 h-32 sm:w-38 sm:h-38 rounded-full bg-rose-600 text-white
            flex flex-col items-center justify-center shadow-lg transition-transform
            active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-rose-300
            ${holding ? 'scale-95 bg-rose-700' : 'hover:bg-rose-700'}
          `}
        >
          <ShieldAlert className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.2] mb-1" />
          <span className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
            SOS
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-90 mt-1">
            {holding ? 'Activating...' : 'Hold to activate'}
          </span>
        </button>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-500">
          Hold 1.5s or tap for 3s countdown
        </p>
      </div>
    </div>
  );
}

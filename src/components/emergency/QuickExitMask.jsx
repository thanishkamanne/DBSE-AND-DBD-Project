import React, { useState, useEffect } from 'react';
import { Cloud, Sun, Droplets, Wind, ArrowRight, EyeOff } from 'lucide-react';
import { useSafety } from '../../context/SafetyContext.jsx';

export function QuickExitMask() {
  const { discreetMaskOpen, setDiscreetMaskOpen } = useSafety();
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!discreetMaskOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col p-6 animate-in fade-in duration-100">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs text-slate-400 font-mono">Daily Weather</span>
          <h2 className="text-xl font-bold">Downtown Forecast</h2>
        </div>
        <button
          type="button"
          onClick={() => setDiscreetMaskOpen(false)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
        >
          Exit Weather
        </button>
      </div>

      <div className="my-auto flex flex-col items-center justify-center text-center space-y-3">
        <Sun className="w-16 h-16 text-amber-400" />
        <div className="text-6xl font-light tracking-tight">
          72°<span className="text-2xl text-slate-400">F</span>
        </div>
        <p className="text-sm font-medium text-slate-300">Partly Cloudy • Clean Air</p>
        <p className="text-xs text-slate-500 font-mono">{time}</p>

        <div className="grid grid-cols-2 gap-4 mt-6 w-full max-w-xs">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
            <Droplets className="w-4 h-4 text-sky-400 mb-1" />
            <span className="text-[11px] text-slate-400 block">Humidity</span>
            <span className="text-sm font-bold">48%</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-left">
            <Wind className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[11px] text-slate-400 block">Wind</span>
            <span className="text-sm font-bold">7 mph NW</span>
          </div>
        </div>
      </div>

      <div className="text-center pt-4 text-[11px] text-slate-500 border-t border-slate-800">
        Tap "Exit Weather" top right to return to safety console
      </div>
    </div>
  );
}

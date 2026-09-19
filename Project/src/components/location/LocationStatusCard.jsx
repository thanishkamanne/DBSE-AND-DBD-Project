import React from 'react';
import {
  Navigation,
  Crosshair,
  Radio,
  AlertCircle,
  Clock,
  ShieldCheck,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { useSafety } from '../../context/SafetyContext.jsx';

export function LocationStatusCard({ showTrackingControls = true, compact = false }) {
  const {
    location,
    lastKnownLocation,
    requestLocation,
    startTracking,
    stopTracking,
    toggleTracking,
  } = useSafety();

  const isAvailable = location.permission === 'granted' && location.latitude !== null;
  const isPrompt = location.permission === 'prompt' && location.latitude === null;
  const isDenied = location.permission === 'denied';
  const isUnavailable = (location.permission === 'unavailable' || (!isAvailable && !isPrompt && !isDenied));

  return (
    <Card id="real-device-location-card" className="p-4 bg-white border-slate-200 shadow-xs space-y-3">
      {/* 1. STATE: AVAILABLE & ACTIVE */}
      {isAvailable && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Location
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-2.5 w-2.5 relative">
                  {location.isTracking && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-base font-bold text-slate-900">
                  {location.isTracking ? 'Live Tracking' : 'Available'}
                </span>
                {location.isTracking ? (
                  <Badge variant="safe" size="sm">Live</Badge>
                ) : (
                  <Badge variant="neutral" size="sm">GPS Active</Badge>
                )}
              </div>
            </div>

            {showTrackingControls && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={location.isTracking ? 'danger' : 'outline'}
                  onClick={toggleTracking}
                  leftIcon={location.isTracking ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                >
                  {location.isTracking ? 'Stop Tracking' : 'Live Tracking'}
                </Button>
                <button
                  type="button"
                  onClick={requestLocation}
                  title="Recalibrate / Refresh Position"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Crosshair className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Accuracy */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-medium text-slate-500">Accuracy</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                ±{location.accuracy !== null ? location.accuracy : '15'} m
              </div>
            </div>

            {/* Updated */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-medium text-slate-500">Updated</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {location.isTracking ? 'Just now' : (location.lastUpdated || 'Just now')}
              </div>
            </div>

            {/* Coordinates */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-medium text-slate-500">Real Coordinates</div>
              <div className="text-xs font-bold text-slate-800 mt-1 font-mono truncate">
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. STATE: PERMISSION REQUIRED (PROMPT) */}
      {isPrompt && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Location
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-base font-bold text-slate-900">
                  Permission required
                </span>
              </div>
            </div>

            <Button
              id="btn-enable-location"
              size="sm"
              variant="primary"
              onClick={requestLocation}
              leftIcon={<Navigation className="w-3.5 h-3.5" />}
            >
              Enable Location
            </Button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Real device location is required for SOS rescue dispatch, safe route guidance, and proximity alerts.
          </p>

          {/* Last known location if available */}
          {lastKnownLocation ? (
            <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs">
              <div className="font-bold text-amber-900">Last known location</div>
              <div className="text-amber-800 text-[11px] mt-0.5 flex items-center gap-2">
                <span>Updated: {lastKnownLocation.updatedAt || 'Previously'}</span>
                <span>•</span>
                <span>±{lastKnownLocation.accuracy} m</span>
              </div>
              <div className="font-mono text-[11px] text-amber-900 mt-1">
                {lastKnownLocation.latitude.toFixed(4)}, {lastKnownLocation.longitude.toFixed(4)}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              Location unavailable
            </div>
          )}
        </div>
      )}

      {/* 3. STATE: PERMISSION DENIED */}
      {isDenied && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Location
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-base font-bold text-slate-900">
                  Permission denied
                </span>
              </div>
            </div>

            <Button
              id="btn-try-again-location"
              size="sm"
              variant="outline"
              onClick={requestLocation}
              leftIcon={<Crosshair className="w-3.5 h-3.5" />}
            >
              Try Again
            </Button>
          </div>

          <p className="text-xs text-rose-700 bg-rose-50/80 p-2.5 rounded-xl border border-rose-200 leading-relaxed">
            Location access was blocked by your browser. Please tap the site settings lock icon in your browser address bar and choose &quot;Allow location&quot; to restore emergency positioning.
          </p>

          {/* Last known location if available */}
          {lastKnownLocation ? (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="font-bold text-slate-700">Last known location</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Updated: {lastKnownLocation.updatedAt || 'Previously'} (±{lastKnownLocation.accuracy} m)
              </div>
              <div className="font-mono text-[11px] text-slate-700 mt-0.5">
                {lastKnownLocation.latitude.toFixed(4)}, {lastKnownLocation.longitude.toFixed(4)}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              Location unavailable
            </div>
          )}
        </div>
      )}

      {/* 4. STATE: UNAVAILABLE / ACQUIRING */}
      {isUnavailable && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Location
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-base font-bold text-slate-900">
                  Unavailable
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={requestLocation}
              leftIcon={<Crosshair className="w-3.5 h-3.5" />}
            >
              Retry
            </Button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Your device or browser is currently unable to determine GPS coordinates.
          </p>

          {/* Last known location if available */}
          {lastKnownLocation ? (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="font-bold text-slate-700">Last known location</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Updated: {lastKnownLocation.updatedAt || 'Previously'} (±{lastKnownLocation.accuracy} m)
              </div>
              <div className="font-mono text-[11px] text-slate-700 mt-0.5">
                {lastKnownLocation.latitude.toFixed(4)}, {lastKnownLocation.longitude.toFixed(4)}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              Location unavailable
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

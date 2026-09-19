import React from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { useSafety } from '../../context/SafetyContext.jsx';

export function OfflineModeModal({ isOpen, onClose }) {
  const {
    isOnline,
    lastConnectionChange,
    pendingSosEvents,
    retryStatus,
    retryPendingSosEvents,
  } = useSafety();

  const handleManualRetry = () => {
    retryPendingSosEvents(true);
  };

  const getRetryBadge = () => {
    switch (retryStatus) {
      case 'retrying':
        return <Badge variant="warning">Retrying...</Badge>;
      case 'sending':
        return <Badge variant="warning">Sending...</Badge>;
      case 'sent':
        return <Badge variant="safe">Sent</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="neutral">{pendingSosEvents.length > 0 ? 'Pending' : 'Idle'}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connectivity & Offline Mode"
      description="Real-time network state, local cache synchronization, and queued emergency events."
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* --- 1. CONNECTION STATUS BANNER --- */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            isOnline
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isOnline
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Connection Status
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'
                  }`}
                />
                <h4 className="text-base font-bold text-slate-900">
                  {isOnline ? 'Online' : 'Offline'}
                </h4>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">State Changed</span>
            <span className="text-xs font-semibold text-slate-700">
              {lastConnectionChange || 'Session start'}
            </span>
          </div>
        </div>

        {/* --- 2. RETRY STATUS & CONTROLS --- */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw
                className={`w-4 h-4 text-slate-600 ${
                  retryStatus === 'retrying' || retryStatus === 'sending' ? 'animate-spin' : ''
                }`}
              />
              <span className="text-xs font-bold text-slate-800">Transmission Queue Status</span>
            </div>
            {getRetryBadge()}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Pending Events</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {pendingSosEvents.length} queued
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-400 block">Auto-Sync</span>
              <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
                Enabled on Reconnect
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={handleManualRetry}
            disabled={!isOnline || pendingSosEvents.length === 0 || retryStatus === 'retrying' || retryStatus === 'sending'}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${retryStatus === 'retrying' ? 'animate-spin' : ''}`} />}
          >
            {!isOnline
              ? 'Connect to Internet to Retry'
              : pendingSosEvents.length === 0
              ? 'Transmission Queue Empty'
              : retryStatus === 'retrying' || retryStatus === 'sending'
              ? 'Retrying Transmission...'
              : 'Retry Pending Transmission Now'}
          </Button>
        </div>

        {/* --- 3. QUEUED PENDING EVENTS LIST --- */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 px-1">
            Pending Local Events ({pendingSosEvents.length})
          </h4>

          {pendingSosEvents.length === 0 ? (
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-slate-700">All events transmitted</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No pending emergency broadcasts queued locally.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingSosEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-xl bg-white border border-amber-200 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {event.type}
                        </span>
                        <Badge variant="warning" size="sm">
                          Pending
                        </Badge>
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        ID: {event.id} • {event.timestamp} • No internet connection
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-amber-700 shrink-0 font-semibold">
                    Queued
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- 4. OFFLINE CAPABILITIES SUMMARY --- */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>Offline Guaranteed Functionality</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            While offline, all local deterrence and preservation tools remain 100% active: Acoustic Siren, Fake Call simulation, Safety Timer, Evidence Audio Recording, and SMS emergency drafts.
          </p>
        </div>
      </div>
    </Modal>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  Clock,
  MapPin,
  Users,
  Shield,
  Wrench,
  Wifi,
  WifiOff,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { SosHoldButton } from '../components/emergency/SosHoldButton.jsx';
import { LocationStatusCard } from '../components/location/LocationStatusCard.jsx';
import { useSafety } from '../context/SafetyContext.jsx';

export function HomePage() {
  const {
    safetyStatus,
    contacts,
    safetyZones,
    currentSafetyZone,
    checkIn,
    location,
    isOnline,
    sosLogs,
    settings,
    setFakeCallOpen,
    setCheckInModalOpen,
    toggleLocationSharing,
    requestLocation,
  } = useSafety();

  const latestSos = sosLogs.length > 0 ? sosLogs[0] : null;

  // Derive Location status label
  const locationLabel =
    location.permission === 'denied'
      ? 'Unavailable'
      : location.latitude
      ? location.isSharing
        ? 'Sharing On'
        : 'Connected'
      : 'Permission required';

  // Derive Safety Network label
  const networkLabel = settings.safetyNetworkEnabled ? 'Available' : 'Off';

  return (
    <div className="py-2 space-y-4">
      <Container size="default">
        {/* --- 1. SAFETY STATUS HEADER --- */}
        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  safetyStatus === 'SOS Active'
                    ? 'bg-rose-600 animate-ping'
                    : safetyStatus === 'Safety Setup Required'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {safetyStatus === 'SOS Active'
                    ? 'SOS Active'
                    : safetyStatus === 'Safety Setup Required'
                    ? 'Safety Setup Required'
                    : "You're Safe"}
                </h2>
                <span className="text-[11px] text-slate-500">
                  {contacts.length === 0
                    ? 'Add trusted emergency contacts to ready your circle'
                    : `${contacts.length} trusted contacts ready`}
                </span>
              </div>
            </div>

            <Link to="/contacts">
              <Badge
                variant={contacts.length > 0 ? 'safe' : 'warning'}
                size="sm"
              >
                {contacts.length} / 7
              </Badge>
            </Link>
          </div>
        </Card>

        {/* --- 2. LARGE SOS ACTION --- */}
        <Card className="p-4 sm:p-6 bg-white border-slate-200 text-center shadow-xs">
          <SosHoldButton />
        </Card>

        {/* --- 3. QUICK ACTIONS GRID --- */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
            Quick Actions
          </h3>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {/* Fake Call */}
            <button
              type="button"
              onClick={() => setFakeCallOpen(true)}
              className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 leading-none">Fake Call</span>
              <span className="text-[10px] text-slate-400">Exit Tool</span>
            </button>

            {/* Check-In */}
            <button
              type="button"
              onClick={() => setCheckInModalOpen(true)}
              className={`p-3 bg-white rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 ${
                checkIn.status === 'missed'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400 animate-pulse'
                  : checkIn.isActive
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  checkIn.status === 'missed'
                    ? 'bg-amber-600 text-white'
                    : checkIn.isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 leading-none">
                {checkIn.status === 'missed' ? 'Missed Alert' : 'Check-In'}
              </span>
              <span className="text-[10px] text-slate-500">
                {checkIn.status === 'missed'
                  ? "Tap I'm Safe"
                  : checkIn.isActive
                  ? 'Active'
                  : '30 min'}
              </span>
            </button>

            {/* Safe Places */}
            <Link
              to="/map?tab=places"
              className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 leading-none">Safe Places</span>
              <span className="text-[10px] text-slate-400">Find nearby</span>
            </Link>

            {/* Contacts */}
            <Link
              to="/contacts"
              className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 leading-none">Contacts</span>
              <span className="text-[10px] text-slate-400">{contacts.length} / 7</span>
            </Link>

            {/* Share Location */}
            <button
              type="button"
              onClick={toggleLocationSharing}
              className={`p-3 bg-white rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 ${
                location.isSharing ? 'border-teal-500 bg-teal-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  location.isSharing ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600'
                }`}
              >
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 leading-none">Share Loc</span>
              <span className="text-[10px] text-slate-400">
                {location.isSharing ? 'Sharing On' : 'Off'}
              </span>
            </button>

            {/* Safety Tools */}
            <Link
              to="/tools"
              className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 leading-none">Tools</span>
              <span className="text-[10px] text-slate-400">Modules</span>
            </Link>
          </div>
        </div>

        {/* --- 4. COMPACT STATUS CARDS --- */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
            Status
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* Location */}
            <Link to="/map">
              <Card interactive className="p-3 bg-white border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 block">Location</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5 truncate">
                  {locationLabel}
                </span>
              </Card>
            </Link>

            {/* Safety Zone */}
            <Link to="/map?tab=zones">
              <Card interactive className="p-3 bg-white border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 block">Safety Zone</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5 truncate">
                  {safetyZones.length === 0
                    ? 'Not configured'
                    : currentSafetyZone.inside
                    ? `${currentSafetyZone.name} • Inside`
                    : 'Outside zones'}
                </span>
              </Card>
            </Link>

            {/* Check-In */}
            <div onClick={() => setCheckInModalOpen(true)}>
              <Card interactive className={`p-3 bg-white border-slate-200 ${checkIn.status === 'missed' ? 'ring-2 ring-amber-500 bg-amber-50/60' : ''}`}>
                <span className="text-[11px] font-medium text-slate-500 block">Check-In</span>
                <span className={`text-xs font-bold block mt-0.5 truncate ${checkIn.status === 'missed' ? 'text-amber-700' : 'text-slate-900'}`}>
                  {checkIn.status === 'missed'
                    ? 'Missed (Grace Active)'
                    : checkIn.status === 'escalated'
                    ? 'Escalation Active'
                    : checkIn.isActive
                    ? 'Active'
                    : 'Inactive'}
                </span>
              </Card>
            </div>

            {/* Safety Network */}
            <Link to="/settings">
              <Card interactive className="p-3 bg-white border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 block">Safety Network</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5 truncate">
                  {networkLabel}
                </span>
              </Card>
            </Link>

            {/* Latest SOS */}
            <Link to="/sos">
              <Card interactive className="p-3 bg-white border-slate-200 col-span-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block">Latest SOS</span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5 truncate">
                      {latestSos ? `${latestSos.type} • ${latestSos.status} (${latestSos.timestamp})` : 'None'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* --- 5. REAL DEVICE LOCATION STATUS & READINESS --- */}
        <div className="space-y-3">
          <LocationStatusCard showTrackingControls={true} />

          <Card className="p-3 bg-white border-slate-200">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Internet */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-medium">Network</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>

              {/* Contacts */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500 font-medium">Emergency Circle</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      contacts.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {contacts.length} / 7 active
                </span>
              </div>
            </div>
          </Card>
        </div>
      </Container>
    </div>
  );
}

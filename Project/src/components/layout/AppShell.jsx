import React from 'react';
import { TopBar } from './TopBar.jsx';
import { BottomNav } from './BottomNav.jsx';
import { EmergencyActiveModal } from '../emergency/EmergencyActiveModal.jsx';
import { FakeCallModal } from '../tools/FakeCallModal.jsx';
import { CheckInModal } from '../tools/CheckInModal.jsx';
import { QuickExitMask } from '../emergency/QuickExitMask.jsx';

export function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-200">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content (padded for mobile bottom nav) */}
      <main className="flex-1 pb-24 pt-2">{children}</main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Safety Flow Modals */}
      <EmergencyActiveModal />
      <FakeCallModal />
      <CheckInModal />
      <QuickExitMask />
    </div>
  );
}

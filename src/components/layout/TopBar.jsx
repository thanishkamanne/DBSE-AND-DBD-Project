import React, { useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Shield,
  Bell,
  EyeOff,
  Radio,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Container } from './Container.jsx';
import { UserAvatar } from '../ui/UserAvatar.jsx';

export function TopBar() {
  const {
    safetyStatus,
    alerts,
    setDiscreetMaskOpen,
    isOnline,
    triggerSecretSos,
    settings,
  } = useSafety();
  const { user } = useAuth();

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  // Secret SOS Triple-Tap Detection on Header Shield
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      if (settings.secretSosEnabled) {
        triggerSecretSos();
      }
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 1200);
    }
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Map', path: '/map' },
    { label: 'SOS', path: '/sos' },
    { label: 'Contacts', path: '/contacts' },
    { label: 'Alerts', path: '/alerts' },
    { label: 'Tools', path: '/tools' },
    { label: 'Profile', path: '/profile' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <Container size="default">
        <div className="h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Brand & Safety Status with Secret SOS tap trigger */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleLogoTap}
              title="Women Safety (Triple-tap for Secret SOS)"
              className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition-transform cursor-pointer"
            >
              <Shield className="w-4 h-4" />
            </button>

            <Link to="/" className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 tracking-tight leading-none truncate">
                  Women Safety
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    safetyStatus === 'SOS Active'
                      ? 'bg-rose-100 text-rose-700 animate-pulse'
                      : safetyStatus === 'Safety Setup Required'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      safetyStatus === 'SOS Active'
                        ? 'bg-rose-600'
                        : safetyStatus === 'Safety Setup Required'
                        ? 'bg-amber-600'
                        : 'bg-emerald-600'
                    }`}
                  />
                  {safetyStatus}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop / Tablet Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Subtle persistent Offline status indicator */}
            {!isOnline && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="hidden sm:inline">Offline mode active</span>
                <span className="sm:hidden">Offline</span>
              </span>
            )}

            {/* Quick Exit Disguise */}
            <button
              type="button"
              onClick={() => setDiscreetMaskOpen(true)}
              title="Quick Exit - Conceal with weather screen"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-[11px]">Quick Exit</span>
            </button>

            {/* Alerts & Notifications */}
            <Link
              to="/alerts"
              className="relative w-9 h-9 rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="Safety Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </Link>

            {/* Profile Avatar */}
            <Link
              to="/profile"
              className="rounded-xl overflow-hidden focus:outline-hidden"
              title={user?.name || 'Profile'}
            >
              <UserAvatar
                name={user?.name}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                iconClassName="w-4 h-4 text-slate-500"
              />
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}

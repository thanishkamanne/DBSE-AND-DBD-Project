import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  MapPin,
  Users,
  ShieldAlert,
  Bell,
  Wrench,
  User
} from 'lucide-react';
import { Container } from './Container.jsx';
import { useSafety } from '../../context/SafetyContext.jsx';

export function BottomNav() {
  const location = useLocation();
  const { alerts } = useSafety();
  const unreadAlerts = alerts.filter((a) => !a.isRead).length;

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Map', path: '/map', icon: MapPin },
    { label: 'Contacts', path: '/contacts', icon: Users },
    { label: 'SOS', path: '/sos', icon: ShieldAlert, isSos: true },
    { label: 'Alerts', path: '/alerts', icon: Bell, badge: unreadAlerts },
    { label: 'Tools', path: '/tools', icon: Wrench },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 md:hidden pb-safe">
      <Container size="default">
        <div className="h-16 flex items-center justify-between px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            if (item.isSos) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center justify-center -mt-5 group focus:outline-none"
                >
                  <div
                    className={`
                      w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center
                      shadow-md transition-all active:scale-95 group-hover:bg-rose-700
                      ${isActive ? 'ring-4 ring-rose-200 scale-105' : 'ring-2 ring-white'}
                    `}
                  >
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[9px] font-bold text-rose-600 mt-0.5 uppercase tracking-wider">
                    SOS
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`
                  relative flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-colors min-w-0 flex-1
                  ${isActive ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'}
                `}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <span className="text-[9px] mt-1 tracking-tight truncate max-w-[46px]">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </Container>
    </nav>
  );
}

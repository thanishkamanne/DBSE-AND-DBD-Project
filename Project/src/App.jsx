import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SafetyProvider } from './context/SafetyContext.jsx';
import { AppShell } from './components/layout/AppShell.jsx';

// Pages
import { HomePage } from './pages/HomePage.jsx';
import { MapPage } from './pages/MapPage.jsx';
import { SosPage } from './pages/SosPage.jsx';
import { ContactsPage } from './pages/ContactsPage.jsx';
import { ToolsPage } from './pages/ToolsPage.jsx';
import { AlertsPage } from './pages/AlertsPage.jsx';
import { IncidentsPage } from './pages/IncidentsPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { OnboardingPage } from './pages/OnboardingPage.jsx';

function AppRoutes() {
  const { isAuthenticated, hasCompletedOnboarding, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingPage />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/sos" element={<SosPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SafetyProvider>
        <AppRoutes />
      </SafetyProvider>
    </AuthProvider>
  );
}

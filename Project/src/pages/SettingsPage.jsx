import React, { useState } from 'react';
import {
  Shield,
  Bell,
  Lock,
  Smartphone,
  Eye,
  LogOut,
  RotateCcw,
  CheckCircle2,
  Users,
  Radio,
  Volume2,
  PlayCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Checkbox } from '../components/ui/Checkbox.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSafety } from '../context/SafetyContext.jsx';
import { storage } from '../services/storage.js';
import { SecretSosTestModal } from '../components/emergency/SecretSosTestModal.jsx';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { settings, updateSettings } = useSafety();

  const [savedNotice, setSavedNotice] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);

  const handleToggle = (key) => {
    updateSettings({ [key]: !settings[key] });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleTriggerChange = (triggerVal) => {
    updateSettings({ secretSosTrigger: triggerVal });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleResetData = () => {
    if (confirm('Reset application data to initial empty state?')) {
      storage.clearAll();
      window.location.reload();
    }
  };

  return (
    <div className="py-2 space-y-4">
      <Container size="default">
        <div className="px-1">
          <h2 className="text-base font-bold text-slate-900">Safety Settings</h2>
          <p className="text-xs text-slate-500">
            Emergency configuration and privacy controls
          </p>
        </div>

        {savedNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences saved on device.</span>
          </div>
        )}

        {/* 1. Secret SOS & Stealth Settings */}
        <Card className="p-4 bg-white border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <Eye className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Secret SOS &amp; Stealth
              </h3>
            </div>
            <Badge variant={settings.secretSosEnabled ? 'safe' : 'neutral'} size="sm">
              {settings.secretSosEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="space-y-3 pt-1">
            <Checkbox
              id="set-secretsos"
              label="Enable Secret SOS"
              description="Activate silent emergency dispatch without loud siren or bright red screen"
              checked={settings.secretSosEnabled}
              onChange={() => handleToggle('secretSosEnabled')}
            />

            {settings.secretSosEnabled && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Discreet Trigger Configuration
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        id: 'discreet_gesture',
                        label: 'Shield Logo 3-Tap',
                        desc: 'Triple-tap the app header Shield icon',
                      },
                      {
                        id: 'long_press_corner',
                        label: 'Quiet Long-Press',
                        desc: 'Hold safety status indicator for 3 seconds',
                      },
                    ].map((trig) => (
                      <button
                        key={trig.id}
                        type="button"
                        onClick={() => handleTriggerChange(trig.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          (settings.secretSosTrigger || 'discreet_gesture') === trig.id
                            ? 'bg-white border-slate-900 shadow-2xs ring-1 ring-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900">{trig.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{trig.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Test Mode Button */}
                <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-200/80 pt-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Test Mode</div>
                    <div className="text-[11px] text-slate-500">Practice your discreet trigger safely without alerting contacts.</div>
                  </div>
                  <Button
                    id="btn-open-secret-sos-test"
                    variant="outline"
                    size="sm"
                    onClick={() => setTestModalOpen(true)}
                    leftIcon={<PlayCircle className="w-3.5 h-3.5 text-emerald-600" />}
                  >
                    Start Test Mode
                  </Button>
                </div>
              </div>
            )}

            {/* Note Browser Limits */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 text-[11px] text-slate-500 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-700">Browser Environment Note:</span> Standard web browsers cannot intercept hardware volume or power button clicks due to OS security sandbox constraints. Secret SOS uses reliable on-screen gestures that operate across all mobile and desktop browsers.
              </div>
            </div>

            <Checkbox
              id="set-stealth"
              label="Stealth mode by default"
              description="Suppresses siren and keeps interface calm during emergency"
              checked={settings.stealthMode}
              onChange={() => handleToggle('stealthMode')}
            />
          </div>
        </Card>

        {/* Secret SOS Practice Test Modal */}
        <SecretSosTestModal
          isOpen={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          triggerType={settings.secretSosTrigger || 'discreet_gesture'}
        />

        {/* 2. Safety Hardware & Protocols */}
        <Card className="p-4 bg-white border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Shield className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              SOS Protocols
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            <Checkbox
              id="set-vib"
              label="Haptic feedback on SOS hold"
              description="Vibrates device confirming activation countdown"
              checked={settings.vibrationOnSos}
              onChange={() => handleToggle('vibrationOnSos')}
            />

            <Checkbox
              id="set-siren"
              label="Auto-engage siren on normal SOS"
              description="Sounds loud acoustic alarm when countdown completes"
              checked={settings.autoSirenOnSos}
              onChange={() => handleToggle('autoSirenOnSos')}
            />

            <Checkbox
              id="set-safetynet"
              label="Safety Network (Nearby Responders)"
              description="Broadcast distress ping to nearby verified safety network"
              checked={settings.safetyNetworkEnabled}
              onChange={() => handleToggle('safetyNetworkEnabled')}
            />
          </div>
        </Card>

        {/* 3. Notifications & Advisories */}
        <Card className="p-4 bg-white border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Bell className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Advisories &amp; Channels
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            <Checkbox
              id="set-sms"
              label="SMS fallback protocol"
              description="Offer SMS pre-populated composer when offline"
              checked={settings.smsFallbackEnabled}
              onChange={() => handleToggle('smsFallbackEnabled')}
            />
          </div>
        </Card>

        {/* 4. Session & Storage Reset */}
        <Card className="p-4 bg-white border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Smartphone className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Session &amp; Storage
            </h3>
          </div>

          <div className="pt-1 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetData}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
            >
              Reset App Data to Empty State
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={logout}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Log Out ({user?.email})
            </Button>
          </div>
        </Card>
      </Container>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Shield,
  User,
  Users,
  MapPin,
  Eye,
  Radio,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Lock,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSafety } from '../context/SafetyContext.jsx';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Checkbox } from '../components/ui/Checkbox.jsx';
import { Select } from '../components/ui/Select.jsx';

export function OnboardingPage() {
  const { user, updateProfile, completeOnboarding } = useAuth();
  const {
    addContact,
    contacts,
    requestLocation,
    location,
    addSafetyZone,
    setSettings,
    settings,
  } = useSafety();

  // Steps:
  // 1: Profile & Emergency PIN
  // 2: Emergency Contact (First contact)
  // 3: Device Permissions (Location)
  // 4: Secret SOS Setup
  // 5: Safety Zones (Home zone)
  // 6: Safety Network Preferences
  // 7: Setup Complete
  const [step, setStep] = useState(1);

  // Step 1: Profile
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || '');
  const [pin, setPin] = useState(user?.emergencyPin || '');
  const [emergencyAddress, setEmergencyAddress] = useState(user?.emergencyAddress || '');

  // Step 2: Contact
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cRel, setCRel] = useState('Parent');

  // Step 4: Secret SOS
  const [secretEnabled, setSecretEnabled] = useState(settings.secretSosEnabled);
  const [secretTrigger, setSecretTrigger] = useState(settings.secretSosTrigger || 'triple_tap');

  // Step 5: Zone
  const [zoneName, setZoneName] = useState('Home Residence');
  const [zoneAddress, setZoneAddress] = useState('');

  // Step 6: Network
  const [networkOptIn, setNetworkOptIn] = useState(false);

  const nextStep = () => setStep((s) => Math.min(s + 1, 7));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // Save Step 1
  const handleSaveProfile = () => {
    updateProfile({
      bloodGroup,
      emergencyAddress,
      emergencyPin: pin.length === 4 ? pin : (user?.emergencyPin || ''),
    });
    nextStep();
  };

  // Save Step 2
  const handleAddContact = () => {
    if (cName.trim() && cPhone.trim()) {
      addContact({
        name: cName.trim(),
        phone: cPhone.trim(),
        relationship: cRel,
        priority: 'Primary',
        isPrimary: true,
      });
    }
    nextStep();
  };

  // Step 3 Location
  const handleRequestLocation = () => {
    requestLocation();
    nextStep();
  };

  // Save Step 4
  const handleSecretSos = () => {
    setSettings((prev) => ({
      ...prev,
      secretSosEnabled: secretEnabled,
      secretSosTrigger: secretTrigger,
    }));
    nextStep();
  };

  // Save Step 5
  const handleSafetyZone = () => {
    if (zoneName.trim()) {
      addSafetyZone({
        name: zoneName.trim(),
        category: 'Home',
        address: zoneAddress.trim() || 'My Residence',
        radiusMeters: 300,
        enabled: true,
      });
    }
    nextStep();
  };

  // Save Step 6
  const handleNetworkPref = () => {
    setSettings((prev) => ({
      ...prev,
      safetyNetworkEnabled: networkOptIn,
    }));
    nextStep();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6">
      <Container size="sm">
        {/* Header Progress */}
        <div className="text-center mb-6 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Safety Setup Walkthrough
          </h2>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  step === s
                    ? 'w-6 bg-slate-900'
                    : step > s
                    ? 'w-3 bg-emerald-500'
                    : 'w-3 bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Step {step} of 7 • Fast 1-minute configuration
          </p>
        </div>

        {/* --- STEP 1: Medical & Emergency PIN --- */}
        {step === 1 && (
          <Card className="p-5 bg-white border-slate-200 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                1. Profile &amp; Emergency PIN
              </h3>
              <p className="text-xs text-slate-500">
                Set the 4-digit PIN required to cancel/resolve active SOS alarms.
              </p>
            </div>

            <Input
              id="ob-pin"
              label="4-Digit Deactivation PIN"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Enter 4-digit PIN"
            />

            <Select
              id="ob-blood"
              label="Blood Group (Optional - For First Responders)"
              options={[
                { value: '', label: 'Select Blood Group' },
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
              ]}
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
            />

            <Input
              id="ob-addr"
              label="Safe Emergency Address (Optional)"
              placeholder="e.g. Home or dorm address"
              value={emergencyAddress}
              onChange={(e) => setEmergencyAddress(e.target.value)}
            />

            <Button variant="primary" size="md" fullWidth onClick={handleSaveProfile}>
              Continue to Contacts
            </Button>
          </Card>
        )}

        {/* --- STEP 2: Emergency Contact --- */}
        {step === 2 && (
          <Card className="p-5 bg-white border-slate-200 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                2. Add Primary Contact
              </h3>
              <p className="text-xs text-slate-500">
                Who should receive instant notification and coordinates during SOS?
              </p>
            </div>

            <Input
              id="ob-cname"
              label="Contact Name"
              placeholder="e.g. Mom (Sarah) or Partner"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
            />

            <Input
              id="ob-cphone"
              label="Phone Number"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
            />

            <Select
              id="ob-crel"
              label="Relationship"
              options={[
                { value: 'Parent', label: 'Parent / Guardian' },
                { value: 'Sister', label: 'Sister' },
                { value: 'Brother', label: 'Brother' },
                { value: 'Partner', label: 'Partner' },
                { value: 'Friend', label: 'Friend' },
              ]}
              value={cRel}
              onChange={(e) => setCRel(e.target.value)}
            />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="md" fullWidth onClick={nextStep}>
                Skip for now
              </Button>
              <Button variant="primary" size="md" fullWidth onClick={handleAddContact}>
                Save &amp; Continue
              </Button>
            </div>
          </Card>
        )}

        {/* --- STEP 3: Permissions (Location) --- */}
        {step === 3 && (
          <Card className="p-5 bg-white border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <MapPin className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                3. Real Device Location Permission
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Emergency responders and trusted contacts need your actual coordinates from your browser during distress.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Location</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      location.permission === 'granted' && location.latitude
                        ? 'bg-emerald-500'
                        : location.permission === 'denied'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  {location.permission === 'granted' && location.latitude
                    ? '● Available'
                    : location.permission === 'denied'
                    ? 'Permission denied'
                    : location.permission === 'prompt'
                    ? 'Permission required'
                    : 'Unavailable'}
                </span>
              </div>

              {location.permission === 'granted' && location.latitude && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Accuracy</span>
                    <span className="font-bold text-slate-900 font-mono">
                      ±{location.accuracy || 15} m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Updated</span>
                    <span className="text-slate-700 font-medium">
                      {location.lastUpdated || 'Just now'}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-mono pt-1 border-t border-slate-200/60">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="md" fullWidth onClick={nextStep}>
                Skip
              </Button>
              {location.permission === 'granted' && location.latitude ? (
                <Button variant="primary" size="md" fullWidth onClick={nextStep}>
                  Continue
                </Button>
              ) : (
                <Button
                  variant="safe"
                  size="md"
                  fullWidth
                  onClick={requestLocation}
                >
                  {location.permission === 'denied' ? 'Try Again' : 'Enable Location'}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* --- STEP 4: Secret SOS Setup --- */}
        {step === 4 && (
          <Card className="p-5 bg-white border-slate-200 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                4. Secret / Discreet SOS
              </h3>
              <p className="text-xs text-slate-500">
                Trigger emergency protocols silently without flashing bright red screens.
              </p>
            </div>

            <Checkbox
              id="ob-secret-enable"
              label="Enable Secret SOS Trigger"
              description="Discreet activation for covert emergencies."
              checked={secretEnabled}
              onChange={(e) => setSecretEnabled(e.target.checked)}
            />

            {secretEnabled && (
              <Select
                id="ob-secret-trigger"
                label="Stealth Activation Gesture"
                options={[
                  { value: 'triple_tap', label: 'Triple-Tap Top Header Logo' },
                  { value: 'long_press', label: 'Long-press Status Indicator (3s)' },
                ]}
                value={secretTrigger}
                onChange={(e) => setSecretTrigger(e.target.value)}
              />
            )}

            <Button variant="primary" size="md" fullWidth onClick={handleSecretSos}>
              Save &amp; Continue
            </Button>
          </Card>
        )}

        {/* --- STEP 5: Safety Zones --- */}
        {step === 5 && (
          <Card className="p-5 bg-white border-slate-200 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                5. Personal Safety Zone
              </h3>
              <p className="text-xs text-slate-500">
                Define a primary sanctuary (e.g. Home or Campus).
              </p>
            </div>

            <Input
              id="ob-zonename"
              label="Zone Label"
              placeholder="e.g. Home, University Dorm, Office"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
            />

            <Input
              id="ob-zoneaddr"
              label="Address / Landmark"
              placeholder="e.g. Current street address"
              value={zoneAddress}
              onChange={(e) => setZoneAddress(e.target.value)}
            />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="md" fullWidth onClick={nextStep}>
                Skip
              </Button>
              <Button variant="primary" size="md" fullWidth onClick={handleSafetyZone}>
                Add Zone &amp; Continue
              </Button>
            </div>
          </Card>
        )}

        {/* --- STEP 6: Safety Network Preferences --- */}
        {step === 6 && (
          <Card className="p-5 bg-white border-slate-200 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                6. Community Safety Network
              </h3>
              <p className="text-xs text-slate-500">
                Optional opt-in to broadcast proximity alerts to nearby verified community responders.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Radio className="w-4 h-4 text-indigo-600" />
                <span>Strict Privacy Policy</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Your phone number and exact street address are never broadcast to strangers. Only approximate distance is shown.
              </p>
            </div>

            <Checkbox
              id="ob-net-optin"
              label="Opt-in to Community Safety Network"
              description="Alert nearby verified helpers when SOS is triggered."
              checked={networkOptIn}
              onChange={(e) => setNetworkOptIn(e.target.checked)}
            />

            <Button variant="primary" size="md" fullWidth onClick={handleNetworkPref}>
              Proceed to Summary
            </Button>
          </Card>
        )}

        {/* --- STEP 7: Setup Complete --- */}
        {step === 7 && (
          <Card className="p-6 bg-white border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Setup Complete!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your personal security console is operational and configured for immediate action.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Emergency PIN:</span>
                <span className="font-mono font-bold text-slate-900">••••</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Emergency Contacts:</span>
                <span className="font-bold text-slate-900">{contacts.length} registered</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Secret SOS:</span>
                <span className="font-bold text-emerald-600">
                  {settings.secretSosEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <Button
              variant="safe"
              size="lg"
              fullWidth
              onClick={completeOnboarding}
              leftIcon={<Shield className="w-4 h-4" />}
            >
              Open Safety Dashboard
            </Button>
          </Card>
        )}
      </Container>
    </div>
  );
}

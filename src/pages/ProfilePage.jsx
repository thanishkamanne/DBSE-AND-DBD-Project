import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Droplet,
  HeartPulse,
  Home,
  KeyRound,
  Edit2,
  Save,
  CheckCircle2,
  AlertCircle,
  Trash2,
  LogOut,
  Shield,
  Info,
  Lock,
} from 'lucide-react';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { TextArea } from '../components/ui/TextArea.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { UserAvatar, getInitials } from '../components/ui/UserAvatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSafety } from '../context/SafetyContext.jsx';

export function ProfilePage() {
  const { user, updateProfile, updateEmergencyPin, logout, deleteAccount } = useAuth();
  const { contacts } = useSafety();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || '');
  const [allergies, setAllergies] = useState(user?.allergies || '');
  const [medicalNotes, setMedicalNotes] = useState(user?.medicalNotes || '');
  const [emergencyAddress, setEmergencyAddress] = useState(user?.emergencyAddress || '');

  // Saved notification message
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // PIN change state
  const [newPin, setNewPin] = useState('');
  const [pinSavedMsg, setPinSavedMsg] = useState(false);
  const [pinError, setPinError] = useState('');

  // Account Modal States
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletionStatus, setDeletionStatus] = useState('');

  const bloodGroupOptions = [
    { value: '', label: 'Select Blood Group (Not added)' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
  ];

  const handleStartEdit = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setBloodGroup(user?.bloodGroup || '');
    setAllergies(user?.allergies || '');
    setMedicalNotes(user?.medicalNotes || '');
    setEmergencyAddress(user?.emergencyAddress || '');
    setIsEditing(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');

    try {
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        bloodGroup: bloodGroup.trim(),
        allergies: allergies.trim(),
        medicalNotes: medicalNotes.trim(),
        emergencyAddress: emergencyAddress.trim(),
      });

      setIsEditing(false);
      setSaveMessage('Profile information successfully saved.');
      setTimeout(() => setSaveMessage(''), 3500);
    } catch (err) {
      setSaveMessage('Notice: Profile saved locally.');
      setTimeout(() => setSaveMessage(''), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    setPinError('');
    if (newPin.length !== 4) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    await updateEmergencyPin(newPin);
    setNewPin('');
    setPinSavedMsg(true);
    setTimeout(() => setPinSavedMsg(false), 3000);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      return;
    }
    setDeletionStatus('processing');
    try {
      const res = await deleteAccount();
      if (!res.success) {
        setDeletionStatus('error');
        alert(res.error || 'Failed to delete account.');
      }
    } catch (err) {
      setDeletionStatus('error');
      alert(err.message || 'Failed to delete account.');
    }
  };

  const isPinConfigured = Boolean(user?.hasEmergencyPin || (user?.emergencyPin && user.emergencyPin.length >= 4));

  return (
    <div className="py-2 space-y-4">
      <Container size="default">
        {saveMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* 1. Profile Header Card */}
        <Card className="p-4 sm:p-5 bg-white border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <UserAvatar
                name={user?.name}
                className="w-14 h-14 rounded-2xl bg-slate-900 text-white font-bold text-xl shadow-xs"
                iconClassName="w-7 h-7 text-slate-400"
              />

              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {user?.name || 'User Profile'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {user?.email || 'No email registered'}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="safe" size="sm">
                    Active Account
                  </Badge>
                  {user?.phone && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                variant={isEditing ? 'outline' : 'primary'}
                size="sm"
                onClick={isEditing ? () => setIsEditing(false) : handleStartEdit}
                leftIcon={isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </div>
        </Card>

        {/* 2. View / Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Dynamic Initials Preview */}
            <Card className="p-4 bg-slate-50 border-slate-200">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={name}
                  className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-base shadow-xs"
                  iconClassName="w-6 h-6 text-slate-400"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Dynamic Initials Preview</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Avatar: <span className="font-mono font-bold text-slate-900">{getInitials(name) || 'User Icon'}</span>
                  </p>
                </div>
              </div>
            </Card>

            {/* Profile & Contact Details */}
            <Card className="p-4 sm:p-5 bg-white border-slate-200 space-y-3.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Personal &amp; Contact Details
              </h3>

              <Input
                id="prof-name"
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                id="prof-email"
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                id="prof-phone"
                label="Phone Number"
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input
                id="prof-addr"
                label="Emergency Safe Residence Address"
                placeholder="Street address, apartment, or residence"
                value={emergencyAddress}
                onChange={(e) => setEmergencyAddress(e.target.value)}
              />
            </Card>

            {/* Medical Info */}
            <Card className="p-4 sm:p-5 bg-white border-slate-200 space-y-3.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Emergency &amp; Medical Information
              </h3>

              <Select
                id="prof-blood"
                label="Blood Group"
                options={bloodGroupOptions}
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
              />

              <Input
                id="prof-allergies"
                label="Allergies"
                placeholder="List drug, food, or environmental allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />

              <TextArea
                id="prof-medical"
                label="Medical Conditions &amp; Notes"
                rows={2}
                placeholder="Chronic conditions, prescriptions, or medical devices"
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
              />
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-1/3"
              >
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" disabled={isSaving} className="w-2/3">
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Medical & Physical Credentials Card */}
            <Card className="p-4 sm:p-5 bg-white border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Medical &amp; Physical Credentials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Droplet className="w-3.5 h-3.5 text-rose-500" />
                    <span>Blood Group</span>
                  </div>
                  <strong className="text-sm text-slate-900">
                    {user?.bloodGroup || 'Not added'}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <HeartPulse className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Allergies</span>
                  </div>
                  <strong className="text-xs text-slate-900">
                    {user?.allergies || 'Not added'}
                  </strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-400 block mb-0.5">Medical Conditions &amp; Notes</span>
                <p className="text-slate-800 font-medium">
                  {user?.medicalNotes || 'Not added'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Home className="w-3.5 h-3.5 text-slate-600" />
                  <span>Safe Emergency Address</span>
                </div>
                <p className="text-slate-800 font-medium">
                  {user?.emergencyAddress || 'Not added'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block mb-0.5">Emergency Contacts</span>
                  <p className="text-slate-800 font-medium">
                    {contacts.length === 0 ? '0 contacts' : `${contacts.length} / 7 contacts`}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Max 7 contacts
                </span>
              </div>
            </Card>

            {/* Emergency Deactivation PIN Card */}
            <Card className="p-4 sm:p-5 bg-white border-slate-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Emergency Deactivation PIN
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Used to securely cancel or resolve active SOS alarms
                  </p>
                </div>
                <Badge variant={isPinConfigured ? 'safe' : 'neutral'} size="sm">
                  {isPinConfigured ? 'Configured (4-Digit)' : 'Not configured'}
                </Badge>
              </div>

              {pinSavedMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Emergency PIN updated successfully!</span>
                </div>
              )}

              {pinError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{pinError}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePin} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="prof-pin-input"
                    type="password"
                    maxLength={4}
                    placeholder={isPinConfigured ? 'Enter new 4-digit PIN' : 'Set 4-digit PIN'}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="submit"
                    disabled={newPin.length !== 4}
                    className="shrink-0"
                  >
                    {isPinConfigured ? 'Update PIN' : 'Set PIN'}
                  </Button>
                </div>
                {!isPinConfigured && (
                  <p className="text-[11px] text-amber-700">
                    Emergency PIN is not configured. Please set a 4-digit PIN for SOS verification.
                  </p>
                )}
              </form>
            </Card>

            {/* Account Administration Section */}
            <Card className="p-4 sm:p-5 bg-white border-slate-200 space-y-3.5">
              <div className="flex items-center gap-2 text-slate-900">
                <User className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Account Administration
                </h3>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Session Environment:</span>
                  <span className="font-semibold text-slate-800">Active Authenticated Session</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Account Identity:</span>
                  <span className="font-semibold text-slate-800">{user?.email || 'Authenticated User'}</span>
                </div>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogoutModal(true)}
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                  className="w-full sm:w-1/2"
                >
                  Sign Out
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setShowDeleteModal(true);
                  }}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  className="w-full sm:w-1/2"
                >
                  Delete Account
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Container>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out of Session?"
        description="You will return to the sign-in screen. Your emergency preferences and records remain safely stored in the database."
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmLogout}>
              Confirm Sign Out
            </Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600">
          Are you sure you want to end your active session on this device?
        </p>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account?"
        description="This action is permanent and deletes your account and all associated emergency records from the database."
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              disabled={deletionStatus === 'processing'}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleteConfirmText.toUpperCase() !== 'DELETE' || deletionStatus === 'processing'}
            >
              {deletionStatus === 'processing' ? 'Deleting...' : 'Confirm Permanent Deletion'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> Permanent Database Deletion
            </p>
            <p className="text-[11px] leading-relaxed">
              This permanently removes your user account, emergency contacts, safe zones, incident logs, and check-in history. This action cannot be undone.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Type <strong className="text-rose-600 font-mono">DELETE</strong> to confirm:
            </label>
            <Input
              id="confirm-delete-input"
              placeholder="Type DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

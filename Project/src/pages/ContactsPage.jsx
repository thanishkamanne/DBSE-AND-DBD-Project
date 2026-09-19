import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  ShieldCheck,
  AlertCircle,
  Phone,
  MessageSquare
} from 'lucide-react';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Checkbox } from '../components/ui/Checkbox.jsx';
import { ContactCard } from '../components/ui/ContactCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useSafety } from '../context/SafetyContext.jsx';

export function ContactsPage() {
  const {
    contacts,
    addContact,
    updateContact,
    deleteContact,
    reorderContacts,
  } = useSafety();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [drillModalOpen, setDrillModalOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRel, setFormRel] = useState('Parent');
  const [formPriority, setFormPriority] = useState('High');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [formNotifySms, setFormNotifySms] = useState(true);
  const [formNotifyCall, setFormNotifyCall] = useState(true);
  const [formError, setFormError] = useState('');

  const relationshipOptions = [
    { value: 'Parent', label: 'Parent / Guardian' },
    { value: 'Sister', label: 'Sister' },
    { value: 'Brother', label: 'Brother' },
    { value: 'Partner', label: 'Partner / Spouse' },
    { value: 'Friend', label: 'Friend' },
    { value: 'Colleague', label: 'Colleague' },
    { value: 'Neighbor', label: 'Neighbor' },
  ];

  const priorityOptions = [
    { value: 'Primary', label: '1 - Primary Responder' },
    { value: 'High', label: '2 - High Priority' },
    { value: 'Normal', label: '3 - Normal Priority' },
  ];

  const openAdd = () => {
    if (contacts.length >= 7) {
      alert('Maximum 7 trusted contacts allowed.');
      return;
    }
    setFormName('');
    setFormPhone('');
    setFormRel('Friend');
    setFormPriority(contacts.length === 0 ? 'Primary' : 'High');
    setFormIsPrimary(contacts.length === 0);
    setFormNotifySms(true);
    setFormNotifyCall(true);
    setFormError('');
    setIsAddOpen(true);
  };

  const openEdit = (contact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormPhone(contact.phone);
    setFormRel(contact.relationship || 'Friend');
    setFormPriority(contact.priority || 'Normal');
    setFormIsPrimary(contact.isPrimary);
    setFormNotifySms(contact.notifySms !== false);
    setFormNotifyCall(contact.notifyCall !== false);
    setFormError('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formPhone.trim() || formPhone.replace(/[^0-9]/g, '').length < 7) {
      setFormError('Valid phone number is required (min 7 digits)');
      return;
    }

    if (editingContact) {
      updateContact({
        ...editingContact,
        name: formName.trim(),
        phone: formPhone.trim(),
        relationship: formRel,
        priority: formPriority,
        isPrimary: formIsPrimary || formPriority === 'Primary',
        notifySms: formNotifySms,
        notifyCall: formNotifyCall,
      });
      setEditingContact(null);
    } else {
      const res = addContact({
        name: formName.trim(),
        phone: formPhone.trim(),
        relationship: formRel,
        priority: formPriority,
        isPrimary: formIsPrimary || formPriority === 'Primary',
        notifySms: formNotifySms,
        notifyCall: formNotifyCall,
      });
      if (!res.success) {
        setFormError(res.error);
        return;
      }
      setIsAddOpen(false);
    }
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newContacts = [...contacts];
    const temp = newContacts[index - 1];
    newContacts[index - 1] = newContacts[index];
    newContacts[index] = temp;
    reorderContacts(newContacts);
  };

  const handleMoveDown = (index) => {
    if (index === contacts.length - 1) return;
    const newContacts = [...contacts];
    const temp = newContacts[index + 1];
    newContacts[index + 1] = newContacts[index];
    newContacts[index] = temp;
    reorderContacts(newContacts);
  };

  const handleToggleEnabled = (id, newEnabled) => {
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;
    updateContact({
      ...contact,
      is_enabled: newEnabled,
      enabled: newEnabled,
    });
  };

  return (
    <div className="py-2 space-y-4">
      <Container size="default">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Trusted Contacts
            </h2>
            <p className="text-xs text-slate-500">
              {contacts.length}/7 Contacts Registered
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrillModalOpen(true)}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Test Drill
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={openAdd}
              disabled={contacts.length >= 7}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Max Contacts Indicator */}
        {contacts.length >= 7 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Maximum limit of 7 emergency contacts reached.</span>
          </div>
        )}

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No Contacts Added"
            description="Add up to 7 trusted contacts to be notified during SOS activations."
            actionLabel="Add First Contact"
            onAction={openAdd}
          />
        ) : (
          <div className="space-y-2">
            {contacts.map((contact, idx) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                index={idx}
                totalCount={contacts.length}
                onEdit={openEdit}
                onDelete={deleteContact}
                onToggleEnabled={handleToggleEnabled}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>
        )}

        {/* Add / Edit Contact Modal */}
        <Modal
          isOpen={isAddOpen || editingContact !== null}
          onClose={() => {
            setIsAddOpen(false);
            setEditingContact(null);
          }}
          title={editingContact ? 'Edit Contact' : 'Add Trusted Contact'}
          description="Designate priority and notifications for emergency dispatches."
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingContact(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                Save Contact
              </Button>
            </>
          }
        >
          <form onSubmit={handleSave} className="space-y-3.5">
            {formError && (
              <p className="text-xs text-rose-600 font-bold">{formError}</p>
            )}

            <Input
              id="c-name"
              label="Full Name"
              placeholder="e.g. Mom (Sarah)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />

            <Input
              id="c-phone"
              label="Phone Number"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                id="c-rel"
                label="Relationship"
                options={relationshipOptions}
                value={formRel}
                onChange={(e) => setFormRel(e.target.value)}
              />

              <Select
                id="c-priority"
                label="Priority"
                options={priorityOptions}
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
              />
            </div>

            <Checkbox
              id="c-primary"
              label="Set as Primary Responder"
              description="Displays at the top of your SOS command screen."
              checked={formIsPrimary}
              onChange={(e) => setFormIsPrimary(e.target.checked)}
            />

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Notification Preferences
              </label>
              <Checkbox
                id="c-sms"
                label="SMS Coordinate Broadcast"
                checked={formNotifySms}
                onChange={(e) => setFormNotifySms(e.target.checked)}
              />
              <Checkbox
                id="c-call"
                label="Direct Emergency Dialing"
                checked={formNotifyCall}
                onChange={(e) => setFormNotifyCall(e.target.checked)}
              />
            </div>
          </form>
        </Modal>

        {/* Drill Modal */}
        <Modal
          isOpen={drillModalOpen}
          onClose={() => setDrillModalOpen(false)}
          title="Emergency Circle Readiness Drill"
          description="Simulated broadcast payload preview."
          footer={
            <Button variant="primary" size="sm" onClick={() => setDrillModalOpen(false)}>
              Close
            </Button>
          }
        >
          <div className="p-3.5 rounded-xl bg-slate-100 font-mono text-xs space-y-1.5 text-slate-800">
            <p className="font-bold text-rose-600">[SIMULATED DISPATCH PAYLOAD]</p>
            <p>Alert: SOS ACTIVATION SIMULATION</p>
            <p>Target Circle ({contacts.length}): {contacts.map((c) => c.name).join(', ') || 'None'}</p>
            <p>Status: All contacts flagged Ready.</p>
          </div>
        </Modal>
      </Container>
    </div>
  );
}

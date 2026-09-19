import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { TextArea } from '../components/ui/TextArea.jsx';
import { Select } from '../components/ui/Select.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useSafety } from '../context/SafetyContext.jsx';

export function IncidentsPage() {
  const { incidents, addIncident, deleteIncident } = useSafety();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Form State
  const [type, setType] = useState('Harassment');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('20:30');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [formError, setFormError] = useState('');

  const typeOptions = [
    { value: 'Harassment', label: 'Harassment' },
    { value: 'Threat', label: 'Threat / Intimidation' },
    { value: 'Suspicious Activity', label: 'Suspicious Activity' },
    { value: 'Stalking', label: 'Stalking' },
    { value: 'Unsafe Location', label: 'Unsafe Location' },
    { value: 'Other', label: 'Other' },
  ];

  const severityOptions = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Critical', label: 'Critical' },
  ];

  const handleSave = (e) => {
    e.preventDefault();
    if (!location.trim()) {
      setFormError('Incident location is required');
      return;
    }
    if (!description.trim()) {
      setFormError('Brief description is required');
      return;
    }

    addIncident({
      type,
      date,
      time,
      location: location.trim(),
      description: description.trim(),
      severity,
      evidenceNote: evidenceNote.trim(),
    });

    setIsAddOpen(false);
    setLocation('');
    setDescription('');
    setEvidenceNote('');
    setFormError('');
  };

  return (
    <div className="py-2 space-y-4">
      <Container size="default">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Incident Reports
            </h2>
            <p className="text-xs text-slate-500">
              {incidents.length} Records Logged Locally
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Log Incident
          </Button>
        </div>

        {/* Incidents History List */}
        {incidents.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No Incidents Reported"
            description="Log any harassment, stalking, or suspicious occurrences for timeline tracking."
            actionLabel="Log Incident"
            onAction={() => setIsAddOpen(true)}
          />
        ) : (
          <div className="space-y-2.5">
            {incidents.map((inc) => (
              <Card
                key={inc.id}
                interactive
                onClick={() => setSelectedIncident(inc)}
                className="p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={
                          inc.severity === 'Critical' || inc.severity === 'High'
                            ? 'danger'
                            : inc.severity === 'Medium'
                            ? 'warning'
                            : 'safe'
                        }
                        size="sm"
                      >
                        {inc.severity}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {inc.type}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {inc.status || 'Logged'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {inc.location}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {inc.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{inc.date}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{inc.time}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteIncident(inc.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Log New Incident Modal */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Log Safety Incident"
          description="Record verifiable timeline details of harassment, stalking, or suspicious activity."
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                Save Report
              </Button>
            </>
          }
        >
          <form onSubmit={handleSave} className="space-y-3.5">
            {formError && (
              <p className="text-xs text-rose-600 font-bold">{formError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Select
                id="inc-type"
                label="Incident Type"
                options={typeOptions}
                value={type}
                onChange={(e) => setType(e.target.value)}
              />

              <Select
                id="inc-severity"
                label="Severity"
                options={severityOptions}
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="inc-date"
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                id="inc-time"
                label="Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <Input
              id="inc-location"
              label="Location"
              placeholder="e.g. Metro Station Platform 2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <TextArea
              id="inc-desc"
              label="Description of Incident"
              placeholder="Provide objective facts: physical descriptions, vehicle plates, specific verbal remarks, direction of departure..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <Input
              id="inc-evidence"
              label="Optional Evidence / Witness Note"
              placeholder="e.g. CCTV camera at store entrance; bystander spoke to guard"
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
            />
          </form>
        </Modal>

        {/* Incident Details Modal */}
        <Modal
          isOpen={selectedIncident !== null}
          onClose={() => setSelectedIncident(null)}
          title={selectedIncident?.type || 'Incident Details'}
          description={`Severity: ${selectedIncident?.severity}`}
          footer={
            <Button variant="primary" size="sm" onClick={() => setSelectedIncident(null)}>
              Close
            </Button>
          }
        >
          {selectedIncident && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p><strong>Location:</strong> {selectedIncident.location}</p>
                <p><strong>Date &amp; Time:</strong> {selectedIncident.date} at {selectedIncident.time}</p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 mb-1">Description</h5>
                <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                  {selectedIncident.description}
                </p>
              </div>

              {selectedIncident.evidenceNote && (
                <div>
                  <h5 className="font-bold text-slate-800 mb-1">Evidence / Notes</h5>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedIncident.evidenceNote}
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </Container>
    </div>
  );
}

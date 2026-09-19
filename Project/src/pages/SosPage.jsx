import React, { useState } from 'react';
import {
  ShieldAlert,
  Volume2,
  VolumeX,
  PhoneCall,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  ArrowDown,
  FileText,
  ChevronRight,
  WifiOff
} from 'lucide-react';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SosHoldButton } from '../components/emergency/SosHoldButton.jsx';
import { LocationStatusCard } from '../components/location/LocationStatusCard.jsx';
import { useSafety } from '../context/SafetyContext.jsx';

export function SosPage() {
  const {
    sosState,
    startSosCountdown,
    triggerSecretSos,
    sirenActive,
    toggleSiren,
    contacts,
    sosLogs,
    isOnline,
    openSmsFallback,
    settings,
  } = useSafety();

  const [selectedLog, setSelectedLog] = useState(null);
  const [smsFeedback, setSmsFeedback] = useState('');

  const handleSmsFallback = () => {
    const res = openSmsFallback();
    setSmsFeedback(res.message);
  };

  return (
    <div className="py-2 space-y-4">
      <Container size="default">
        {/* Top Emergency Status */}
        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">
                  Emergency Command
                </h2>
                <span className="text-[11px] text-slate-500">
                  {sosState === 'active' ? 'SOS Active' : 'Standby Mode'}
                </span>
              </div>
            </div>

            <Button
              variant={sirenActive ? 'danger' : 'outline'}
              size="sm"
              onClick={toggleSiren}
              leftIcon={sirenActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            >
              {sirenActive ? 'Siren On' : 'Test Siren'}
            </Button>
          </div>
        </Card>

        {/* SOS Hold Control */}
        <Card className="p-4 sm:p-6 bg-white border-slate-200 text-center shadow-xs">
          <SosHoldButton onActivate={() => startSosCountdown(false)} />
        </Card>

        {/* Real Device Location Readiness for Emergency */}
        <LocationStatusCard showTrackingControls={true} />

        {/* Secret / Discreet SOS Card */}
        {settings.secretSosEnabled && (
          <Card className="p-4 bg-slate-900 text-white border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Secret SOS Trigger</h3>
                  <p className="text-[11px] text-slate-400">
                    Silent emergency broadcast without alert siren
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={triggerSecretSos}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Trigger Secret SOS
              </Button>
            </div>
          </Card>
        )}

        {/* Offline & SMS Fallback Banner */}
        <Card className="p-3.5 bg-white border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-900">SMS Fallback Channel</span>
            </div>
            {!isOnline && (
              <Badge variant="warning" size="sm">Internet Offline</Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            If cellular internet or data drops, open your native SMS composer pre-populated with coordinates and distress message.
          </p>
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={handleSmsFallback}
            leftIcon={<MessageSquare className="w-3.5 h-3.5 text-slate-700" />}
          >
            Launch Emergency SMS Composer
          </Button>
          {smsFeedback && (
            <p className="text-[11px] text-emerald-600 font-medium text-center pt-1">
              {smsFeedback}
            </p>
          )}
        </Card>

        {/* Emergency Escalation Flow Visualization */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
            Escalation Architecture
          </h3>

          <Card className="p-3.5 bg-white border-slate-200 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-900 block">Priority 1: Primary Contact</span>
                <span className="text-[11px] text-slate-500">
                  {contacts.find((c) => c.isPrimary)?.name || 'No Primary Contact configured'}
                </span>
              </div>
              <Badge variant="danger" size="sm">Immediate</Badge>
            </div>

            <div className="flex justify-center -my-1 text-slate-300">
              <ArrowDown className="w-3.5 h-3.5" />
            </div>

            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-900 block">Priority 2: High Urgency Contacts</span>
                <span className="text-[11px] text-slate-500">
                  If unacknowledged within 60 seconds
                </span>
              </div>
              <Badge variant="warning" size="sm">+60s</Badge>
            </div>

            <div className="flex justify-center -my-1 text-slate-300">
              <ArrowDown className="w-3.5 h-3.5" />
            </div>

            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-900 block">Priority 3: Full Circle &amp; Helplines</span>
                <span className="text-[11px] text-slate-500">
                  Broadcast to remaining circle and nearby safety network
                </span>
              </div>
              <Badge variant="neutral" size="sm">+120s</Badge>
            </div>
          </Card>
        </div>

        {/* SOS History Logs */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
            SOS History
          </h3>

          {sosLogs.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No emergencies yet"
              description="Any triggered emergency events, timestamps, and delivery states will be archived here."
            />
          ) : (
            <div className="space-y-2">
              {sosLogs.map((log) => (
                <Card
                  key={log.id}
                  interactive
                  onClick={() => setSelectedLog(log)}
                  className="p-3.5 bg-white border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {log.type}
                        </span>
                        <Badge
                          variant={
                            log.status === 'Delivered'
                              ? 'safe'
                              : log.status === 'Resolved'
                              ? 'neutral'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {log.date} at {log.timestamp} • {log.deliveryState || 'Processed'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </Card>
              ))}
            </div>
          )}
        </div>
      </Container>

      {/* SOS Log Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="SOS Event Details"
      >
        {selectedLog && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Event Type:</span>
                <span className="font-bold text-slate-900">{selectedLog.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transmission Status:</span>
                <span className="font-bold text-slate-900">{selectedLog.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="font-mono text-slate-900">{selectedLog.date} {selectedLog.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coordinates:</span>
                <span className="font-mono text-slate-900">
                  {selectedLog.latitude ? `${selectedLog.latitude.toFixed(4)}, ${selectedLog.longitude.toFixed(4)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contacts Targeted:</span>
                <span className="font-bold text-slate-900">{selectedLog.contactsNotifiedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery State:</span>
                <span className="text-slate-800">{selectedLog.deliveryState}</span>
              </div>
            </div>

            <Button variant="outline" size="sm" fullWidth onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

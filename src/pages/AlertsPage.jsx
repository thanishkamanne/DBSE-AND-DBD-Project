import React, { useState } from 'react';
import {
  Bell,
  AlertCircle,
  CheckCheck,
  Trash2,
  Filter,
  Shield,
  Clock,
  MapPin,
  Check
} from 'lucide-react';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useSafety } from '../context/SafetyContext.jsx';

export function AlertsPage() {
  const { alerts, markAlertAsRead, markAllAlertsAsRead, dismissAlert } = useSafety();

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedAlert, setSelectedAlert] = useState(null);

  const categories = ['All', 'Emergency', 'Safety', 'Travel', 'Location', 'Community'];

  const filteredAlerts = alerts.filter((a) => {
    if (categoryFilter === 'All') return true;
    return a.category === categoryFilter;
  });

  const getSeverityBadgeVariant = (sev) => {
    switch (sev) {
      case 'Critical':
        return 'danger';
      case 'High':
        return 'danger';
      case 'Medium':
        return 'warning';
      case 'Low':
      default:
        return 'safe';
    }
  };

  return (
    <div className="py-2 space-y-4">
      <Container size="default">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900">Safety Alerts</h2>
            <p className="text-xs text-slate-500">
              {alerts.filter((a) => !a.isRead).length} Unread • Verified Incident Updates
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAlertsAsRead}
            leftIcon={<CheckCheck className="w-3.5 h-3.5 text-slate-600" />}
          >
            Mark all read
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Alerts Cards List */}
        {filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-6 h-6" />}
            title="No Alerts Found"
            description="You are caught up on all community safety updates and corridor advisories."
          />
        ) : (
          <div className="space-y-2.5">
            {filteredAlerts.map((alert) => (
              <Card
                key={alert.id}
                interactive
                onClick={() => {
                  setSelectedAlert(alert);
                  markAlertAsRead(alert.id);
                }}
                className={`p-4 transition-all ${
                  !alert.isRead ? 'border-slate-800 bg-white shadow-xs' : 'border-slate-200 bg-slate-50/40 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getSeverityBadgeVariant(alert.severity)} size="sm">
                        {alert.severity}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {alert.category}
                      </Badge>
                      {!alert.isRead && (
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {alert.title}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      {alert.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{alert.location}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{alert.time}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                    title="Dismiss alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Alert Details Modal */}
        <Modal
          isOpen={selectedAlert !== null}
          onClose={() => setSelectedAlert(null)}
          title={selectedAlert?.title || 'Alert Details'}
          description={`${selectedAlert?.category} • Severity: ${selectedAlert?.severity}`}
          footer={
            <Button variant="primary" size="sm" onClick={() => setSelectedAlert(null)}>
              Done
            </Button>
          }
        >
          {selectedAlert && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="text-slate-500">Location: <strong className="text-slate-800">{selectedAlert.location}</strong></p>
                <p className="text-slate-500">Time: <strong className="text-slate-800">{selectedAlert.time}</strong></p>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {selectedAlert.description}
              </p>
            </div>
          )}
        </Modal>
      </Container>
    </div>
  );
}

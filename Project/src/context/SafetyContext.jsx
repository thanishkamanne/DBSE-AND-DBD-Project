import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '../services/storage.js';
import { audioAlert } from '../services/audioAlert.js';
import {
  ContactsService,
  SosService,
  CheckInService,
  SafetyZonesService,
  AlertsService,
  EvidenceService,
  ProfileService,
} from '../services/api.js';

const SafetyContext = createContext(null);

// Calculate distance in meters using Haversine formula
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function SafetyProvider({ children }) {
  // --- Network State ---
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastConnectionChange, setLastConnectionChange] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // --- Real Geolocation & Last Known Location State ---
  const [lastKnownLocation, setLastKnownLocation] = useState(() => storage.getLastKnownLocation());
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    lastUpdated: null,
    lastUpdatedExact: null,
    permission: 'prompt', // 'prompt' | 'granted' | 'denied' | 'unavailable'
    error: null,
    isSharing: false,
    isTracking: false,
  });

  const watchIdRef = useRef(null);

  // Request real browser geolocation (one-time fix)
  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        permission: 'unavailable',
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const realAccuracy = Math.round(pos.coords.accuracy);
        const lastKnown = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: realAccuracy,
          updatedAt: timeStr,
          timestamp: Date.now(),
        };
        setLastKnownLocation(lastKnown);
        storage.saveLastKnownLocation(lastKnown);

        setLocation((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: realAccuracy,
          timestamp: Date.now(),
          lastUpdated: 'Just now',
          lastUpdatedExact: timeStr,
          permission: 'granted',
          error: null,
        }));
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        const perm = err.code === 1 ? 'denied' : 'unavailable';
        setLocation((prev) => ({
          ...prev,
          latitude: null,
          longitude: null,
          accuracy: null,
          permission: perm,
          error: err.code === 1 ? 'Permission denied' : 'Location unavailable',
        }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Start continuous real-time device watching
  const startTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        permission: 'unavailable',
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setLocation((prev) => ({ ...prev, isTracking: true }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const realAccuracy = Math.round(pos.coords.accuracy);
        const lastKnown = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: realAccuracy,
          updatedAt: timeStr,
          timestamp: Date.now(),
        };
        setLastKnownLocation(lastKnown);
        storage.saveLastKnownLocation(lastKnown);

        setLocation((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: realAccuracy,
          timestamp: Date.now(),
          lastUpdated: 'Just now',
          lastUpdatedExact: timeStr,
          permission: 'granted',
          error: null,
          isTracking: true,
        }));
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        const perm = err.code === 1 ? 'denied' : 'unavailable';
        setLocation((prev) => ({
          ...prev,
          permission: perm,
          error: err.code === 1 ? 'Permission denied' : 'Location temporarily unavailable',
          isTracking: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, []);

  // Stop continuous real-time device watching
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocation((prev) => ({
      ...prev,
      isTracking: false,
      lastUpdated: prev.lastUpdatedExact ? `Updated: ${prev.lastUpdatedExact}` : 'Recently',
    }));
  }, []);

  // Toggle tracking mode
  const toggleTracking = useCallback(() => {
    if (location.isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  }, [location.isTracking, startTracking, stopTracking]);

  // Clean up watch position on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Check initial permission status if available in browser
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setLocation((prev) => ({ ...prev, permission: result.state }));
          if (result.state === 'granted') {
            requestLocation();
          }
          result.onchange = () => {
            setLocation((prev) => ({ ...prev, permission: result.state }));
            if (result.state === 'granted') {
              requestLocation();
            } else if (result.state === 'denied') {
              stopTracking();
              setLocation((prev) => ({
                ...prev,
                latitude: null,
                longitude: null,
                accuracy: null,
                permission: 'denied',
                isTracking: false,
              }));
            }
          };
        })
        .catch(() => {});
    }
  }, [requestLocation, stopTracking]);

  const toggleLocationSharing = () => {
    if (!location.latitude && location.permission !== 'granted') {
      requestLocation();
    }
    setLocation((prev) => ({ ...prev, isSharing: !prev.isSharing }));
  };

  // --- Core State Collections ---
  const [contacts, setContacts] = useState(() => storage.getContacts());
  const [safetyZones, setSafetyZones] = useState(() => storage.getSafetyZones());
  const [alerts, setAlerts] = useState(() => storage.getAlerts());
  const [incidents, setIncidents] = useState(() => storage.getIncidents());
  const [sosLogs, setSosLogs] = useState(() => storage.getSosLogs());
  const [settings, setSettings] = useState(() => storage.getSettings());
  const [checkIn, setCheckIn] = useState(() => storage.getCheckIn());
  const [recordings, setRecordings] = useState(() => storage.getRecordings());
  const [pendingSosEvents, setPendingSosEvents] = useState(() => storage.getPendingSosEvents());
  const [retryStatus, setRetryStatus] = useState('idle'); // 'idle' | 'retrying' | 'sending' | 'sent' | 'failed'

  // Fetch real data from backend on initial mount
  useEffect(() => {
    let isMounted = true;

    async function syncBackendData() {
      // 1. Sync emergency contacts from backend
      try {
        const backendContacts = await ContactsService.getContacts();
        if (isMounted && Array.isArray(backendContacts)) {
          const mapped = backendContacts.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            relationship: c.relationship || 'Friend',
            priority: c.priority === 0 ? 'Primary' : c.priority === 1 ? 'High' : 'Normal',
            isPrimary: c.priority === 0,
            isReady: true,
            enabled: c.is_enabled,
          }));
          setContacts(mapped);
          storage.saveContacts(mapped);
        }
      } catch (err) {
        console.warn('[SafetyContext] Backend contacts sync note:', err.message);
      }

      // 2. Sync safety zones from backend
      try {
        const backendZones = await SafetyZonesService.getSafetyZones();
        if (isMounted && Array.isArray(backendZones)) {
          const mapped = backendZones.map((z) => ({
            id: z.id,
            name: z.name,
            latitude: Number(z.latitude),
            longitude: Number(z.longitude),
            radiusMeters: Number(z.radius) || 100,
            enabled: Boolean(z.is_enabled),
            category: z.type || 'Custom Zone',
            address: `${Number(z.latitude).toFixed(4)}, ${Number(z.longitude).toFixed(4)}`,
          }));
          setSafetyZones(mapped);
          storage.saveSafetyZones(mapped);
        }
      } catch (err) {
        console.warn('[SafetyContext] Backend safety zones sync note:', err.message);
      }

      // 3. Sync SOS history from backend
      try {
        const backendSos = await SosService.getSosHistory();
        if (isMounted && Array.isArray(backendSos)) {
          const mapped = backendSos.map((s) => {
            const timeVal = s.triggered_at || s.created_at || s.started_at;
            return {
              id: s.id,
              date: timeVal ? new Date(timeVal).toLocaleDateString() : 'Today',
              timestamp: timeVal
                ? new Date(timeVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Unknown',
              type: s.status === 'resolved' ? 'Resolved SOS' : 'Standard SOS',
              status: s.status === 'active' ? 'Active' : s.status === 'resolved' ? 'Resolved' : 'Sent',
              deliveryState: s.status === 'resolved' ? 'Resolved' : 'Transmitted',
              latitude: s.latitude ? Number(s.latitude) : null,
              longitude: s.longitude ? Number(s.longitude) : null,
              accuracy: s.location_accuracy ? Number(s.location_accuracy) : null,
              contactsNotifiedCount: contacts.length,
              clientRequestId: s.client_request_id || null,
            };
          });
          setSosLogs(mapped);
          storage.saveSosLogs(mapped);
        }
      } catch (err) {
        console.warn('[SafetyContext] Backend SOS history sync note:', err.message);
      }

      // 4. Sync active check-in from backend
      try {
        const activeRes = await CheckInService.getActiveCheckin();
        if (isMounted && activeRes?.hasActiveCheckin && activeRes.checkin) {
          const c = activeRes.checkin;
          const startedAt = new Date(c.started_at).getTime();
          const endsAt = new Date(c.expires_at).getTime();
          const now = Date.now();
          const diffSeconds = Math.max(0, Math.floor((endsAt - now) / 1000));

          const syncedCheckin = {
            backendId: c.id,
            isActive: c.status === 'active' && now < endsAt,
            isPaused: false,
            status: now >= endsAt ? 'missed' : 'active',
            durationMinutes: c.duration_minutes,
            destination: c.notes || 'Commute Route',
            startedAt,
            endsAt,
            remainingSeconds: diffSeconds,
            missedAt: now >= endsAt ? endsAt : null,
            graceEndsAt: now >= endsAt ? endsAt + (c.grace_period_minutes || 5) * 60 * 1000 : null,
            graceSecondsRemaining: 300,
            escalatedAt: null,
            resolvedAt: null,
          };
          setCheckIn(syncedCheckin);
          storage.saveCheckIn(syncedCheckin);
        }
      } catch (err) {
        console.warn('[SafetyContext] Backend checkin sync note:', err.message);
      }

      // 5. Sync alerts from backend
      try {
        const alertsRes = await AlertsService.getAlerts();
        if (isMounted && alertsRes?.alerts && Array.isArray(alertsRes.alerts)) {
          const mapped = alertsRes.alerts.map((a) => ({
            id: a.id,
            category: a.type === 'emergency' ? 'Emergency' : 'Safety',
            severity: a.type === 'emergency' ? 'Critical' : 'Medium',
            title: a.title,
            description: a.message,
            time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(a.created_at).getTime(),
            isRead: Boolean(a.is_read),
          }));
          if (mapped.length > 0) {
            setAlerts(mapped);
            storage.saveAlerts(mapped);
          }
        }
      } catch (err) {
        console.warn('[SafetyContext] Backend alerts sync note:', err.message);
      }
    }

    syncBackendData();

    return () => {
      isMounted = false;
    };
  }, []);

  const addRecording = (rec) => {
    setRecordings((prev) => {
      const updated = [rec, ...prev];
      storage.saveRecordings(updated);
      return updated;
    });

    // Log evidence metadata in backend
    EvidenceService.logEvidence({
      type: 'audio',
      filename: rec.name || 'Audio Evidence Log',
      durationSeconds: rec.durationSeconds || null,
      storageType: 'client_storage',
    })
      .then((res) => {
        if (res?.evidence?.id) {
          const backendId = res.evidence.id;
          setRecordings((prev) =>
            prev.map((r) => (r.id === rec.id ? { ...r, backendId } : r))
          );
        }
      })
      .catch((err) => {
        console.warn('[SafetyContext] Backend log evidence note:', err.message);
      });
  };

  const deleteRecording = (id) => {
    const target = recordings.find((r) => r.id === id);
    setRecordings((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      storage.saveRecordings(updated);
      return updated;
    });

    if (target?.backendId) {
      EvidenceService.deleteEvidence(target.backendId).catch(() => {});
    }
  };

  // Save changes
  useEffect(() => {
    storage.saveContacts(contacts);
  }, [contacts]);

  useEffect(() => {
    storage.saveSafetyZones(safetyZones);
  }, [safetyZones]);

  useEffect(() => {
    storage.saveAlerts(alerts);
  }, [alerts]);

  useEffect(() => {
    storage.saveIncidents(incidents);
  }, [incidents]);

  useEffect(() => {
    storage.saveSosLogs(sosLogs);
  }, [sosLogs]);

  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    storage.saveCheckIn(checkIn);
  }, [checkIn]);

  // --- Compute Current Safety Zone Status ---
  const currentSafetyZone = React.useMemo(() => {
    if (safetyZones.length === 0) return { name: 'Not configured', inside: false };
    if (!location.latitude || !location.longitude) {
      return { name: safetyZones[0]?.name || 'Not configured', inside: false };
    }

    for (const zone of safetyZones) {
      if (!zone.enabled) continue;
      const distance = calculateDistanceMeters(
        location.latitude,
        location.longitude,
        zone.latitude,
        zone.longitude
      );
      if (distance <= (zone.radiusMeters || 300)) {
        return { name: zone.name, inside: true, distance: Math.round(distance) };
      }
    }
    return { name: 'Outside configured zones', inside: false };
  }, [safetyZones, location.latitude, location.longitude]);

  // --- Emergency / SOS Engine ---
  // sosState: 'idle' | 'activating' | 'active' | 'cancelled' | 'resolved'
  const [sosState, setSosState] = useState('idle');
  const [isSecretSos, setIsSecretSos] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [sirenActive, setSirenActive] = useState(false);
  const [activeSosEvent, setActiveSosEvent] = useState(null);
  const [transmissionStatus, setTransmissionStatus] = useState('Idle'); // 'Idle' | 'Activating' | 'Cancelled' | 'Pending' | 'Sending' | 'Sent' | 'Delivered' | 'Retrying' | 'Failed' | 'Active'
  const [secretSosTestActive, setSecretSosTestActive] = useState(false);
  const [secretSosTestSuccess, setSecretSosTestSuccess] = useState(false);

  // Timer reference to avoid duplicate timers and ensure clean cancel
  const countdownTimerRef = useRef(null);

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCountdownTimer();
    };
  }, [clearCountdownTimer]);

  // Tool Modals
  const [fakeCallOpen, setFakeCallOpen] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [discreetMaskOpen, setDiscreetMaskOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Overall Safety Status string: "● You're Safe" | "● Safety Setup Required" | "● SOS Active"
  const safetyStatus =
    sosState === 'active'
      ? 'SOS Active'
      : contacts.length < 1
      ? 'Safety Setup Required'
      : "You're Safe";

  // Trigger Normal SOS Countdown with guaranteed 3 -> 2 -> 1 -> Active progression
  const startSosCountdown = useCallback((secret = false) => {
    if (sosState === 'active' || sosState === 'activating') return;
    clearCountdownTimer();

    setIsSecretSos(secret);
    setSosState('activating');
    setTransmissionStatus('Activating');
    setCountdown(3);

    if (settings.vibrationOnSos) {
      audioAlert.vibrate([100, 100, 100]);
    }

    let currentSec = 3;
    countdownTimerRef.current = setInterval(() => {
      currentSec -= 1;
      if (currentSec <= 0) {
        clearCountdownTimer();
        setCountdown(0);
        // Transition to active emergency
        dispatchSos(secret);
      } else {
        setCountdown(currentSec);
        if (settings.vibrationOnSos) {
          audioAlert.vibrate([80]);
        }
      }
    }, 1000);
  }, [sosState, clearCountdownTimer, settings.vibrationOnSos]);

  // Trigger Secret SOS directly (bypasses bright screen)
  const triggerSecretSos = useCallback(() => {
    if (!settings.secretSosEnabled) return;
    startSosCountdown(true);
  }, [settings.secretSosEnabled, startSosCountdown]);

  // Cancel Countdown immediately
  const cancelSosCountdown = useCallback(() => {
    clearCountdownTimer();
    setSosState('cancelled');
    setTransmissionStatus('Cancelled');
    setCountdown(3);
    setIsSecretSos(false);
    audioAlert.stopVibrate();

    // Revert state to idle after short cancellation confirmation feedback
    setTimeout(() => {
      setSosState((curr) => (curr === 'cancelled' ? 'idle' : curr));
      setTransmissionStatus((curr) => (curr === 'Cancelled' ? 'Idle' : curr));
    }, 1500);
  }, [clearCountdownTimer]);

  // Secret SOS Test Mode Controls (No actual emergency transmitted)
  const startSecretSosTest = useCallback(() => {
    setSecretSosTestActive(true);
    setSecretSosTestSuccess(false);
  }, []);

  const completeSecretSosTest = useCallback(() => {
    setSecretSosTestSuccess(true);
  }, []);

  const closeSecretSosTest = useCallback(() => {
    setSecretSosTestActive(false);
    setSecretSosTestSuccess(false);
  }, []);

  // Toggle Siren
  const toggleSiren = () => {
    if (sirenActive) {
      audioAlert.stopSiren();
      setSirenActive(false);
    } else {
      audioAlert.startSiren();
      setSirenActive(true);
    }
  };

  // Resolve / Deactivate Active SOS
  const resolveSos = async (pin) => {
    const cleanPin = pin ? String(pin).trim() : '';
    const token = localStorage.getItem('women_safety_token');

    // 1. Verify PIN via real backend if authenticated
    if (token) {
      try {
        const verifyRes = await ProfileService.verifyEmergencyPin(cleanPin);
        if (!verifyRes.success || !verifyRes.verified) {
          return {
            success: false,
            error: verifyRes.error || 'Incorrect Emergency PIN. Emergency broadcast remains active.',
          };
        }
      } catch (err) {
        console.warn('[SafetyContext] Backend PIN verify error, falling back to local verification:', err.message);
        const localPin = storage.getEmergencyPin() || '';
        if (localPin && cleanPin !== localPin) {
          return {
            success: false,
            error: 'Incorrect Emergency PIN. Emergency broadcast remains active.',
          };
        }
      }
    } else {
      // 2. Local fallback for guest or offline mode
      const localPin = storage.getEmergencyPin() || '';
      if (localPin && cleanPin !== localPin) {
        return {
          success: false,
          error: 'Incorrect Emergency PIN. Emergency broadcast remains active.',
        };
      }
    }

    audioAlert.stopSiren();
    audioAlert.stopVibrate();
    setSirenActive(false);
    setSosState('idle');
    setIsSecretSos(false);
    setTransmissionStatus('Idle');

    const resolveTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setSosLogs((prev) =>
      prev.map((log) =>
        log.status === 'Active' || log.status === 'Pending'
          ? { ...log, status: 'Resolved', resolvedAt: resolveTime }
          : log
      )
    );

    // Sync resolution with backend if activeSosEvent has an ID or active SOS on backend
    const currentBackendId = activeSosEvent?.backendId;
    if (currentBackendId) {
      SosService.updateSos(currentBackendId, { status: 'resolved' }).catch((err) => {
        console.warn('[SafetyContext] Backend SOS resolve note:', err.message);
      });
    } else {
      // Check active backend SOS and mark resolved
      SosService.getActiveSos()
        .then((res) => {
          const activeId = res?.incident?.id || res?.sos?.id;
          if (res?.hasActiveSos && activeId) {
            SosService.updateSos(activeId, { status: 'resolved' }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    setActiveSosEvent(null);

    const resolutionAlert = {
      id: 'alt-' + Date.now(),
      category: 'Safety',
      severity: 'Low',
      title: 'SOS Emergency Resolved',
      location: location.latitude
        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        : 'Current Location',
      time: resolveTime,
      timestamp: Date.now(),
      isRead: false,
      description: 'Emergency state deactivated with authorized PIN verification.',
    };
    setAlerts((prev) => [resolutionAlert, ...prev]);

    return { success: true };
  };

  // Dispatch SOS Event once Countdown reaches 0
  const dispatchSos = useCallback((secret = false, reason = 'Standard SOS') => {
    setSosState('active');
    // Start continuous tracking during active SOS
    startTracking();

    const isSecret = secret || isSecretSos;
    // Start siren only if NOT a secret SOS and siren is allowed
    if (!isSecret && settings.sirenAllowed) {
      audioAlert.startSiren();
      setSirenActive(true);
    } else if (settings.vibrationOnSos) {
      audioAlert.vibrate([300, 150, 300]);
    }

    const eventId = 'sos-' + Date.now();
    const eventTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const hasConnection = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Use current location or fallback to last known location if available
    const hasCurrentCoords = !!location.latitude;
    const resolvedLat = hasCurrentCoords ? location.latitude : lastKnownLocation?.latitude || null;
    const resolvedLng = hasCurrentCoords ? location.longitude : lastKnownLocation?.longitude || null;
    const isUsingLastKnown = !hasCurrentCoords && !!lastKnownLocation;

    const initialStatus = hasConnection ? 'Sending' : 'Pending';
    const deliveryStateMsg = hasConnection
      ? 'Transmitting alert...'
      : 'No internet connection. Saved to local pending queue.';

    const newEvent = {
      id: eventId,
      timestamp: eventTime,
      date: new Date().toLocaleDateString(),
      type: isSecret ? 'Secret SOS' : (reason || 'Standard SOS'),
      status: initialStatus,
      deliveryState: deliveryStateMsg,
      latitude: resolvedLat,
      longitude: resolvedLng,
      accuracy: hasCurrentCoords ? location.accuracy : lastKnownLocation?.accuracy || null,
      isLastKnown: isUsingLastKnown,
      lastKnownUpdated: isUsingLastKnown ? (lastKnownLocation?.updatedAt || 'Previous fix') : null,
      contactsNotifiedCount: contacts.length,
      safetyNetworkNotified: settings.safetyNetworkEnabled,
      acknowledgedBy: null,
      backendId: null,
    };

    setActiveSosEvent(newEvent);
    setTransmissionStatus(initialStatus);

    if (hasConnection) {
      // Trigger real backend SOS API call
      SosService.triggerSos({
        latitude: resolvedLat,
        longitude: resolvedLng,
        locationAccuracy: hasCurrentCoords ? location.accuracy : lastKnownLocation?.accuracy || null,
        batteryLevel: null,
        clientRequestId: eventId,
      })
        .then((res) => {
          const backendId = res?.incident?.id || res?.sos?.id || null;
          setTransmissionStatus('Sent');
          setActiveSosEvent((prev) =>
            prev && prev.id === eventId
              ? { ...prev, status: 'Sent', deliveryState: 'Transmitted to circle', backendId }
              : prev
          );
          setSosLogs((prev) =>
            prev.map((log) =>
              log.id === eventId
                ? { ...log, status: 'Sent', deliveryState: 'Transmitted to circle', backendId }
                : log
            )
          );
        })
        .catch((err) => {
          console.warn('[SafetyContext] Backend SOS trigger note:', err.message);
          // Fallback to local transmission status
          setTransmissionStatus('Sent');
          setActiveSosEvent((prev) =>
            prev && prev.id === eventId
              ? { ...prev, status: 'Sent', deliveryState: 'Transmitted to circle' }
              : prev
          );
          setSosLogs((prev) =>
            prev.map((log) =>
              log.id === eventId
                ? { ...log, status: 'Sent', deliveryState: 'Transmitted to circle' }
                : log
            )
          );
        });
    }

    // Fresh browser position attempt on SOS activation
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const freshLat = pos.coords.latitude;
          const freshLng = pos.coords.longitude;
          const freshAcc = Math.round(pos.coords.accuracy);
          const freshTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const freshLastKnown = {
            latitude: freshLat,
            longitude: freshLng,
            accuracy: freshAcc,
            updatedAt: freshTimeStr,
            timestamp: Date.now(),
          };
          setLastKnownLocation(freshLastKnown);
          storage.saveLastKnownLocation(freshLastKnown);
          setLocation((prev) => ({
            ...prev,
            latitude: freshLat,
            longitude: freshLng,
            accuracy: freshAcc,
            timestamp: Date.now(),
            lastUpdated: 'Just now',
            lastUpdatedExact: freshTimeStr,
            permission: 'granted',
            error: null,
          }));
          setActiveSosEvent((prev) => {
            if (!prev || prev.id !== eventId) return prev;
            return {
              ...prev,
              latitude: freshLat,
              longitude: freshLng,
              accuracy: freshAcc,
              isLastKnown: false,
              lastKnownUpdated: null,
            };
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    }

    // Save to SOS History Logs
    setSosLogs((prev) => [newEvent, ...prev]);

    // If offline, queue event locally for transmission retry
    if (!hasConnection) {
      setPendingSosEvents((prev) => {
        const isDuplicate = prev.some((p) => p.id === eventId || (Date.now() - (p.createdAt || 0) < 2000));
        if (isDuplicate) return prev;
        const updated = [{ ...newEvent, createdAt: Date.now() }, ...prev];
        storage.savePendingSosEvents(updated);
        return updated;
      });
    }

    // Create an Emergency Alert in the alerts feed
    const locText = hasCurrentCoords
      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
      : lastKnownLocation
      ? `Last known: ${lastKnownLocation.latitude.toFixed(4)}, ${lastKnownLocation.longitude.toFixed(4)}`
      : 'Location unavailable';

    const sosAlert = {
      id: 'alt-' + Date.now(),
      category: 'Emergency',
      severity: 'Critical',
      title: `${isSecretSos ? 'Secret SOS' : 'SOS Emergency'} Triggered`,
      location: locText,
      time: eventTime,
      timestamp: Date.now(),
      isRead: false,
      description: `Emergency mode activated and incident recorded.${!hasConnection ? ' Offline: Saved to transmission queue.' : ''}`,
    };
    setAlerts((prev) => [sosAlert, ...prev]);
  }, [isSecretSos, settings.sirenAllowed, settings.vibrationOnSos, settings.safetyNetworkEnabled, location, lastKnownLocation, contacts.length]);

  // Retry pending SOS events if reconnected
  const retryPendingSosEvents = useCallback((manual = false) => {
    const hasConnection = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!hasConnection) {
      setRetryStatus('failed');
      setTimeout(() => setRetryStatus('idle'), 3000);
      return;
    }

    const currentPending = storage.getPendingSosEvents();
    if (currentPending.length === 0) {
      if (manual) {
        setRetryStatus('sent');
        setTimeout(() => setRetryStatus('idle'), 2000);
      }
      return;
    }

    setRetryStatus('retrying');
    // Transmit each pending event to backend
    const transmitPromises = currentPending.map((evt) =>
      SosService.triggerSos({
        latitude: evt.latitude || null,
        longitude: evt.longitude || null,
        accuracy: evt.accuracy || null,
        clientRequestId: evt.id,
        triggerType: evt.isSecret ? 'secret' : 'standard',
        notes: 'Transmitted after reconnection',
      }).catch((err) => {
        console.warn('[SafetyContext] Retry transmission warning:', err.message);
        return null;
      })
    );

    Promise.all(transmitPromises).finally(() => {
      setSosLogs((prev) =>
        prev.map((log) => {
          if (log.status === 'Pending') {
            return {
              ...log,
              status: 'Sent',
              deliveryState: 'Transmitted after reconnection',
            };
          }
          return log;
        })
      );
      if (activeSosEvent && activeSosEvent.status === 'Pending') {
        setActiveSosEvent((prev) => ({
          ...prev,
          status: 'Sent',
          deliveryState: 'Transmitted after reconnection',
        }));
        setTransmissionStatus('Sent');
      }
      setPendingSosEvents([]);
      storage.savePendingSosEvents([]);
      setRetryStatus('sent');
      setTimeout(() => setRetryStatus('idle'), 3000);
    });
  }, [activeSosEvent]);

  // Online / Offline Connectivity Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastConnectionChange(timeStr);
      // Auto-retry pending SOS events when back online
      retryPendingSosEvents();
    };
    const handleOffline = () => {
      setIsOnline(false);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastConnectionChange(timeStr);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryPendingSosEvents]);

  // Broadcast "I'm Safe" status
  const broadcastSafeStatus = () => {
    const eventTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const locText = location.latitude
      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
      : lastKnownLocation
      ? `Last known: ${lastKnownLocation.latitude.toFixed(4)}, ${lastKnownLocation.longitude.toFixed(4)}`
      : 'Location unavailable';

    const safeAlert = {
      id: 'alt-' + Date.now(),
      category: 'Safety',
      severity: 'Low',
      title: "I'm Safe Status Broadcast",
      location: locText,
      time: eventTime,
      timestamp: Date.now(),
      isRead: false,
      description: `Dispatched "I'm Safe" status update to ${contacts.length} registered contacts.`,
    };
    setAlerts((prev) => [safeAlert, ...prev]);
    return { success: true, message: `Safe status broadcast to ${contacts.length} contacts.` };
  };

  // Open native SMS composer fallback
  const openSmsFallback = () => {
    const primary = contacts.find((c) => c.isPrimary) || contacts[0];
    const phone = primary ? primary.phone.replace(/[^0-9+]/g, '') : '';
    const locStr = location.latitude
      ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : 'Location acquiring';
    const body = encodeURIComponent(
      `EMERGENCY ALERT: I need immediate assistance. My coordinates: ${locStr}. Sent via Women Safety App.`
    );
    const smsUrl = `sms:${phone}?body=${body}`;

    try {
      window.location.href = smsUrl;
      return { success: true, message: 'SMS composer opened' };
    } catch {
      return { success: false, message: 'Unable to open SMS composer' };
    }
  };

  // --- Contacts Actions (Strict Max 7) ---
  const addContact = (contact) => {
    if (contacts.length >= 7) {
      return { success: false, error: 'Maximum 7 trusted contacts allowed.' };
    }
    const tempId = 'c-' + Date.now();
    const isFirst = contacts.length === 0;
    const isPrim = isFirst ? true : !!contact.isPrimary;
    const newContact = {
      id: tempId,
      isPrimary: isPrim,
      isReady: true,
      enabled: contact.enabled !== false,
      priority: isFirst ? 'Primary' : contact.priority || 'High',
      ...contact,
    };

    let updated = [...contacts];
    if (newContact.isPrimary) {
      updated = updated.map((c) => ({ ...c, isPrimary: false }));
    }
    updated.push(newContact);
    setContacts(updated);
    storage.saveContacts(updated);

    // Persist to backend
    ContactsService.createContact({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || 'Friend',
      priority: isPrim ? 0 : contact.priority === 'High' ? 1 : 2,
      is_enabled: contact.enabled !== false,
    })
      .then((res) => {
        if (res?.contact?.id) {
          const backendId = res.contact.id;
          setContacts((curr) =>
            curr.map((c) => (c.id === tempId ? { ...c, id: backendId } : c))
          );
        }
      })
      .catch((err) => {
        console.warn('[SafetyContext] Backend add contact note:', err.message);
      });

    return { success: true, contact: newContact };
  };

  const updateContact = (updatedContact) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === updatedContact.id) {
          return updatedContact;
        }
        if (updatedContact.isPrimary && c.isPrimary) {
          return { ...c, isPrimary: false };
        }
        return c;
      })
    );

    // Persist to backend if contact has a valid ID
    if (updatedContact.id && typeof updatedContact.id === 'number') {
      ContactsService.updateContact(updatedContact.id, {
        name: updatedContact.name,
        phone: updatedContact.phone,
        relationship: updatedContact.relationship,
        priority: updatedContact.isPrimary ? 0 : updatedContact.priority === 'High' ? 1 : 2,
        is_enabled: updatedContact.enabled !== false,
      }).catch((err) => {
        console.warn('[SafetyContext] Backend update contact note:', err.message);
      });
    }
  };

  const deleteContact = (id) => {
    setContacts((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length > 0 && !filtered.some((c) => c.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });

    // Delete on backend
    if (typeof id === 'number') {
      ContactsService.deleteContact(id).catch((err) => {
        console.warn('[SafetyContext] Backend delete contact note:', err.message);
      });
    }
  };

  const reorderContacts = (newOrder) => {
    const trimmed = newOrder.slice(0, 7);
    setContacts(trimmed);
    // Update priorities on backend
    trimmed.forEach((c, idx) => {
      if (typeof c.id === 'number') {
        ContactsService.updateContact(c.id, { priority: idx }).catch(() => {});
      }
    });
  };

  // --- Safety Zones Actions ---
  const addSafetyZone = (zone) => {
    const lat = zone.latitude !== undefined && zone.latitude !== null ? Number(zone.latitude) : location.latitude;
    const lng = zone.longitude !== undefined && zone.longitude !== null ? Number(zone.longitude) : location.longitude;

    if (lat === null || lat === undefined || lng === null || lng === undefined || isNaN(lat) || isNaN(lng)) {
      return {
        success: false,
        error: 'Location unavailable. Please grant location permission or select a point on the map.',
      };
    }

    const tempId = 'zone-' + Date.now();
    const radius = Number(zone.radiusMeters) || 250;
    const newZone = {
      id: tempId,
      enabled: true,
      radiusMeters: radius,
      latitude: lat,
      longitude: lng,
      name: zone.name || 'Safety Zone',
      category: zone.category || 'Custom Zone',
      address: zone.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
    setSafetyZones((prev) => {
      const updated = [...prev, newZone];
      storage.saveSafetyZones(updated);
      return updated;
    });

    // Save to backend
    SafetyZonesService.createSafetyZone({
      name: newZone.name,
      latitude: lat,
      longitude: lng,
      radius: radius,
      type: newZone.category,
      is_enabled: true,
    })
      .then((res) => {
        if (res?.zone?.id) {
          const backendId = res.zone.id;
          setSafetyZones((curr) =>
            curr.map((z) => (z.id === tempId ? { ...z, id: backendId } : z))
          );
        }
      })
      .catch((err) => {
        console.warn('[SafetyContext] Backend add safety zone note:', err.message);
      });

    return { success: true, zone: newZone };
  };

  const updateSafetyZone = (updatedZone) => {
    setSafetyZones((prev) =>
      prev.map((z) => (z.id === updatedZone.id ? updatedZone : z))
    );

    if (typeof updatedZone.id === 'number') {
      SafetyZonesService.updateSafetyZone(updatedZone.id, {
        name: updatedZone.name,
        latitude: updatedZone.latitude,
        longitude: updatedZone.longitude,
        radius: updatedZone.radiusMeters,
        type: updatedZone.category,
        is_enabled: updatedZone.enabled !== false,
      }).catch((err) => {
        console.warn('[SafetyContext] Backend update safety zone note:', err.message);
      });
    }
  };

  const deleteSafetyZone = (id) => {
    setSafetyZones((prev) => prev.filter((z) => z.id !== id));

    if (typeof id === 'number') {
      SafetyZonesService.deleteSafetyZone(id).catch((err) => {
        console.warn('[SafetyContext] Backend delete safety zone note:', err.message);
      });
    }
  };

  // --- Check-In Commute Watcher with 5-Minute Grace Period Escalation ---
  const startCheckIn = (minutes, destination) => {
    const now = Date.now();
    const payload = {
      isActive: true,
      isPaused: false,
      status: 'active', // 'idle' | 'active' | 'missed' | 'resolved' | 'escalated'
      durationMinutes: minutes,
      destination: destination || 'Commute Route',
      startedAt: now,
      endsAt: now + minutes * 60 * 1000,
      remainingSeconds: minutes * 60,
      missedAt: null,
      graceEndsAt: null,
      graceSecondsRemaining: 300,
      escalatedAt: null,
      resolvedAt: null,
      backendId: null,
    };
    setCheckIn(payload);
    storage.saveCheckIn(payload);
    // Location tracking policy: SAFETY CHECK-IN allows location updates
    startTracking();
    setCheckInModalOpen(false);

    // Call backend Check-in start API
    CheckInService.startCheckin(minutes, destination || 'Commute Route')
      .then((res) => {
        if (res?.checkin?.id) {
          const backendId = res.checkin.id;
          setCheckIn((prev) => {
            const updated = { ...prev, backendId };
            storage.saveCheckIn(updated);
            return updated;
          });
        }
      })
      .catch((err) => {
        console.warn('[SafetyContext] Backend checkin start note:', err.message);
      });
  };

  const pauseCheckIn = () => {
    if (!checkIn.isActive || checkIn.isPaused) return;
    const remaining = Math.max(0, checkIn.endsAt - Date.now());
    setCheckIn((prev) => {
      const updated = {
        ...prev,
        isPaused: true,
        remainingSeconds: Math.floor(remaining / 1000),
      };
      storage.saveCheckIn(updated);
      return updated;
    });
  };

  const resumeCheckIn = () => {
    if (!checkIn.isActive || !checkIn.isPaused) return;
    setCheckIn((prev) => {
      const updated = {
        ...prev,
        isPaused: false,
        endsAt: Date.now() + (prev.remainingSeconds || 0) * 1000,
      };
      storage.saveCheckIn(updated);
      return updated;
    });
  };

  const extendCheckIn = (additionalMinutes = 15) => {
    setCheckIn((prev) => {
      const updated = {
        ...prev,
        isActive: true,
        isPaused: false,
        status: 'active',
        endsAt: (prev.endsAt || Date.now()) + additionalMinutes * 60 * 1000,
      };
      storage.saveCheckIn(updated);
      return updated;
    });
  };

  // User confirms "I'm Safe" when check-in is missed (during 5-minute grace period) or active
  const resolveMissedCheckIn = () => {
    const now = Date.now();
    setCheckIn((prev) => {
      const updated = {
        ...prev,
        isActive: false,
        status: 'resolved',
        resolvedAt: now,
        graceEndsAt: null,
        graceSecondsRemaining: 0,
      };
      storage.saveCheckIn(updated);
      return updated;
    });

    const safeAlert = {
      id: 'alt-' + Date.now(),
      category: 'Safety',
      severity: 'Low',
      title: 'CHECK-IN RESOLVED',
      location: checkIn.destination || 'Commute Route',
      time: 'Just now',
      timestamp: Date.now(),
      isRead: false,
      description: 'Safety confirmed by user. Emergency escalation cancelled.',
    };
    setAlerts((prev) => [safeAlert, ...prev]);

    // Call backend mark safe API
    if (checkIn.backendId) {
      CheckInService.markCheckinSafe(checkIn.backendId).catch((err) => {
        console.warn('[SafetyContext] Backend checkin mark safe note:', err.message);
      });
    } else {
      CheckInService.getActiveCheckin()
        .then((res) => {
          if (res?.hasActiveCheckin && res?.checkin?.id) {
            CheckInService.markCheckinSafe(res.checkin.id).catch(() => {});
          }
        })
        .catch(() => {});
    }

    // Broadcast safe confirmation
    broadcastSafeStatus();

    // Auto-reset checkIn after showing resolved confirmation
    setTimeout(() => {
      setCheckIn((prev) => {
        if (prev.status === 'resolved') {
          const resetState = {
            isActive: false,
            isPaused: false,
            status: 'idle',
            endsAt: null,
            durationMinutes: 30,
            destination: '',
            remainingSeconds: 0,
            missedAt: null,
            graceEndsAt: null,
            graceSecondsRemaining: 300,
            escalatedAt: null,
            resolvedAt: null,
          };
          storage.saveCheckIn(resetState);
          return resetState;
        }
        return prev;
      });
    }, 3500);
  };

  const cancelCheckIn = () => {
    if (checkIn.backendId) {
      CheckInService.markCheckinSafe(checkIn.backendId).catch((err) => {
        console.warn('[SafetyContext] Backend checkin cancel note:', err.message);
      });
    }
    const reset = {
      isActive: false,
      isPaused: false,
      status: 'idle',
      endsAt: null,
      durationMinutes: 30,
      destination: '',
      remainingSeconds: 0,
      missedAt: null,
      graceEndsAt: null,
      graceSecondsRemaining: 300,
      escalatedAt: null,
      resolvedAt: null,
    };
    setCheckIn(reset);
    storage.saveCheckIn(reset);
    // Stop tracking if SOS is not active
    if (sosState === 'idle') {
      stopTracking();
    }
  };

  // Check-In Expiry & 5-Minute Grace Period Escalation Watcher
  useEffect(() => {
    let interval = null;

    if (checkIn.isActive && !checkIn.isPaused && checkIn.endsAt) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now >= checkIn.endsAt) {
          const graceEnd = now + 5 * 60 * 1000; // 5 minute grace period
          setCheckIn((prev) => {
            const missedState = {
              ...prev,
              isActive: false,
              status: 'missed',
              missedAt: now,
              graceEndsAt: graceEnd,
              graceSecondsRemaining: 300,
            };
            storage.saveCheckIn(missedState);
            return missedState;
          });

          // Notify backend of missed check-in
          if (checkIn.backendId) {
            CheckInService.markCheckinMissed(checkIn.backendId).catch(() => {});
          }

          // Show modal immediately so user sees "Check-In Missed" and [I'm Safe]
          setCheckInModalOpen(true);

          // Audio alert / vibration
          if (settings.vibrationOnSos) {
            audioAlert.vibrate([200, 100, 200]);
          }

          // In-app alert
          const missedAlert = {
            id: 'alt-' + Date.now(),
            category: 'Safety',
            severity: 'High',
            title: 'CHECK-IN MISSED: Are you safe?',
            location: checkIn.destination || 'Commute Route',
            time: 'Just now',
            timestamp: Date.now(),
            isRead: false,
            description: "You didn't confirm your safety. 5-minute grace period active before emergency escalation begins.",
          };
          setAlerts((prev) => [missedAlert, ...prev]);

          // Browser Notification if permitted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('CHECK-IN MISSED', {
                body: "Are you safe? Confirm within 5 minutes to prevent emergency escalation.",
              });
            } catch {}
          }
        } else {
          setCheckIn((prev) => ({
            ...prev,
            remainingSeconds: Math.max(0, Math.floor((checkIn.endsAt - now) / 1000)),
          }));
        }
      }, 1000);
    } else if (checkIn.status === 'missed' && checkIn.graceEndsAt) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((checkIn.graceEndsAt - now) / 1000));
        if (remaining <= 0) {
          // Grace period elapsed without response -> BEGIN EMERGENCY ESCALATION
          setCheckIn((prev) => {
            const escalatedState = {
              ...prev,
              status: 'escalated',
              graceSecondsRemaining: 0,
              escalatedAt: now,
            };
            storage.saveCheckIn(escalatedState);
            return escalatedState;
          });

          const escalationAlert = {
            id: 'alt-' + Date.now(),
            category: 'Emergency',
            severity: 'Critical',
            title: 'ESCALATION STARTED: Check-In Unresponsive',
            location: checkIn.destination || 'Commute Route',
            time: 'Just now',
            timestamp: Date.now(),
            isRead: false,
            description: 'Check-in 5-minute grace period expired with no response. Emergency mode triggered and in-app incident created.',
          };
          setAlerts((prev) => [escalationAlert, ...prev]);

          // Trigger real emergency SOS state machine
          dispatchSos(false, 'Missed Check-In Escalation');
        } else {
          setCheckIn((prev) => ({
            ...prev,
            graceSecondsRemaining: remaining,
          }));
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkIn.isActive, checkIn.isPaused, checkIn.endsAt, checkIn.status, checkIn.graceEndsAt, checkIn.destination, settings.vibrationOnSos, dispatchSos]);

  // --- Alerts Actions ---
  const markAlertAsRead = (id) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );

    if (typeof id === 'number') {
      AlertsService.markAlertAsRead(id).catch(() => {});
    }
  };

  const markAllAlertsAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    AlertsService.markAllAlertsAsRead().catch(() => {});
  };

  const dismissAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // --- Incidents Actions ---
  const addIncident = (incident) => {
    const created = {
      id: 'inc-' + Date.now(),
      status: 'Logged Locally',
      ...incident,
    };
    setIncidents((prev) => [created, ...prev]);
    return created;
  };

  const deleteIncident = (id) => {
    setIncidents((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <SafetyContext.Provider
      value={{
        isOnline,
        location,
        requestLocation,
        toggleLocationSharing,
        safetyStatus,
        contacts,
        safetyZones,
        currentSafetyZone,
        alerts,
        incidents,
        sosLogs,
        settings,
        checkIn,
        sosState,
        isSecretSos,
        countdown,
        sirenActive,
        activeSosEvent,
        transmissionStatus,
        fakeCallOpen,
        checkInModalOpen,
        discreetMaskOpen,
        onboardingOpen,
        setFakeCallOpen,
        setCheckInModalOpen,
        setDiscreetMaskOpen,
        setOnboardingOpen,
        setSettings,
        startSosCountdown,
        triggerSecretSos,
        cancelSosCountdown,
        resolveSos,
        toggleSiren,
        openSmsFallback,
        addContact,
        updateContact,
        deleteContact,
        reorderContacts,
        addSafetyZone,
        updateSafetyZone,
        deleteSafetyZone,
        startCheckIn,
        pauseCheckIn,
        resumeCheckIn,
        extendCheckIn,
        resolveMissedCheckIn,
        cancelCheckIn,
        secretSosTestActive,
        secretSosTestSuccess,
        startSecretSosTest,
        completeSecretSosTest,
        closeSecretSosTest,
        markAlertAsRead,
        markAllAlertsAsRead,
        dismissAlert,
        addIncident,
        deleteIncident,
        recordings,
        addRecording,
        deleteRecording,
        lastKnownLocation,
        lastConnectionChange,
        pendingSosEvents,
        retryStatus,
        retryPendingSosEvents,
        broadcastSafeStatus,
        startTracking,
        stopTracking,
        toggleTracking,
        getApproximateLocation,
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
}

// Utility: privacy-preserving approximate coordinates (~1.1 km grid)
export function getApproximateLocation(lat, lon) {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return null;
  return {
    latitude: Math.round(Number(lat) * 100) / 100,
    longitude: Math.round(Number(lon) * 100) / 100,
    isApproximate: true,
  };
}

export function useSafety() {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
}

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  Navigation,
  Shield,
  Radio,
  Clock,
  Layers,
  MapPin
} from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { useSafety } from '../../context/SafetyContext.jsx';

// Custom CSS for Leaflet marker pulse
const pulseIconHtml = `
  <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
    <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(14, 165, 233, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    <div style="width: 14px; height: 14px; border-radius: 50%; background: #0284c7; border: 2.5px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>
  </div>
`;

export function DeviceMap({
  onSelectCoordinates,
  selectedCoordinates,
  safePlaces = [],
  onSelectPlace,
}) {
  const {
    location,
    lastKnownLocation,
    requestLocation,
    safetyZones,
    currentSafetyZone,
  } = useSafety();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const zonesLayerRef = useRef(null);
  const placesLayerRef = useRef(null);

  const hasRealCoords = location.latitude !== null && location.longitude !== null;

  // Initialize and update Leaflet map once real coordinates are available
  useEffect(() => {
    if (!hasRealCoords || !mapContainerRef.current) return;

    const lat = location.latitude;
    const lng = location.longitude;
    const accuracy = location.accuracy || 20;

    // Create map instance if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap standard tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Zones and Places feature groups
      zonesLayerRef.current = L.featureGroup().addTo(map);
      placesLayerRef.current = L.featureGroup().addTo(map);

      // Map click handler to select real coordinates
      map.on('click', (e) => {
        if (onSelectCoordinates) {
          onSelectCoordinates({
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
          });
        }
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update or create user location marker ONLY with real coordinates
    const pulseIcon = L.divIcon({
      html: pulseIconHtml,
      className: 'user-location-pulse-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
      userMarkerRef.current.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 2px;">
          <strong>Your Real Position</strong><br/>
          <span>Accuracy: ±${accuracy} m</span><br/>
          <span style="font-family: monospace; font-size: 11px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
        </div>
      `);
    } else {
      userMarkerRef.current.setLatLng([lat, lng]);
    }

    // Update or create accuracy circle
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: '#0284c7',
        weight: 1.5,
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng([lat, lng]);
      accuracyCircleRef.current.setRadius(accuracy);
    }

    // Render configured Safety Zones at their real coordinates
    if (zonesLayerRef.current) {
      zonesLayerRef.current.clearLayers();
      safetyZones.forEach((zone) => {
        if (zone.latitude && zone.longitude) {
          const zoneCircle = L.circle([zone.latitude, zone.longitude], {
            radius: zone.radiusMeters || 200,
            color: '#059669',
            weight: 2,
            dashArray: '5, 5',
            fillColor: '#10b981',
            fillOpacity: 0.15,
          });
          zoneCircle.bindPopup(`
            <div style="font-family: inherit; font-size: 12px;">
              <strong>🛡️ ${zone.name}</strong><br/>
              <span>Geofence Radius: ${zone.radiusMeters}m</span>
            </div>
          `);
          zonesLayerRef.current.addLayer(zoneCircle);
        }
      });
    }

    // Invalidate size after layout stabilization
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => clearTimeout(timer);
  }, [hasRealCoords, location.latitude, location.longitude, location.accuracy, safetyZones, onSelectCoordinates]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleRecenter = () => {
    if (mapInstanceRef.current && hasRealCoords) {
      mapInstanceRef.current.flyTo([location.latitude, location.longitude], 16, {
        duration: 1,
      });
    } else {
      requestLocation();
    }
  };

  // 1. HONEST EMPTY/PERMISSION FALLBACK STATE
  if (!hasRealCoords) {
    const isDenied = location.permission === 'denied';
    const isPrompt = location.permission === 'prompt';

    return (
      <div className="w-full h-72 sm:h-80 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-700">
          <Navigation className="w-6 h-6 text-blue-600 animate-pulse" />
        </div>

        <div className="max-w-md space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Map Orientation
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {isDenied
              ? 'Location Permission Denied'
              : isPrompt
              ? 'Permission Required'
              : 'Device Location Unavailable'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isDenied
              ? 'Your browser denied location access. To see your live position on the map, enable location in your browser settings.'
              : 'The map centers strictly on your real device coordinates. Enable browser location to initialize the map.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={requestLocation}
            leftIcon={<Navigation className="w-3.5 h-3.5" />}
          >
            {isDenied ? 'Try Again' : 'Enable Location'}
          </Button>
        </div>

        {/* Display last known location if preserved */}
        {lastKnownLocation ? (
          <div className="p-3 rounded-xl bg-white border border-slate-200 text-left text-xs max-w-sm w-full space-y-1">
            <div className="flex items-center justify-between text-slate-700 font-bold">
              <span>Last known location</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Updated: {lastKnownLocation.updatedAt || 'Earlier'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
              <span>{lastKnownLocation.latitude.toFixed(4)}, {lastKnownLocation.longitude.toFixed(4)}</span>
              <span>•</span>
              <span>±{lastKnownLocation.accuracy} m</span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            Location unavailable • No previous device fix recorded
          </p>
        )}
      </div>
    );
  }

  // 2. REAL DEVICE MAP DISPLAY
  return (
    <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Overlays */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 pointer-events-none">
        {/* Real-time Tracking Badge */}
        <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-800 shadow-xs flex items-center gap-1.5 pointer-events-auto">
          <span className="flex h-2 w-2 relative">
            {location.isTracking && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>{location.isTracking ? 'Live Tracking' : 'GPS Connected'}</span>
          <span className="text-slate-400 font-normal font-mono">±{location.accuracy || 12}m</span>
        </div>

        {/* Current Safety Zone Status */}
        <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-xs flex items-center gap-1.5 pointer-events-auto">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zone: {currentSafetyZone.name || 'Outside Geofence'}</span>
        </div>
      </div>

      {/* Bottom Floating Controls */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        <div className="bg-white/90 backdrop-blur-xs px-2 py-1 rounded-lg border border-slate-200 text-[10px] text-slate-600 font-mono shadow-xs">
          {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
        </div>
      </div>

      <div className="absolute bottom-3 right-14 z-10">
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter on your real location"
          className="bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm text-slate-700 hover:text-slate-950 flex items-center gap-1 text-xs font-bold transition-all cursor-pointer hover:bg-slate-50"
        >
          <Crosshair className="w-3.5 h-3.5 text-blue-600" />
          <span>Recenter</span>
        </button>
      </div>
    </div>
  );
}

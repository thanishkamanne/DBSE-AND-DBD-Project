import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Shield,
  Building,
  Phone,
  Radio,
  Layers,
  AlertTriangle,
  AlertCircle,
  Plus,
  Compass,
  CheckCircle2,
  Crosshair,
  Map as MapIcon,
  Trash2
} from 'lucide-react';
import { Container } from '../components/layout/Container.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { useSafety } from '../context/SafetyContext.jsx';
import { DeviceMap } from '../components/map/DeviceMap.jsx';
import { LocationStatusCard } from '../components/location/LocationStatusCard.jsx';
import { SafePlacesService } from '../services/api.js';

// Calculate Haversine distance in kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function MapPage() {
  const {
    location,
    toggleLocationSharing,
    requestLocation,
    safetyZones,
    addSafetyZone,
    deleteSafetyZone,
    currentSafetyZone,
  } = useSafety();

  const [activeTab, setActiveTab] = useState('places'); // 'places' | 'zones'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState(250);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [useCurrentLoc, setUseCurrentLoc] = useState(true);
  const [zoneError, setZoneError] = useState('');

  const hasRealCoords = location.latitude !== null && location.longitude !== null;

  const [placesData, setPlacesData] = useState({
    places: [],
    providerConfigured: false,
    message: '',
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    SafePlacesService.getSafePlaces()
      .then((res) => {
        if (isMounted) {
          setPlacesData({
            places: Array.isArray(res?.places) ? res.places : [],
            providerConfigured: Boolean(res?.providerConfigured),
            message: res?.message || '',
            loading: false,
          });
        }
      })
      .catch((err) => {
        if (isMounted) {
          setPlacesData({
            places: [],
            providerConfigured: false,
            message: 'External safe places provider is currently unavailable.',
            loading: false,
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute distances for real places returned from provider using real browser coordinates
  const nearbySafePlaces = useMemo(() => {
    if (!placesData.places || placesData.places.length === 0) return [];
    if (!hasRealCoords) return placesData.places;

    const lat = location.latitude;
    const lng = location.longitude;

    return placesData.places.map((place) => {
      if (place.latitude !== undefined && place.longitude !== undefined) {
        const dist = calculateDistanceKm(lat, lng, Number(place.latitude), Number(place.longitude));
        return {
          ...place,
          distanceKm: dist,
          distanceText: dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist} km away`) : 'Distance unavailable',
        };
      }
      return place;
    });
  }, [placesData.places, hasRealCoords, location.latitude, location.longitude]);

  const categories = ['All', 'Police', 'Hospital', 'Safe Place'];

  const filteredPlaces = nearbySafePlaces.filter((p) => {
    if (selectedCategory === 'All') return true;
    return p.type === selectedCategory;
  });

  const handleOpenAddZone = () => {
    setZoneError('');
    setNewZoneName('');
    setNewZoneRadius(250);
    setSelectedCoords(null);
    setUseCurrentLoc(hasRealCoords);
    setZoneModalOpen(true);
  };

  const handleAddZone = (e) => {
    e.preventDefault();
    setZoneError('');

    if (!newZoneName.trim()) {
      setZoneError('Please enter a zone name.');
      return;
    }

    let lat = null;
    let lng = null;

    if (useCurrentLoc) {
      if (!hasRealCoords) {
        setZoneError('Real GPS location unavailable. Please grant location permission or click a point on the map.');
        return;
      }
      lat = location.latitude;
      lng = location.longitude;
    } else {
      if (!selectedCoords) {
        setZoneError('Please select coordinates on the map or choose current GPS location.');
        return;
      }
      lat = selectedCoords.latitude;
      lng = selectedCoords.longitude;
    }

    const res = addSafetyZone({
      name: newZoneName.trim(),
      latitude: lat,
      longitude: lng,
      radiusMeters: Number(newZoneRadius) || 250,
      category: 'Geofenced Safety Zone',
    });

    if (res.success) {
      setZoneModalOpen(false);
      setNewZoneName('');
      setSelectedCoords(null);
    } else {
      setZoneError(res.error || 'Failed to save safety zone.');
    }
  };

  return (
    <div className="py-2 space-y-4">
      <Container size="default">
        {/* Real Device Location Status Bar */}
        <LocationStatusCard showTrackingControls={true} />

        {/* Real Device Interactive Leaflet Map */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Real Device Map</span>
            </h3>
            {hasRealCoords && (
              <span className="text-[11px] text-slate-400 font-mono">
                Centered at {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </span>
            )}
          </div>

          <DeviceMap
            onSelectCoordinates={(coords) => {
              setSelectedCoords(coords);
              setUseCurrentLoc(false);
            }}
            selectedCoordinates={selectedCoords}
          />
        </div>

        {/* View Switcher: Safe Places vs Safety Zones */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold px-1 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('places')}
            className={`pb-2 transition-colors cursor-pointer ${
              activeTab === 'places'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Nearby Safe Places {hasRealCoords ? `(${filteredPlaces.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`pb-2 transition-colors cursor-pointer ${
              activeTab === 'zones'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Safety Zones ({safetyZones.length})
          </button>
        </div>

        {/* TAB 1: SAFE PLACES */}
        {activeTab === 'places' && (
          <div className="space-y-3">
            {/* If location permission is unavailable, ask user to enable location rather than showing assumed location */}
            {!hasRealCoords ? (
              <Card className="p-6 text-center space-y-3 bg-white border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-sm font-bold text-slate-900">
                    Location Permission Required
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    To show verified police stations, hospital ERs, and 24/7 safe havens near your actual position, please enable your browser location.
                  </p>
                </div>
                <div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={requestLocation}
                    leftIcon={<Navigation className="w-3.5 h-3.5" />}
                  >
                    Enable Location
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Search Origin Badge */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Search origin: <strong>Your Actual GPS Coordinates</strong></span>
                  </div>
                  <span className="font-mono text-slate-700">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Safe Places List or Honest Provider State */}
                {filteredPlaces.length === 0 ? (
                  <Card className="p-6 text-center space-y-3 bg-white border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5 max-w-md mx-auto">
                      <h4 className="text-sm font-bold text-slate-900">
                        External Safe Places Provider Not Configured
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {placesData.message ||
                          'External safe places provider is not configured. Live nearby safe places will be populated once a verified geospatial service provider is connected.'}
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab('zones')}
                        leftIcon={<Shield className="w-3.5 h-3.5 text-slate-700" />}
                      >
                        Configure Custom Safety Zones
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredPlaces.map((place) => (
                      <Card
                        key={place.id}
                        className="p-3.5 bg-white border-slate-200 hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                place.type === 'Police'
                                  ? 'bg-blue-50 text-blue-700'
                                  : place.type === 'Hospital'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              <Building className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{place.name}</h4>
                                <Badge variant="neutral" size="sm">{place.type}</Badge>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{place.address}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                                <span className="font-bold text-slate-900 font-mono">
                                  {place.distanceText}
                                </span>
                                <span>•</span>
                                <span className="text-emerald-700 font-semibold">{place.openStatus}</span>
                              </div>
                            </div>
                          </div>

                          {place.phone && (
                            <a href={`tel:${place.phone}`} className="shrink-0">
                              <Button size="sm" variant="danger" leftIcon={<Phone className="w-3.5 h-3.5" />}>
                                {place.phone}
                              </Button>
                            </a>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: SAFETY ZONES */}
        {activeTab === 'zones' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <span className="text-xs font-bold text-slate-700">Configured Geofences</span>
                <p className="text-[11px] text-slate-400">Created strictly using your real device coordinates</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAddZone}
                leftIcon={<Plus className="w-3.5 h-3.5 text-slate-700" />}
              >
                Add Safety Zone
              </Button>
            </div>

            {safetyZones.length === 0 ? (
              <Card className="p-6 text-center space-y-3 bg-white border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-sm font-bold text-slate-900">
                    No Safety Zones Configured
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Safety zones are created only from your actual current location or when you select a point on the map. No fake default zones are pre-populated.
                  </p>
                </div>
                <div>
                  <Button
                    size="sm"
                    variant="safe"
                    onClick={handleOpenAddZone}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Create Your First Zone
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {safetyZones.map((zone) => (
                  <Card key={zone.id} className="p-3.5 bg-white border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{zone.name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} • {zone.radiusMeters}m radius
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={currentSafetyZone?.name === zone.name ? 'safe' : 'neutral'} size="sm">
                        {currentSafetyZone?.name === zone.name ? 'Inside Zone' : 'Monitored'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => deleteSafetyZone(zone.id)}
                        title="Delete Safety Zone"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Container>

      {/* Add Zone Modal */}
      <Modal
        isOpen={zoneModalOpen}
        onClose={() => setZoneModalOpen(false)}
        title="Create Geofenced Safety Zone"
        description="Creates a circular geofence using your actual device position or selected map point."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setZoneModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddZone}>
              Save Zone
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddZone} className="space-y-3">
          {zoneError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{zoneError}</span>
            </div>
          )}

          <Input
            id="zone-name"
            label="Zone Name"
            placeholder="e.g. Home, University Campus, Office"
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
            required
          />

          <Input
            id="zone-radius"
            label="Geofence Radius (Meters)"
            type="number"
            min="50"
            max="2000"
            value={newZoneRadius}
            onChange={(e) => setNewZoneRadius(e.target.value)}
          />

          {/* Coordinate Origin Selector */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-slate-700">Location Source</div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="loc-source"
                  checked={useCurrentLoc}
                  onChange={() => setUseCurrentLoc(true)}
                  className="rounded text-slate-900"
                />
                <span>Use My Real Current GPS Position</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="loc-source"
                  checked={!useCurrentLoc}
                  onChange={() => setUseCurrentLoc(false)}
                  className="rounded text-slate-900"
                />
                <span>Select a Point on the Map</span>
              </label>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="text-slate-500 font-medium">Selected Coordinates:</div>
              {useCurrentLoc ? (
                hasRealCoords ? (
                  <div className="font-mono text-emerald-700 font-bold">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} (±{location.accuracy}m)
                  </div>
                ) : (
                  <div className="text-amber-700">
                    GPS fix pending. Please allow browser location access.
                  </div>
                )
              ) : selectedCoords ? (
                <div className="font-mono text-blue-700 font-bold">
                  {selectedCoords.latitude.toFixed(5)}, {selectedCoords.longitude.toFixed(5)}
                </div>
              ) : (
                <div className="text-slate-500">
                  Click on the map behind this modal or choose current GPS position.
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Trash2,
  RefreshCw,
  ExternalLink,
  Pill,
  Heart
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
  const [selectedPlace, setSelectedPlace] = useState(null);
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
    provider: null,
    message: '',
    loading: true,
  });

  const lastFetchedCoordsRef = useRef(null);

  // Auto request location on mount if not yet available
  useEffect(() => {
    if (!hasRealCoords) {
      requestLocation();
    }
  }, [hasRealCoords, requestLocation]);

  const fetchNearbyPlaces = useCallback((lat, lng, force = false) => {
    if (!lat || !lng) return;
    setPlacesData((prev) => ({ ...prev, loading: true }));
    SafePlacesService.getSafePlaces(lat, lng)
      .then((res) => {
        setPlacesData({
          places: Array.isArray(res?.places) ? res.places : [],
          provider: res?.provider || 'google_places',
          providerConfigured: Boolean(res?.providerConfigured),
          message: res?.message || '',
          loading: false,
        });
        lastFetchedCoordsRef.current = { lat, lng };
      })
      .catch(() => {
        setPlacesData({
          places: [],
          providerConfigured: false,
          provider: null,
          message: 'Unable to connect to live nearby safe places provider.',
          loading: false,
        });
      });
  }, []);

  // Fetch when real coordinates become available, and auto-refresh if location changes significantly (>200m)
  useEffect(() => {
    if (!hasRealCoords) return;

    const prev = lastFetchedCoordsRef.current;
    if (!prev) {
      fetchNearbyPlaces(location.latitude, location.longitude);
    } else {
      const distKm = calculateDistanceKm(prev.lat, prev.lng, location.latitude, location.longitude);
      if (distKm !== null && distKm > 0.2) {
        fetchNearbyPlaces(location.latitude, location.longitude);
      }
    }
  }, [hasRealCoords, location.latitude, location.longitude, fetchNearbyPlaces]);

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
          distanceText:
            dist !== null
              ? dist < 1
                ? `${Math.round(dist * 1000)} m away`
                : `${dist} km away`
              : place.distanceText || 'Distance unavailable',
        };
      }
      return place;
    });
  }, [placesData.places, hasRealCoords, location.latitude, location.longitude]);

  const categories = ['All', 'Police', 'Hospital', 'Pharmacy', 'Shelter'];

  const filteredPlaces = useMemo(() => {
    return nearbySafePlaces.filter((p) => {
      if (selectedCategory === 'All') return true;
      return p.type === selectedCategory;
    });
  }, [nearbySafePlaces, selectedCategory]);

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

  const getCategoryIcon = (type) => {
    switch (type) {
      case 'Police':
        return <Shield className="w-4 h-4 text-blue-700" />;
      case 'Hospital':
        return <Building className="w-4 h-4 text-rose-700" />;
      case 'Pharmacy':
        return <Pill className="w-4 h-4 text-emerald-700" />;
      case 'Shelter':
        return <Heart className="w-4 h-4 text-purple-700" />;
      default:
        return <Building className="w-4 h-4 text-slate-700" />;
    }
  };

  const getCategoryBadgeColor = (type) => {
    switch (type) {
      case 'Police':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Hospital':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Pharmacy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Shelter':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
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
            safePlaces={filteredPlaces}
            selectedPlace={selectedPlace}
            onSelectPlace={(place) => setSelectedPlace(place)}
            onRecenter={() => {
              if (hasRealCoords) {
                fetchNearbyPlaces(location.latitude, location.longitude, true);
              }
            }}
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
            {/* If location permission is unavailable, ask user to enable location */}
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
                {/* Search Origin & Provider Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      GPS Origin:{' '}
                      <strong className="font-mono text-slate-800">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </strong>
                    </span>
                    <span className="hidden sm:inline text-slate-300">•</span>
                    <span className="text-slate-600">
                      Provider:{' '}
                      <span className="font-semibold text-slate-900">
                        {placesData.provider === 'google_places'
                          ? 'Google Places API'
                          : 'OpenStreetMap Overpass'}
                      </span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchNearbyPlaces(location.latitude, location.longitude, true)}
                    disabled={placesData.loading}
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${placesData.loading ? 'animate-spin' : ''}`} />
                    <span>{placesData.loading ? 'Searching...' : 'Refresh'}</span>
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {categories.map((cat) => {
                    const count =
                      cat === 'All'
                        ? nearbySafePlaces.length
                        : nearbySafePlaces.filter((p) => p.type === cat).length;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                          selectedCategory === cat
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cat}</span>
                        {count > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              selectedCategory === cat
                                ? 'bg-slate-700 text-slate-100'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Safe Places List or Loading / Empty State */}
                {placesData.loading && filteredPlaces.length === 0 ? (
                  <Card className="p-8 text-center space-y-3 bg-white border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center animate-pulse">
                      <Compass className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">
                        Searching Verified Safe Places...
                      </h4>
                      <p className="text-xs text-slate-500">
                        Locating live police stations, hospitals, pharmacies, and shelters near your GPS position.
                      </p>
                    </div>
                  </Card>
                ) : filteredPlaces.length === 0 ? (
                  <Card className="p-6 text-center space-y-3 bg-white border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 mx-auto flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="text-sm font-bold text-slate-900">
                        No {selectedCategory !== 'All' ? selectedCategory : 'Safe'} Places Found
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {placesData.message ||
                          `No verified ${selectedCategory.toLowerCase()} services found within a 5 km radius of your location. Try switching category filters or refreshing.`}
                      </p>
                    </div>
                    <div className="pt-2 flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCategory('All')}
                      >
                        Show All Categories
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => fetchNearbyPlaces(location.latitude, location.longitude, true)}
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Refresh Search
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredPlaces.map((place) => {
                      const isSelected = selectedPlace?.id === place.id;
                      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;

                      return (
                        <Card
                          key={place.id}
                          className={`p-3.5 bg-white border transition-all ${
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-100'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                  place.type === 'Police'
                                    ? 'bg-blue-50'
                                    : place.type === 'Hospital'
                                    ? 'bg-rose-50'
                                    : place.type === 'Pharmacy'
                                    ? 'bg-emerald-50'
                                    : 'bg-purple-50'
                                }`}
                              >
                                {getCategoryIcon(place.type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-slate-900 truncate max-w-xs">
                                    {place.name}
                                  </h4>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryBadgeColor(
                                      place.type
                                    )}`}
                                  >
                                    {place.category || place.type}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {place.address}
                                </p>
                                <div className="flex items-center gap-2.5 text-[10px] text-slate-500 mt-1 flex-wrap">
                                  <span className="font-bold text-blue-700 font-mono">
                                    {place.distanceText}
                                  </span>
                                  {place.isOpen !== null && place.isOpen !== undefined && (
                                    <>
                                      <span>•</span>
                                      <span
                                        className={`font-semibold ${
                                          place.isOpen ? 'text-emerald-700' : 'text-rose-700'
                                        }`}
                                      >
                                        {place.isOpen ? 'Open Now' : 'Closed'}
                                      </span>
                                    </>
                                  )}
                                  {place.rating && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-700 font-semibold">
                                        ★ {place.rating}{' '}
                                        {place.userRatingsTotal ? (
                                          <span className="text-slate-400 font-normal">
                                            ({place.userRatingsTotal})
                                          </span>
                                        ) : null}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedPlace(place)}
                                leftIcon={<Crosshair className="w-3.5 h-3.5 text-blue-600" />}
                              >
                                View on Map
                              </Button>

                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex"
                              >
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  leftIcon={<Navigation className="w-3.5 h-3.5 text-slate-700" />}
                                >
                                  Directions
                                </Button>
                              </a>

                              {place.phone && (
                                <a href={`tel:${place.phone}`} className="inline-flex">
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    leftIcon={<Phone className="w-3.5 h-3.5" />}
                                  >
                                    Call
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
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
                <p className="text-[11px] text-slate-400">Personal saved locations (Home, Campus, Hostel, Office)</p>
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

        {/* Modal: Add Safety Zone */}
        <Modal
          isOpen={zoneModalOpen}
          onClose={() => setZoneModalOpen(false)}
          title="Create New Safety Zone"
          description="Designate a verified personal haven with custom geofence radius."
        >
          <form onSubmit={handleAddZone} className="space-y-4">
            {zoneError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{zoneError}</span>
              </div>
            )}

            <Input
              label="Zone Name"
              placeholder="e.g., Home, University Campus, Office, Hostel"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Geofence Radius</label>
              <div className="grid grid-cols-3 gap-2">
                {[100, 250, 500].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setNewZoneRadius(radius)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newZoneRadius === radius
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {radius} meters
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700">Coordinates Origin</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="zoneCoordType"
                    checked={useCurrentLoc}
                    onChange={() => setUseCurrentLoc(true)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">Use Current GPS Location</span>
                    <span className="text-slate-500 text-[11px]">
                      {hasRealCoords
                        ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                        : 'GPS coordinates currently unavailable'}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="zoneCoordType"
                    checked={!useCurrentLoc}
                    onChange={() => setUseCurrentLoc(false)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">Select on Map</span>
                    <span className="text-slate-500 text-[11px]">
                      {selectedCoords
                        ? `${selectedCoords.latitude.toFixed(5)}, ${selectedCoords.longitude.toFixed(5)}`
                        : 'Click on the map above to select custom point'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setZoneModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Safety Zone
              </Button>
            </div>
          </form>
        </Modal>
      </Container>
    </div>
  );
}


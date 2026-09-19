import express from 'express';

const router = express.Router();

/**
 * Haversine formula to compute actual distance in meters/kilometers
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
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
  return Number((R * c).toFixed(2));
}

/**
 * GET /api/safe-places
 * Accepts validated latitude/longitude and queries real places provider.
 * Never outputs fake or synthetic safe places.
 */
router.get('/', async (req, res) => {
  const { latitude, longitude, lat, lng } = req.query;

  const rawLat = latitude || lat;
  const rawLng = longitude || lng;

  if (!rawLat || !rawLng) {
    return res.status(400).json({
      success: false,
      error: 'Valid latitude and longitude query parameters are required.',
    });
  }

  const parsedLat = Number(rawLat);
  const parsedLng = Number(rawLng);

  if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90 || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
    return res.status(400).json({
      success: false,
      error: 'Invalid coordinates provided.',
    });
  }

  // 1. Google Places API (if configured)
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (googleApiKey) {
    try {
      const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${parsedLat},${parsedLng}&radius=3000&type=police|hospital|pharmacy&key=${googleApiKey}`;
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.status === 'OK' && Array.isArray(data.results)) {
        const places = data.results.map((p) => {
          const pLat = p.geometry?.location?.lat;
          const pLng = p.geometry?.location?.lng;
          const distKm = pLat && pLng ? calculateDistanceKm(parsedLat, parsedLng, pLat, pLng) : null;

          return {
            id: p.place_id,
            name: p.name,
            category: p.types?.[0] || 'safe_place',
            address: p.vicinity || '',
            latitude: pLat,
            longitude: pLng,
            distanceKm: distKm,
            distanceText: distKm !== null ? `${distKm} km away` : 'Nearby',
            isOpen: p.opening_hours?.open_now ?? null,
            rating: p.rating || null,
          };
        });

        return res.status(200).json({
          success: true,
          provider: 'google_places',
          providerConfigured: true,
          count: places.length,
          places,
        });
      }
    } catch (err) {
      console.warn('[Google Places Error]:', err.message);
    }
  }

  // 2. OpenStreetMap Overpass API (public geospatial emergency amenity query)
  try {
    const overpassQuery = `[out:json][timeout:5];(node["amenity"~"police|hospital|clinic|pharmacy"](around:3500,${parsedLat},${parsedLng}););out 15;`;
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    const response = await fetch(overpassUrl, {
      headers: {
        'User-Agent': 'WomenSafetyApp/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.elements) && data.elements.length > 0) {
        const places = data.elements
          .filter((el) => el.tags?.name)
          .map((el) => {
            const distKm = calculateDistanceKm(parsedLat, parsedLng, el.lat, el.lon);
            let category = el.tags.amenity || 'safe_place';
            if (category === 'police') category = 'Police Station';
            else if (category === 'hospital') category = 'Hospital / Clinic';
            else if (category === 'pharmacy') category = 'Pharmacy';

            return {
              id: `osm_${el.id}`,
              name: el.tags.name,
              category,
              address: [el.tags['addr:street'], el.tags['addr:city']].filter(Boolean).join(', ') || 'Address not listed',
              latitude: el.lat,
              longitude: el.lon,
              distanceKm: distKm,
              distanceText: `${distKm} km away`,
              phone: el.tags.phone || el.tags['contact:phone'] || null,
            };
          })
          .sort((a, b) => a.distanceKm - b.distanceKm);

        if (places.length > 0) {
          return res.status(200).json({
            success: true,
            provider: 'openstreetmap_overpass',
            providerConfigured: true,
            count: places.length,
            places,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Overpass Error]:', err.message);
  }

  // 3. If neither provider returned real places: return honest unconfigured state
  return res.status(200).json({
    success: true,
    places: [],
    providerConfigured: false,
    message: 'Nearby safe places are unavailable because a places provider is not configured.',
  });
});

export default router;

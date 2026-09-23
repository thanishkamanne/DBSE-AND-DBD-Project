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

function formatDistanceText(km) {
  if (km === null || km === undefined) return 'Distance unavailable';
  if (km < 1) {
    return `${Math.round(km * 1000)} m away`;
  }
  return `${km} km away`;
}

/**
 * GET /api/safe-places
 * Accepts validated latitude/longitude and queries real places provider.
 * Never outputs fake or synthetic safe places.
 */
router.get('/', async (req, res) => {
  const { latitude, longitude, lat, lng, radius = 5000 } = req.query;

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

  if (
    isNaN(parsedLat) ||
    parsedLat < -90 ||
    parsedLat > 90 ||
    isNaN(parsedLng) ||
    parsedLng < -180 ||
    parsedLng > 180
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid coordinates provided.',
    });
  }

  const searchRadius = Math.min(Math.max(Number(radius) || 5000, 1000), 20000);

  // 1. Primary: Real Google Places API
  const googleApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY;

  if (googleApiKey) {
    try {
      const searches = [
        { type: 'Police', query: 'type=police' },
        { type: 'Hospital', query: 'type=hospital' },
        { type: 'Pharmacy', query: 'type=pharmacy' },
        { type: 'Shelter', query: 'keyword=women+shelter' },
      ];

      const responses = await Promise.allSettled(
        searches.map(async (search) => {
          const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${parsedLat},${parsedLng}&radius=${searchRadius}&${search.query}&key=${googleApiKey}`;
          const r = await fetch(endpoint);
          const data = await r.json();
          return { type: search.type, results: data.results || [], status: data.status };
        })
      );

      const seenPlaceIds = new Set();
      const places = [];

      for (const resItem of responses) {
        if (resItem.status === 'fulfilled' && Array.isArray(resItem.value.results)) {
          const categoryType = resItem.value.type;

          for (const p of resItem.value.results) {
            if (!p.place_id || seenPlaceIds.has(p.place_id)) continue;
            seenPlaceIds.add(p.place_id);

            const pLat = p.geometry?.location?.lat;
            const pLng = p.geometry?.location?.lng;
            if (pLat === undefined || pLng === undefined) continue;

            const distKm = calculateDistanceKm(parsedLat, parsedLng, pLat, pLng);

            let categoryLabel = 'Safe Place';
            if (categoryType === 'Police') categoryLabel = 'Police Station';
            else if (categoryType === 'Hospital') categoryLabel = 'Hospital / Emergency';
            else if (categoryType === 'Pharmacy') categoryLabel = 'Pharmacy / Medical';
            else if (categoryType === 'Shelter') categoryLabel = 'Women\'s Shelter / Support';

            places.push({
              id: p.place_id,
              name: p.name,
              type: categoryType,
              category: categoryLabel,
              address: p.vicinity || p.formatted_address || 'Address not listed',
              latitude: pLat,
              longitude: pLng,
              distanceKm: distKm,
              distanceText: formatDistanceText(distKm),
              isOpen: p.opening_hours?.open_now ?? null,
              rating: p.rating || null,
              userRatingsTotal: p.user_ratings_total || null,
              businessStatus: p.business_status || 'OPERATIONAL',
            });
          }
        }
      }

      // Sort by closest distance first
      places.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

      if (places.length > 0) {
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

  // 2. Secondary Geospatial Fallback: OpenStreetMap Overpass live real amenities
  try {
    const overpassQuery = `[out:json][timeout:8];(node["amenity"~"police|hospital|clinic|pharmacy|social_facility"](around:${searchRadius},${parsedLat},${parsedLng}););out 30;`;
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
          .filter((el) => el.tags?.name && el.lat && el.lon)
          .map((el) => {
            const distKm = calculateDistanceKm(parsedLat, parsedLng, el.lat, el.lon);
            const amenity = el.tags.amenity || '';

            let type = 'Safe Place';
            let category = 'Verified Safe Haven';

            if (amenity === 'police') {
              type = 'Police';
              category = 'Police Station';
            } else if (amenity === 'hospital' || amenity === 'clinic') {
              type = 'Hospital';
              category = 'Hospital / Clinic';
            } else if (amenity === 'pharmacy') {
              type = 'Pharmacy';
              category = 'Pharmacy';
            } else if (amenity === 'social_facility') {
              type = 'Shelter';
              category = 'Community Support / Shelter';
            }

            return {
              id: `osm_${el.id}`,
              name: el.tags.name,
              type,
              category,
              address:
                [el.tags['addr:street'], el.tags['addr:city'], el.tags['addr:suburb']]
                  .filter(Boolean)
                  .join(', ') || 'Address not listed',
              latitude: el.lat,
              longitude: el.lon,
              distanceKm: distKm,
              distanceText: formatDistanceText(distKm),
              phone: el.tags.phone || el.tags['contact:phone'] || null,
            };
          })
          .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

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

  // 3. If neither provider returned real places
  return res.status(200).json({
    success: true,
    places: [],
    providerConfigured: Boolean(googleApiKey),
    message: 'No safe places found within the current radius. Try expanding search or checking connectivity.',
  });
});

export default router;

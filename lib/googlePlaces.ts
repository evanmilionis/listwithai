import type { NearbyAmenities, PlaceResult } from '@/types';

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY!;

interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Geocode an address to lat/lng using Google Geocoding API.
 */
async function geocode(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<LatLng | null> {
  try {
    const fullAddress = encodeURIComponent(
      `${address}, ${city}, ${state} ${zip}`
    );
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${fullAddress}&key=${PLACES_KEY}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const location = data.results?.[0]?.geometry?.location;
    if (!location) return null;

    return { lat: location.lat, lng: location.lng };
  } catch (error) {
    console.error('Geocode failed:', error);
    return null;
  }
}

/**
 * Calculate distance in miles between two lat/lng points (Haversine).
 */
function distanceMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Search Google Places Nearby for a given type. Returns the closest result.
 */
async function searchNearby(
  location: LatLng,
  type: string,
  radiusMeters: number,
  keyword?: string
): Promise<PlaceResult | null> {
  try {
    const params = new URLSearchParams({
      location: `${location.lat},${location.lng}`,
      radius: String(radiusMeters),
      key: PLACES_KEY,
    });

    if (keyword) {
      params.set('keyword', keyword);
    } else {
      params.set('type', type);
    }

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const results = data.results;
    if (!results || results.length === 0) return null;

    // Find the closest result
    let closest = results[0];
    let closestDist = Infinity;

    for (const place of results) {
      const placeLoc: LatLng = {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      };
      const dist = distanceMiles(location, placeLoc);
      if (dist < closestDist) {
        closestDist = dist;
        closest = place;
      }
    }

    const placeLoc: LatLng = {
      lat: closest.geometry.location.lat,
      lng: closest.geometry.location.lng,
    };

    return {
      name: closest.name,
      distance_miles: Math.round(distanceMiles(location, placeLoc) * 10) / 10,
      rating: closest.rating ?? undefined,
      address: closest.vicinity ?? undefined,
    };
  } catch (error) {
    console.error(`Places search failed for type=${type}:`, error);
    return null;
  }
}

/**
 * Count results for a nearby search (e.g. restaurants).
 */
async function countNearby(
  location: LatLng,
  type: string,
  radiusMeters: number
): Promise<number> {
  try {
    const params = new URLSearchParams({
      location: `${location.lat},${location.lng}`,
      radius: String(radiusMeters),
      type,
      key: PLACES_KEY,
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
    );

    if (!res.ok) return 0;

    const data = await res.json();
    return data.results?.length ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Fetch all nearby amenities for a property address.
 * Returns null values for any individual search that fails.
 */
export async function fetchNearbyAmenities(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<NearbyAmenities | null> {
  const location = await geocode(address, city, state, zip);
  if (!location) {
    console.error('Could not geocode address for amenities lookup');
    return null;
  }

  const DEFAULT_RADIUS = 5000; // ~3 miles
  const BEACH_RADIUS = 8000; // ~5 miles

  const [grocery, hospital, school, restaurantsCount, beach, shopping] =
    await Promise.all([
      searchNearby(location, 'grocery_or_supermarket', DEFAULT_RADIUS),
      searchNearby(location, 'hospital', DEFAULT_RADIUS),
      searchNearby(location, 'school', DEFAULT_RADIUS),
      countNearby(location, 'restaurant', DEFAULT_RADIUS),
      searchNearby(location, '', BEACH_RADIUS, 'beach'),
      searchNearby(location, 'shopping_mall', DEFAULT_RADIUS),
    ]);

  return {
    grocery,
    hospital,
    school,
    restaurants_count: restaurantsCount,
    beach,
    shopping,
  };
}

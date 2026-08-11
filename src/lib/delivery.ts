// Azlan Fast Food and B B Q point coordinates (Malir, Karachi)
const RESTAURANT_LOCATION = {
  lat: 24.9080912,
  lng: 67.2124054,
};

// Delivery fee structure
const BASE_DELIVERY_FEE = 60; // PKR for up to 2 KM
const ADDITIONAL_RATE_PER_KM = 25; // PKR per additional KM
const BASE_DISTANCE_KM = 2; // KM covered by base fee
export const MAX_DELIVERY_RADIUS_KM = 5.0; // Maximum allowed delivery radius in KM

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate delivery fee based on distance
 * @param distanceKm Distance in kilometers
 * @returns Delivery fee in PKR
 */
export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= BASE_DISTANCE_KM) {
    return BASE_DELIVERY_FEE;
  }

  const additionalKm = Math.ceil(distanceKm - BASE_DISTANCE_KM);
  return BASE_DELIVERY_FEE + additionalKm * ADDITIONAL_RATE_PER_KM;
}

/**
 * Calculate delivery fee from customer coordinates
 * @param customerLat Customer latitude
 * @param customerLng Customer longitude
 * @returns Object with distance and delivery fee
 */
export function calculateDeliveryFromCoordinates(
  customerLat: number,
  customerLng: number
): {
  distanceKm: number;
  deliveryFee: number;
  breakdown: string;
} {
  const distanceKm = calculateDistance(
    RESTAURANT_LOCATION.lat,
    RESTAURANT_LOCATION.lng,
    customerLat,
    customerLng
  );

  const deliveryFee = calculateDeliveryFee(distanceKm);

  const breakdown = `Distance: ${distanceKm.toFixed(2)} km | Base: PKR ${BASE_DELIVERY_FEE} (${BASE_DISTANCE_KM} km)${distanceKm > BASE_DISTANCE_KM ? ` + PKR ${Math.ceil(distanceKm - BASE_DISTANCE_KM) * ADDITIONAL_RATE_PER_KM} (${Math.ceil(distanceKm - BASE_DISTANCE_KM)} additional km)` : ""
    }`;

  return {
    distanceKm: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
    deliveryFee,
    breakdown,
  };
}

// ========================================================
// OSRM Road-Based Routing (free, uses OpenStreetMap data)
// ========================================================

export interface OSRMRouteResult {
  distanceKm: number;
  durationMinutes: number;
  deliveryFee: number;
  breakdown: string;
  /** Encoded polyline geometry from OSRM for map rendering */
  geometry: string;
}

/**
 * Fetch a real road-based route from the OSRM public API.
 * Falls back to Haversine straight-line if the request fails.
 *
 * @param customerLat Customer latitude
 * @param customerLng Customer longitude
 * @returns Route information including road distance, ETA, fee, and encoded geometry
 */
export async function fetchRoadRoute(
  customerLat: number,
  customerLng: number
): Promise<OSRMRouteResult> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${RESTAURANT_LOCATION.lng},${RESTAURANT_LOCATION.lat};` +
    `${customerLng},${customerLat}` +
    `?overview=full&geometries=polyline`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) {
      throw new Error("OSRM returned no route");
    }

    const route = data.routes[0];
    const distanceKm = Math.round((route.distance / 1000) * 100) / 100; // metres → km
    const durationMinutes = Math.round(route.duration / 60); // seconds → minutes
    const deliveryFee = calculateDeliveryFee(distanceKm);

    const breakdown =
      `Road distance: ${distanceKm.toFixed(2)} km · ~${durationMinutes} min` +
      ` | Base: PKR ${BASE_DELIVERY_FEE} (${BASE_DISTANCE_KM} km)` +
      (distanceKm > BASE_DISTANCE_KM
        ? ` + PKR ${Math.ceil(distanceKm - BASE_DISTANCE_KM) * ADDITIONAL_RATE_PER_KM} (${Math.ceil(distanceKm - BASE_DISTANCE_KM)} extra km)`
        : "");

    return {
      distanceKm,
      durationMinutes,
      deliveryFee,
      breakdown,
      geometry: route.geometry, // encoded polyline
    };
  } catch (err) {
    // Graceful fallback to Haversine straight-line distance
    console.warn("OSRM routing failed, falling back to Haversine:", err);

    const fallback = calculateDeliveryFromCoordinates(customerLat, customerLng);

    return {
      distanceKm: fallback.distanceKm,
      durationMinutes: 0,
      deliveryFee: fallback.deliveryFee,
      breakdown: `${fallback.breakdown} (straight-line estimate)`,
      geometry: "", // no road geometry available
    };
  }
}

/**
 * Fetch just the OSRM route geometry for display on a map.
 * Used by the admin OrderMap component.
 *
 * @returns Encoded polyline string or null on failure
 */
export async function fetchRouteGeometry(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<{ geometry: string; distanceKm: number; durationMinutes: number } | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromLng},${fromLat};${toLng},${toLat}` +
    `?overview=full&geometries=polyline`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    return {
      geometry: route.geometry,
      distanceKm: Math.round((route.distance / 1000) * 100) / 100,
      durationMinutes: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

/**
 * Get restaurant base location
 */
export function getRestaurantLocation() {
  return RESTAURANT_LOCATION;
}

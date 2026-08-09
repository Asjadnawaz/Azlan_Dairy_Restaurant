// Azlan Fast Food and B B Q point coordinates (Malir, Karachi)
const RESTAURANT_LOCATION = {
  lat: 24.9080912,
  lng: 67.2124054,
};

// Delivery fee structure
const BASE_DELIVERY_FEE = 60; // PKR for up to 2 KM
const ADDITIONAL_RATE_PER_KM = 25; // PKR per additional KM
const BASE_DISTANCE_KM = 2; // KM covered by base fee

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

/**
 * Get restaurant base location
 */
export function getRestaurantLocation() {
  return RESTAURANT_LOCATION;
}

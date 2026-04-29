/**
 * Geo Utilities — Fiscaly
 * Haversine distance calculation for GPS geofencing
 */

/** Earth radius in meters */
const EARTH_RADIUS_M = 6_371_000

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Calculate the Haversine distance between two GPS coordinates.
 * Returns distance in meters.
 * 
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_M * c
}

/**
 * Check if an agent is within the allowed radius of a merchant.
 * @param agentLat - Agent latitude
 * @param agentLng - Agent longitude
 * @param merchantLat - Merchant latitude
 * @param merchantLng - Merchant longitude
 * @param maxDistanceM - Maximum allowed distance in meters (default: 100)
 * @returns Object with distance and whether it's within range
 */
export function checkGeoFence(
  agentLat: number,
  agentLng: number,
  merchantLat: number,
  merchantLng: number,
  maxDistanceM: number = 100
): { distance: number; isWithinRange: boolean; geoStatus: 'OK' | 'FRAUD_GPS' } {
  const distance = haversineDistance(agentLat, agentLng, merchantLat, merchantLng)
  return {
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    isWithinRange: distance <= maxDistanceM,
    geoStatus: distance <= maxDistanceM ? 'OK' : 'FRAUD_GPS',
  }
}

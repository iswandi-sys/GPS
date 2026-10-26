import { NavPosition, Waypoint, NavTargetCalculation, SpeedUnit, DistanceUnit } from '../types';

const METERS_PER_NAUTICAL_MILE = 1852;
const MS_TO_KNOTS = 1.943844;
const MS_TO_KMH = 3.6;

/**
 * Calculates Great-Circle distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates initial bearing (forward azimuth) from point 1 to point 2
 * Returns bearing in degrees (0 - 360°)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return bearing;
}

/**
 * Normalizes angle to 0 - 360°
 */
export function normalizeAngle360(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Calculates smallest relative angle difference between current heading and target bearing
 * Range: -180° (port/left) to +180° (starboard/right)
 * 0° means directly on course
 */
export function calculateRelativeBearingDelta(currentHeading: number, targetBearing: number): number {
  let diff = targetBearing - currentHeading;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return diff;
}

/**
 * Computes all navigation targets and calculations given current vessel position and target waypoint
 */
export function computeNavTarget(
  currentPos: NavPosition,
  targetWaypoint: Waypoint | null
): NavTargetCalculation {
  if (!targetWaypoint) {
    return {
      target: null,
      distanceNmi: 0,
      distanceKm: 0,
      bearingDeg: 0,
      relativeBearingDelta: 0,
      etaMinutes: null,
      etaTimeFormatted: null,
      crossTrackErrorNmi: 0,
    };
  }

  const distanceM = calculateDistanceMeters(
    currentPos.lat,
    currentPos.lng,
    targetWaypoint.lat,
    targetWaypoint.lng
  );

  const distanceNmi = distanceM / METERS_PER_NAUTICAL_MILE;
  const distanceKm = distanceM / 1000;
  const bearingDeg = calculateBearing(
    currentPos.lat,
    currentPos.lng,
    targetWaypoint.lat,
    targetWaypoint.lng
  );

  // Vessel heading or COG (fallback to bearing if stationary and no compass)
  const currentHeading = currentPos.heading ?? bearingDeg;
  const relativeBearingDelta = calculateRelativeBearingDelta(currentHeading, bearingDeg);

  // ETA Calculation: speed in knots
  const speedKnots = currentPos.speedKnots;
  let etaMinutes: number | null = null;
  let etaTimeFormatted: string | null = null;

  if (speedKnots > 0.3) {
    const hours = distanceNmi / speedKnots;
    etaMinutes = Math.round(hours * 60);

    const now = new Date();
    const etaDate = new Date(now.getTime() + etaMinutes * 60 * 1000);
    const etaHours = etaDate.getHours().toString().padStart(2, '0');
    const etaMins = etaDate.getMinutes().toString().padStart(2, '0');

    if (hours < 1) {
      etaTimeFormatted = `${etaMinutes} mnt (${etaHours}:${etaMins})`;
    } else {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      etaTimeFormatted = `${h}j ${m}m (${etaHours}:${etaMins})`;
    }
  } else {
    etaTimeFormatted = 'Kapal Berhenti';
  }

  return {
    target: targetWaypoint,
    distanceNmi,
    distanceKm,
    bearingDeg,
    relativeBearingDelta,
    etaMinutes,
    etaTimeFormatted,
    crossTrackErrorNmi: 0,
  };
}

export function formatSpeed(speedKnots: number, unit: SpeedUnit): string {
  if (unit === 'kmh') {
    const kmh = speedKnots * 1.852;
    return `${kmh.toFixed(1)} km/j`;
  }
  return `${speedKnots.toFixed(1)} kn`;
}

export function formatDistance(distanceNmi: number, unit: DistanceUnit): string {
  if (unit === 'km') {
    const km = distanceNmi * 1.852;
    return `${km.toFixed(2)} km`;
  }
  return `${distanceNmi.toFixed(2)} nmi`;
}

export function speedToKnots(speedMs: number | null): number {
  if (speedMs === null || speedMs === undefined || isNaN(speedMs)) return 0;
  return speedMs * MS_TO_KNOTS;
}

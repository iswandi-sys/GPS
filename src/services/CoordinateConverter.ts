import { CoordinateFormat, DMSCoordinate } from '../types';

export function decimalToDMS(decimal: number, isLatitude: boolean): DMSCoordinate {
  const direction = isLatitude
    ? decimal >= 0 ? 'N' : 'S'
    : decimal >= 0 ? 'E' : 'W';

  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.round((minutesNotTruncated - minutes) * 60 * 10) / 10;

  return {
    degrees,
    minutes,
    seconds,
    direction: direction as 'N' | 'S' | 'E' | 'W',
  };
}

export function dmsToDecimal(dms: DMSCoordinate): number {
  let decimal = dms.degrees + dms.minutes / 60 + dms.seconds / 3600;
  if (dms.direction === 'S' || dms.direction === 'W') {
    decimal = -decimal;
  }
  return decimal;
}

export function formatDMS(dms: DMSCoordinate): string {
  const deg = dms.degrees.toString().padStart(2, '0');
  const min = dms.minutes.toString().padStart(2, '0');
  const sec = dms.seconds.toFixed(1).padStart(4, '0');
  return `${deg}° ${min}' ${sec}" ${dms.direction}`;
}

export function formatCoordinates(lat: number, lng: number, format: CoordinateFormat): string {
  if (format === 'DD') {
    return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
  }
  const latDms = decimalToDMS(lat, true);
  const lngDms = decimalToDMS(lng, false);
  return `${formatDMS(latDms)}, ${formatDMS(lngDms)}`;
}

export function parseCoordinateInput(input: string): { lat: number; lng: number } | null {
  const clean = input.trim();
  if (!clean) return null;

  // Try parsing standard DD format: "-5.123456, 119.123456"
  const ddRegex = /^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/;
  const ddMatch = clean.match(ddRegex);
  if (ddMatch) {
    const lat = parseFloat(ddMatch[1]);
    const lng = parseFloat(ddMatch[3]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Try parsing DMS format like: 05° 08' 32.4" S, 119° 25' 14.1" E
  // or 5 8 32 S, 119 25 14 E
  const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+(\d+(\.\d+)?)["]?\s*([NSns])\s*[,;\s]+\s*(\d+)[°\s]+(\d+)['\s]+(\d+(\.\d+)?)["]?\s*([EWew])/;
  const dmsMatch = clean.match(dmsRegex);
  if (dmsMatch) {
    const latDeg = parseInt(dmsMatch[1], 10);
    const latMin = parseInt(dmsMatch[2], 10);
    const latSec = parseFloat(dmsMatch[3]);
    const latDir = dmsMatch[5].toUpperCase() as 'N' | 'S';

    const lngDeg = parseInt(dmsMatch[6], 10);
    const lngMin = parseInt(dmsMatch[7], 10);
    const lngSec = parseFloat(dmsMatch[8]);
    const lngDir = dmsMatch[10].toUpperCase() as 'E' | 'W';

    const lat = dmsToDecimal({ degrees: latDeg, minutes: latMin, seconds: latSec, direction: latDir });
    const lng = dmsToDecimal({ degrees: lngDeg, minutes: lngMin, seconds: lngSec, direction: lngDir });

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

export async function copyCoordinatesToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch {
    return false;
  }
}

export async function shareCoordinates(title: string, text: string): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({
        title,
        text,
      });
      return true;
    }
    return await copyCoordinatesToClipboard(text);
  } catch {
    return false;
  }
}

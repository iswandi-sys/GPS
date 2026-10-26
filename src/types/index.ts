export type WaypointCategory = 
  | 'rumpon'
  | 'lokasi_ikan'
  | 'pelabuhan'
  | 'lokasi_berbahaya'
  | 'tempat_berlindung'
  | 'lokasi_pribadi';

export interface Waypoint {
  id: string;
  name: string;
  category: WaypointCategory;
  lat: number;
  lng: number;
  notes?: string;
  photoDataUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export type BoatIconType = 
  | 'katir'           // Perahu Cadik / Sandeq Tradisional
  | 'kapal_kayu'      // Kapal Motor Kayu Nelayan
  | 'speedboat'       // Speedboat Navigasi
  | 'pamboat'         // Pamboat / Perahu Panjang
  | 'pagae'           // Perahu Pagae Tradisional
  | 'kapal_sumber_01'; // Kapal Sumber 01

export type CoordinateFormat = 'DD' | 'DMS';
export type SpeedUnit = 'knot' | 'kmh';
export type DistanceUnit = 'nmi' | 'km';

export interface DMSCoordinate {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
}

export interface NavPosition {
  lat: number;
  lng: number;
  accuracy: number; // in meters
  speed: number | null; // in m/s from GPS
  speedKnots: number; // calculated in knots
  heading: number | null; // COG or device compass in degrees
  altitude: number | null;
  timestamp: number;
}

export type GPSStatus = 'idle' | 'searching' | 'active' | 'denied' | 'unavailable' | 'simulated';

export interface NavTargetCalculation {
  target: Waypoint | null;
  distanceNmi: number;
  distanceKm: number;
  bearingDeg: number;
  relativeBearingDelta: number; // -180 to +180: negative = turn left/port, positive = turn right/starboard
  etaMinutes: number | null;
  etaTimeFormatted: string | null;
  crossTrackErrorNmi: number;
}

export interface MarineWeatherHourly {
  time: string;
  waveHeight: number; // meters
  waveDirection: number; // degrees
  wavePeriod: number; // seconds
  windSpeed: number; // knots
  windDirection: number; // degrees
  windGusts: number; // knots
  surfaceTemp: number; // Celsius
}

export interface MarineWeatherForecast {
  regionName: string;
  lat: number;
  lng: number;
  current: {
    waveHeight: number;
    waveDirection: number;
    wavePeriod: number;
    windSpeed: number;
    windDirection: number;
    surfaceTemp: number;
    safetyRisk: 'tenang' | 'rendah' | 'sedang' | 'tinggi' | 'sangat_berbahaya';
    safetyMessage: string;
    weatherCodeDescription: string;
  };
  daily: Array<{
    date: string;
    maxWaveHeight: number;
    avgWindSpeed: number;
    dominantWaveDirection: number;
    dominantWindDirection: number;
    safetyRisk: 'tenang' | 'rendah' | 'sedang' | 'tinggi' | 'sangat_berbahaya';
  }>;
  hourly: MarineWeatherHourly[];
  updatedAt: number;
  isCached: boolean;
}

export interface OfflineMapArea {
  id: string;
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  minZoom: number;
  maxZoom: number;
  detailLevel: 'hemat' | 'standar' | 'tinggi';
  totalTiles: number;
  downloadedTiles: number;
  sizeBytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'paused' | 'error';
  createdAt: number;
}

export interface AppSettings {
  coordinateFormat: CoordinateFormat;
  speedUnit: SpeedUnit;
  distanceUnit: DistanceUnit;
  boatIcon: BoatIconType;
  mapLayer: 'street' | 'satellite' | 'hybrid' | 'ocean';
  showSeamarks: boolean;
  showBathymetry: boolean;
  voiceGuidanceEnabled: boolean;
  voiceIntervalSeconds: number; // 30, 60, 120, 300
  voiceHeadingThreshold: number; // degrees off-course, e.g. 15
  voiceProximityWarningNmi: number; // e.g. 0.5
  nightMode: boolean;
}

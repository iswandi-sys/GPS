import { NavPosition, GPSStatus } from '../types';
import { speedToKnots } from './NavigationEngine';

export type LocationUpdateCallback = (pos: NavPosition, status: GPSStatus, errorMessage?: string) => void;

class LocationService {
  private watchId: number | null = null;
  private listeners: Set<LocationUpdateCallback> = new Set();
  private currentPosition: NavPosition | null = null;
  private currentStatus: GPSStatus = 'idle';
  private errorMessage: string = '';
  private compassHeading: number | null = null;
  private isSimulated: boolean = false;
  private simulationInterval: number | null = null;

  // Realistic fishing navigation simulation route in Makassar Strait (Perairan Paotere -> Pulau Barrang Lompo -> Rumpon Karang)
  private simRoute = [
    { lat: -5.1185, lng: 119.4170, heading: 285, speed: 4.5 },
    { lat: -5.1050, lng: 119.3800, heading: 290, speed: 6.2 },
    { lat: -5.0800, lng: 119.3300, heading: 300, speed: 7.5 },
    { lat: -5.0490, lng: 119.2800, heading: 310, speed: 8.0 },
    { lat: -5.0200, lng: 119.2200, heading: 305, speed: 7.8 },
  ];
  private simIndex = 0;
  private simStep = 0;

  constructor() {
    this.initCompass();
  }

  private initCompass() {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      const handleOrientation = (e: DeviceOrientationEvent) => {
        // webkitCompassHeading for iOS, alpha for Android
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evt = e as any;
        if (evt.webkitCompassHeading !== undefined) {
          this.compassHeading = evt.webkitCompassHeading;
        } else if (e.alpha !== null && e.absolute) {
          this.compassHeading = 360 - e.alpha;
        }
      };

      try {
        window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
      } catch {
        // Ignored if sensors not permitted
      }
    }
  }

  public subscribe(callback: LocationUpdateCallback): () => void {
    this.listeners.add(callback);
    if (this.currentPosition) {
      callback(this.currentPosition, this.currentStatus, this.errorMessage);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    if (!this.currentPosition) return;
    this.listeners.forEach((listener) => {
      listener(this.currentPosition!, this.currentStatus, this.errorMessage);
    });
  }

  public startTracking(): void {
    if (this.isSimulated) return;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.currentStatus = 'unavailable';
      this.errorMessage = 'GPS tidak didukung oleh browser atau perangkat ini.';
      this.notify();
      return;
    }

    this.currentStatus = 'searching';
    this.errorMessage = '';
    this.notify();

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;
        const knots = speedToKnots(speed);

        // Distinguish COG from stationary heading:
        // When speed is under 0.5 knots, GPS heading is often inaccurate or null, so prefer compass heading
        let effectiveHeading = heading;
        if ((effectiveHeading === null || knots < 0.5) && this.compassHeading !== null) {
          effectiveHeading = this.compassHeading;
        }

        this.currentPosition = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy ?? 10,
          speed: speed ?? 0,
          speedKnots: knots,
          heading: effectiveHeading,
          altitude: altitude ?? 0,
          timestamp: position.timestamp,
        };

        this.currentStatus = 'active';
        this.errorMessage = '';
        this.notify();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          this.currentStatus = 'denied';
          this.errorMessage = 'Izin lokasi GPS ditolak oleh pengguna. Aktifkan lokasi di pengaturan HP.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          this.currentStatus = 'unavailable';
          this.errorMessage = 'Sinyal GPS satelit tidak dapat ditemukan. Pastikan Anda berada di luar ruangan.';
        } else if (error.code === error.TIMEOUT) {
          this.currentStatus = 'searching';
          this.errorMessage = 'Mencari sinyal satelit GPS maritim...';
        }
        this.notify();
      },
      options
    );
  }

  public stopTracking(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.simulationInterval !== null) {
      window.clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  public toggleSimulation(enable?: boolean): boolean {
    const shouldEnable = enable !== undefined ? enable : !this.isSimulated;
    this.isSimulated = shouldEnable;

    if (this.isSimulated) {
      if (this.watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }

      this.currentStatus = 'simulated';
      this.errorMessage = 'Mode Uji Navigasi Aktif (Simulasi Perairan Sulawesi)';
      this.simIndex = 0;
      this.simStep = 0;

      const runSimStep = () => {
        const p1 = this.simRoute[this.simIndex];
        const p2 = this.simRoute[(this.simIndex + 1) % this.simRoute.length];

        const t = this.simStep / 20; // 20 steps per segment
        const lat = p1.lat + (p2.lat - p1.lat) * t;
        const lng = p1.lng + (p2.lng - p1.lng) * t;
        const heading = p1.heading;
        const speedKnots = p1.speed + Math.sin(t * Math.PI) * 1.5;

        this.currentPosition = {
          lat,
          lng,
          accuracy: 4,
          speed: speedKnots / 1.94384,
          speedKnots,
          heading,
          altitude: 1,
          timestamp: Date.now(),
        };

        this.notify();

        this.simStep++;
        if (this.simStep >= 20) {
          this.simStep = 0;
          this.simIndex = (this.simIndex + 1) % this.simRoute.length;
        }
      };

      runSimStep();
      this.simulationInterval = window.setInterval(runSimStep, 2000);
    } else {
      if (this.simulationInterval !== null) {
        window.clearInterval(this.simulationInterval);
        this.simulationInterval = null;
      }
      this.startTracking();
    }

    return this.isSimulated;
  }

  public getStatus(): GPSStatus {
    return this.currentStatus;
  }

  public getPosition(): NavPosition | null {
    return this.currentPosition;
  }

  public isSimulating(): boolean {
    return this.isSimulated;
  }
}

export const locationService = new LocationService();

import { Waypoint, OfflineMapArea, MarineWeatherForecast, AppSettings } from '../types';

const DB_NAME = 'NavigasiLautSR_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB tidak didukung pada perangkat ini.'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Waypoints (Titik Saya)
        if (!db.objectStoreNames.contains('waypoints')) {
          const wpStore = db.createObjectStore('waypoints', { keyPath: 'id' });
          wpStore.createIndex('category', 'category', { unique: false });
          wpStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store 2: Offline Map Areas
        if (!db.objectStoreNames.contains('offline_areas')) {
          db.createObjectStore('offline_areas', { keyPath: 'id' });
        }

        // Store 3: Offline Map Tiles
        if (!db.objectStoreNames.contains('offline_tiles')) {
          const tileStore = db.createObjectStore('offline_tiles', { keyPath: 'key' });
          tileStore.createIndex('areaId', 'areaId', { unique: false });
        }

        // Store 4: Marine Weather Cache
        if (!db.objectStoreNames.contains('weather_cache')) {
          db.createObjectStore('weather_cache', { keyPath: 'regionKey' });
        }

        // Store 5: Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

// ======================== WAYPOINTS ========================

export async function getAllWaypoints(): Promise<Waypoint[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('waypoints', 'readonly');
    const store = tx.objectStore('waypoints');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWaypoint(waypoint: Waypoint): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('waypoints', 'readwrite');
    const store = tx.objectStore('waypoints');
    const request = store.put(waypoint);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteWaypoint(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('waypoints', 'readwrite');
    const store = tx.objectStore('waypoints');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveWaypointsBatch(waypoints: Waypoint[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('waypoints', 'readwrite');
    const store = tx.objectStore('waypoints');
    for (const wp of waypoints) {
      store.put(wp);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ======================== OFFLINE TILES & AREAS ========================

export interface StoredTile {
  key: string; // e.g. "osm_9_420_250"
  areaId: string;
  blob: Blob;
  size: number;
  timestamp: number;
}

export async function saveTile(tile: StoredTile): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_tiles', 'readwrite');
    const store = tx.objectStore('offline_tiles');
    const request = store.put(tile);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getTile(key: string): Promise<StoredTile | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_tiles', 'readonly');
    const store = tx.objectStore('offline_tiles');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTilesByAreaId(areaId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_tiles', 'readwrite');
    const store = tx.objectStore('offline_tiles');
    const index = store.index('areaId');
    const request = index.openCursor(IDBKeyRange.only(areaId));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineAreas(): Promise<OfflineMapArea[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_areas', 'readonly');
    const store = tx.objectStore('offline_areas');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineArea(area: OfflineMapArea): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_areas', 'readwrite');
    const store = tx.objectStore('offline_areas');
    const request = store.put(area);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOfflineArea(areaId: string): Promise<void> {
  await deleteTilesByAreaId(areaId);
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_areas', 'readwrite');
    const store = tx.objectStore('offline_areas');
    const request = store.delete(areaId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getTotalStorageUsage(): Promise<{ tileCount: number; bytes: number }> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_tiles', 'readonly');
    const store = tx.objectStore('offline_tiles');
    let totalBytes = 0;
    let count = 0;
    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        totalBytes += cursor.value.size || (cursor.value.blob ? cursor.value.blob.size : 0);
        count++;
        cursor.continue();
      } else {
        resolve({ tileCount: count, bytes: totalBytes });
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ======================== WEATHER CACHE ========================

export async function saveWeatherCache(regionKey: string, forecast: MarineWeatherForecast): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('weather_cache', 'readwrite');
    const store = tx.objectStore('weather_cache');
    const request = store.put({
      regionKey,
      forecast,
      updatedAt: Date.now(),
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getWeatherCache(regionKey: string): Promise<MarineWeatherForecast | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('weather_cache', 'readonly');
    const store = tx.objectStore('weather_cache');
    const request = store.get(regionKey);
    request.onsuccess = () => {
      if (request.result && request.result.forecast) {
        resolve(request.result.forecast);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ======================== SETTINGS ========================

const DEFAULT_SETTINGS: AppSettings = {
  coordinateFormat: 'DMS',
  speedUnit: 'knot',
  distanceUnit: 'nmi',
  boatIcon: 'katir',
  mapLayer: 'hybrid',
  showSeamarks: true,
  showBathymetry: true,
  voiceGuidanceEnabled: true,
  voiceIntervalSeconds: 60,
  voiceHeadingThreshold: 15,
  voiceProximityWarningNmi: 0.5,
  nightMode: false,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get('app_settings');
      request.onsuccess = () => {
        if (request.result && request.result.value) {
          resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      request.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key: 'app_settings', value: settings });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

import { OfflineMapArea } from '../types';
import { saveTile, saveOfflineArea, deleteOfflineArea, getOfflineAreas } from './db';

// Slippy map tile calculations
export function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

export function tile2lon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

export function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export function calculateTilesForBounds(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  minZoom: number,
  maxZoom: number
): TileCoord[] {
  const tiles: TileCoord[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = Math.max(0, lon2tile(minLng, z));
    const maxX = Math.min(Math.pow(2, z) - 1, lon2tile(maxLng, z));

    // Note: latitude decreases as Y increases
    const minY = Math.max(0, lat2tile(maxLat, z));
    const maxY = Math.min(Math.pow(2, z) - 1, lat2tile(minLat, z));

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ z, x, y });
      }
    }
  }

  return tiles;
}

export function estimateDownloadSize(tileCount: number): {
  count: number;
  estimatedMb: number;
  estimatedFormatted: string;
} {
  const avgTileBytes = 22 * 1024; // ~22 KB per tile
  const totalBytes = tileCount * avgTileBytes;
  const mb = totalBytes / (1024 * 1024);
  return {
    count: tileCount,
    estimatedMb: Math.round(mb * 10) / 10,
    estimatedFormatted: mb < 1 ? `${Math.round(totalBytes / 1024)} KB` : `${mb.toFixed(1)} MB`,
  };
}

export type DownloadProgressCallback = (
  areaId: string,
  downloaded: number,
  total: number,
  sizeBytes: number,
  status: OfflineMapArea['status']
) => void;

class OfflineMapDownloader {
  private activeAbortControllers: Map<string, AbortController> = new Map();

  public async startDownload(
    area: OfflineMapArea,
    onProgress: DownloadProgressCallback
  ): Promise<void> {
    const abortController = new AbortController();
    this.activeAbortControllers.set(area.id, abortController);

    const tiles = calculateTilesForBounds(
      area.minLat,
      area.maxLat,
      area.minLng,
      area.maxLng,
      area.minZoom,
      area.maxZoom
    );

    area.totalTiles = tiles.length;
    area.downloadedTiles = 0;
    area.sizeBytes = 0;
    area.status = 'downloading';
    await saveOfflineArea(area);
    onProgress(area.id, 0, tiles.length, 0, 'downloading');

    let downloadedCount = 0;
    let totalBytes = 0;
    const concurrency = 4; // Friendly to OSM tile servers
    let currentIndex = 0;

    const downloadWorker = async () => {
      while (currentIndex < tiles.length && !abortController.signal.aborted) {
        const index = currentIndex++;
        const tile = tiles[index];
        const tileKey = `osm_${tile.z}_${tile.x}_${tile.y}`;
        // Standard OpenStreetMap tile URL (allows fair offline caching)
        const tileUrl = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;

        try {
          const res = await fetch(tileUrl, {
            signal: abortController.signal,
            headers: { 'Accept': 'image/png,image/*;q=0.8' },
          });

          if (res.ok) {
            const blob = await res.blob();
            const size = blob.size;
            totalBytes += size;
            await saveTile({
              key: tileKey,
              areaId: area.id,
              blob,
              size,
              timestamp: Date.now(),
            });
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            break;
          }
          // Continue on occasional tile failure
        }

        downloadedCount++;
        if (downloadedCount % 5 === 0 || downloadedCount === tiles.length) {
          area.downloadedTiles = downloadedCount;
          area.sizeBytes = totalBytes;
          await saveOfflineArea(area);
          onProgress(area.id, downloadedCount, tiles.length, totalBytes, 'downloading');
        }
      }
    };

    const workers = Array.from({ length: concurrency }, () => downloadWorker());
    await Promise.all(workers);

    if (abortController.signal.aborted) {
      area.status = 'paused';
      await saveOfflineArea(area);
      onProgress(area.id, downloadedCount, tiles.length, totalBytes, 'paused');
    } else {
      area.status = 'completed';
      area.downloadedTiles = downloadedCount;
      area.sizeBytes = totalBytes;
      await saveOfflineArea(area);
      onProgress(area.id, downloadedCount, tiles.length, totalBytes, 'completed');
    }

    this.activeAbortControllers.delete(area.id);
  }

  public cancelDownload(areaId: string): void {
    const controller = this.activeAbortControllers.get(areaId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(areaId);
    }
  }

  public isDownloading(areaId: string): boolean {
    return this.activeAbortControllers.has(areaId);
  }
}

export const offlineMapDownloader = new OfflineMapDownloader();

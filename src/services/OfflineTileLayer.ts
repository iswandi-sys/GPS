import L from 'leaflet';
import { getTile } from './db';

/**
 * Custom Leaflet TileLayer that checks local IndexedDB first for saved offline map tiles
 * before attempting to fetch from network.
 */
export const OfflineAwareTileLayer = L.TileLayer.extend({
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img');

    L.DomEvent.on(tile, 'load', L.Util.bind((this as any)._tileOnLoad, this, done, tile));
    L.DomEvent.on(tile, 'error', L.Util.bind((this as any)._tileOnError, this, done, tile));

    if (this.options.crossOrigin || this.options.crossOrigin === '') {
      tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
    }

    tile.alt = '';
    tile.setAttribute('role', 'presentation');

    const tileKey = `osm_${coords.z}_${coords.x}_${coords.y}`;

    // 1. Check local IndexedDB storage
    getTile(tileKey)
      .then((storedTile) => {
        if (storedTile && storedTile.blob) {
          tile.src = URL.createObjectURL(storedTile.blob);
        } else {
          // Fallback to online tile URL if online
          const url = (this as any).getTileUrl(coords);
          tile.src = url;
        }
      })
      .catch(() => {
        const url = (this as any).getTileUrl(coords);
        tile.src = url;
      });

    return tile;
  },
});

export function createOfflineTileLayer(urlTemplate: string, options: L.TileLayerOptions): L.TileLayer {
  return new (OfflineAwareTileLayer as any)(urlTemplate, options);
}

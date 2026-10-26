import { Waypoint, WaypointCategory } from '../types';

export type DuplicateStrategy = 'skip' | 'overwrite' | 'create_new';

export interface ImportResult {
  totalFound: number;
  imported: number;
  skipped: number;
  overwritten: number;
  errors: string[];
}

export function exportWaypointsToJSON(waypoints: Waypoint[]): string {
  const exportData = {
    app: 'NAVIGASI LAUT SR',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    count: waypoints.length,
    waypoints,
  };
  return JSON.stringify(exportData, null, 2);
}

export function exportWaypointsToGPX(waypoints: Waypoint[]): string {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="NAVIGASI LAUT SR - Nelayan Sulawesi &amp; Nusa Tenggara" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Titik Navigasi Nelayan SR</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
`;

  for (const wp of waypoints) {
    gpx += `  <wpt lat="${wp.lat.toFixed(6)}" lon="${wp.lng.toFixed(6)}">
    <name>${escapeXml(wp.name)}</name>
    <desc>${escapeXml(wp.notes || '')}</desc>
    <type>${escapeXml(wp.category)}</type>
    <time>${new Date(wp.createdAt).toISOString()}</time>
  </wpt>\n`;
  }

  gpx += `</gpx>`;
  return gpx;
}

export function exportWaypointsToGeoJSON(waypoints: Waypoint[]): string {
  const geojson = {
    type: 'FeatureCollection',
    features: waypoints.map((wp) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [wp.lng, wp.lat],
      },
      properties: {
        id: wp.id,
        name: wp.name,
        category: wp.category,
        notes: wp.notes || '',
        createdAt: wp.createdAt,
      },
    })),
  };
  return JSON.stringify(geojson, null, 2);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportFile(fileContent: string, fileName: string): Waypoint[] {
  const waypoints: Waypoint[] = [];
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.json') || lowerName.endsWith('.geojson')) {
    try {
      const data = JSON.parse(fileContent);

      // Format 1: Our native JSON export
      if (Array.isArray(data.waypoints)) {
        for (const item of data.waypoints) {
          if (isValidCoord(item.lat, item.lng)) {
            waypoints.push({
              id: item.id || `wp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: item.name || 'Titik Tanpa Nama',
              category: sanitizeCategory(item.category),
              lat: Number(item.lat),
              lng: Number(item.lng),
              notes: item.notes || '',
              photoDataUrl: item.photoDataUrl,
              createdAt: item.createdAt || Date.now(),
              updatedAt: item.updatedAt || Date.now(),
            });
          }
        }
        return waypoints;
      }

      // Format 2: Standard GeoJSON FeatureCollection
      if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        for (const feature of data.features) {
          if (feature.geometry && feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
            const [lng, lat] = feature.geometry.coordinates;
            if (isValidCoord(lat, lng)) {
              const props = feature.properties || {};
              waypoints.push({
                id: props.id || `wp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: props.name || 'Titik GeoJSON',
                category: sanitizeCategory(props.category),
                lat: Number(lat),
                lng: Number(lng),
                notes: props.notes || props.desc || '',
                createdAt: props.createdAt || Date.now(),
                updatedAt: Date.now(),
              });
            }
          }
        }
        return waypoints;
      }

      // Format 3: Raw array of waypoints
      if (Array.isArray(data)) {
        for (const item of data) {
          if (isValidCoord(item.lat, item.lng)) {
            waypoints.push({
              id: item.id || `wp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: item.name || 'Titik Nelayan',
              category: sanitizeCategory(item.category),
              lat: Number(item.lat),
              lng: Number(item.lng),
              notes: item.notes || '',
              createdAt: item.createdAt || Date.now(),
              updatedAt: Date.now(),
            });
          }
        }
        return waypoints;
      }
    } catch {
      throw new Error('Gagal membaca format JSON/GeoJSON. Pastikan isi file valid.');
    }
  }

  // Format 4: GPX XML parsing
  if (lowerName.endsWith('.gpx') || fileContent.includes('<gpx')) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(fileContent, 'text/xml');
      const wpts = xmlDoc.getElementsByTagName('wpt');

      for (let i = 0; i < wpts.length; i++) {
        const wpt = wpts[i];
        const lat = parseFloat(wpt.getAttribute('lat') || '');
        const lng = parseFloat(wpt.getAttribute('lon') || '');

        if (isValidCoord(lat, lng)) {
          const name = wpt.getElementsByTagName('name')[0]?.textContent || `Titik GPX ${i + 1}`;
          const desc = wpt.getElementsByTagName('desc')[0]?.textContent || '';
          const type = wpt.getElementsByTagName('type')[0]?.textContent || '';

          waypoints.push({
            id: `wp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            name,
            category: sanitizeCategory(type),
            lat,
            lng,
            notes: desc,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
      return waypoints;
    } catch {
      throw new Error('Gagal membaca format GPX XML. Pastikan file GPX sesuai standar.');
    }
  }

  throw new Error('Format file tidak dikenali. Gunakan file berekstensi .gpx, .geojson, atau .json.');
}

function isValidCoord(lat: any, lng: any): boolean {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return !isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
}

function sanitizeCategory(cat: any): WaypointCategory {
  const valid: WaypointCategory[] = [
    'rumpon',
    'lokasi_ikan',
    'pelabuhan',
    'lokasi_berbahaya',
    'tempat_berlindung',
    'lokasi_pribadi',
  ];
  if (cat && valid.includes(cat.toLowerCase() as WaypointCategory)) {
    return cat.toLowerCase() as WaypointCategory;
  }
  return 'lokasi_pribadi';
}

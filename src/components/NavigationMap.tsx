import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  NavPosition,
  Waypoint,
  NavTargetCalculation,
  AppSettings,
  GPSStatus,
} from '../types';
import { createOfflineTileLayer } from '../services/OfflineTileLayer';
import { CATEGORY_INFO } from './MarineIcons';
import {
  Crosshair,
  Volume2,
  VolumeX,
  Compass,
  Layers,
  MapPin,
  Maximize2,
  Anchor,
  Navigation,
  AlertTriangle,
  Radio,
  Plus,
  Play,
  Square,
  Ship,
  Flag,
} from 'lucide-react';
import { formatCoordinates } from '../services/CoordinateConverter';
import { formatSpeed, formatDistance } from '../services/NavigationEngine';

interface NavigationMapProps {
  position: NavPosition | null;
  gpsStatus: GPSStatus;
  gpsErrorMessage: string;
  targetCalc: NavTargetCalculation;
  waypoints: Waypoint[];
  settings: AppSettings;
  isSailingMode: boolean;
  tripDistanceNmi: number;
  onToggleSailingMode: () => void;
  onSelectTarget: (wp: Waypoint | null) => void;
  onOpenExplorerMode: () => void;
  onToggleVoice: () => void;
  onQuickAddWaypoint: () => void;
  onManualAddWaypoint: (initialCoord?: { lat: number; lng: number }) => void;
  onOpenTargetPicker: () => void;
}

export const NavigationMap: React.FC<NavigationMapProps> = ({
  position,
  gpsStatus,
  gpsErrorMessage,
  targetCalc,
  waypoints,
  settings,
  isSailingMode,
  tripDistanceNmi,
  onToggleSailingMode,
  onSelectTarget,
  onOpenExplorerMode,
  onToggleVoice,
  onQuickAddWaypoint,
  onManualAddWaypoint,
  onOpenTargetPicker,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayersRef = useRef<{ [key: string]: L.TileLayer }>({});
  const overlayLayersRef = useRef<{ seamarks?: L.TileLayer; bathymetry?: L.TileLayer }>({});
  const boatMarkerRef = useRef<L.Marker | null>(null);
  const targetLineRef = useRef<L.Polyline | null>(null);
  const waypointMarkersRef = useRef<L.LayerGroup | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const [followShip, setFollowShip] = useState<boolean>(true);
  const [activeLayer, setActiveLayer] = useState<'street' | 'satellite' | 'ocean'>('satellite');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [showSeamarks, setShowSeamarks] = useState<boolean>(settings.showSeamarks);
  const [showBathymetry, setShowBathymetry] = useState<boolean>(settings.showBathymetry);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center: Perairan Sulawesi (Makassar Strait / Flores Sea)
    const initialLat = position ? position.lat : -5.14;
    const initialLng = position ? position.lng : 119.41;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false, // Disable default zoom on dblclick to allow "Ketuk Dua Kali untuk Tambah Titik"
    });

    // 1. Street Layer (Offline-aware OpenStreetMap)
    const streetLayer = createOfflineTileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap',
      }
    );

    // 2. Satellite Layer (Esri World Imagery)
    const satelliteLayer = createOfflineTileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        attribution: '&copy; Esri World Imagery',
      }
    );

    // 3. Ocean / Nautical Carto
    const oceanLayer = createOfflineTileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: '&copy; Esri Ocean',
      }
    );

    baseLayersRef.current = {
      street: streetLayer,
      satellite: satelliteLayer,
      ocean: oceanLayer,
    };

    // Default layer: satellite for maritime orientation
    satelliteLayer.addTo(map);

    // Overlays: OpenSeaMap seamarks (buoys, beacons, maritime lanes)
    const seamarkLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      maxZoom: 18,
      opacity: 0.9,
    });
    overlayLayersRef.current.seamarks = seamarkLayer;
    if (showSeamarks) {
      seamarkLayer.addTo(map);
    }

    // Overlays: Bathymetry depth contours (GEBCO / NOAA ocean contours)
    const bathymetryLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        opacity: 0.75,
      }
    );
    overlayLayersRef.current.bathymetry = bathymetryLayer;
    if (showBathymetry) {
      bathymetryLayer.addTo(map);
    }

    const waypointGroup = L.layerGroup().addTo(map);
    waypointMarkersRef.current = waypointGroup;

    mapRef.current = map;

    // Detect user pan/drag to disable follow mode temporarily
    map.on('dragstart', () => {
      setFollowShip(false);
    });

    // Double tap / double click event to add a waypoint directly at clicked coordinate
    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      onManualAddWaypoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Base Layer
  const handleSwitchLayer = (type: 'street' | 'satellite' | 'ocean') => {
    if (!mapRef.current) return;
    const currentMap = mapRef.current;

    Object.values(baseLayersRef.current).forEach((l) => {
      if (currentMap.hasLayer(l)) {
        currentMap.removeLayer(l);
      }
    });

    const targetLayer = baseLayersRef.current[type];
    if (targetLayer) {
      targetLayer.addTo(currentMap);
      setActiveLayer(type);
    }
  };

  // Toggle Seamarks Overlay
  const toggleSeamarks = () => {
    if (!mapRef.current || !overlayLayersRef.current.seamarks) return;
    const next = !showSeamarks;
    setShowSeamarks(next);
    if (next) {
      overlayLayersRef.current.seamarks.addTo(mapRef.current);
    } else {
      mapRef.current.removeLayer(overlayLayersRef.current.seamarks);
    }
  };

  // Toggle Bathymetry Overlay
  const toggleBathymetry = () => {
    if (!mapRef.current || !overlayLayersRef.current.bathymetry) return;
    const next = !showBathymetry;
    setShowBathymetry(next);
    if (next) {
      overlayLayersRef.current.bathymetry.addTo(mapRef.current);
    } else {
      mapRef.current.removeLayer(overlayLayersRef.current.bathymetry);
    }
  };

  // Update Boat Marker, Orientation, and Accuracy Ring
  useEffect(() => {
    if (!mapRef.current || !position) return;
    const map = mapRef.current;
    const posLatLng: L.LatLngExpression = [position.lat, position.lng];

    const heading = position.heading ?? 0;
    const iconType = settings.boatIcon;

    // Boat SVG HTML with CSS transform rotation
    const boatHtml = `
      <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transform-origin: center center; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8));">
        <svg width="42" height="42" viewBox="0 0 64 64" fill="none">
          ${getBoatSvgContent(iconType)}
        </svg>
      </div>
    `;

    const customBoatIcon = L.divIcon({
      html: boatHtml,
      className: 'boat-marker-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (!boatMarkerRef.current) {
      boatMarkerRef.current = L.marker(posLatLng, {
        icon: customBoatIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      boatMarkerRef.current.setLatLng(posLatLng);
      boatMarkerRef.current.setIcon(customBoatIcon);
    }

    // Accuracy Circle
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle(posLatLng, {
        radius: Math.max(position.accuracy, 5),
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(posLatLng);
      accuracyCircleRef.current.setRadius(Math.max(position.accuracy, 5));
    }

    // Auto-center if follow mode is active
    if (followShip) {
      map.panTo(posLatLng, { animate: true, duration: 0.5 });
    }
  }, [position, followShip, settings.boatIcon]);

  // Update Waypoint Markers
  useEffect(() => {
    if (!mapRef.current || !waypointMarkersRef.current) return;
    const group = waypointMarkersRef.current;
    group.clearLayers();

    waypoints.forEach((wp) => {
      const cat = CATEGORY_INFO[wp.category];
      const isTarget = targetCalc.target?.id === wp.id;

      const markerHtml = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${isTarget ? '36px' : '30px'};
          height: ${isTarget ? '36px' : '30px'};
          border-radius: 50%;
          background: ${isTarget ? '#EF4444' : '#0F172A'};
          border: 2px solid ${isTarget ? '#FFFFFF' : '#38BDF8'};
          box-shadow: 0 0 ${isTarget ? '12px #EF4444' : '6px rgba(0,0,0,0.6)'};
          font-size: ${isTarget ? '16px' : '13px'};
          color: white;
          cursor: pointer;
        ">
          ${cat.iconEmoji}
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'wp-marker-custom',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([wp.lat, wp.lng], { icon });

      // Popup
      const popupContent = `
        <div style="font-family: sans-serif; min-width: 160px; color: #0F172A;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px;">${wp.name}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">Kategori: ${cat.label}</div>
          ${wp.notes ? `<div style="font-size: 11px; margin-bottom: 6px; background: #f1f5f9; padding: 4px; border-radius: 4px;">${wp.notes}</div>` : ''}
          <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">${wp.lat.toFixed(5)}°, ${wp.lng.toFixed(5)}°</div>
          <button id="btn-set-target-${wp.id}" style="
            width: 100%;
            background: #0284c7;
            color: white;
            border: none;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
          ">
            ${isTarget ? 'Batalkan Target' : 'Pilih Sebagai Target'}
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-set-target-${wp.id}`);
        if (btn) {
          btn.onclick = () => {
            if (isTarget) {
              onSelectTarget(null);
            } else {
              onSelectTarget(wp);
            }
            marker.closePopup();
          };
        }
      });

      group.addLayer(marker);
    });
  }, [waypoints, targetCalc.target]);

  // Update Target Navigation Line
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (targetLineRef.current) {
      map.removeLayer(targetLineRef.current);
      targetLineRef.current = null;
    }

    if (position && targetCalc.target) {
      const shipLatLng: L.LatLngExpression = [position.lat, position.lng];
      const targetLatLng: L.LatLngExpression = [targetCalc.target.lat, targetCalc.target.lng];

      const line = L.polyline([shipLatLng, targetLatLng], {
        color: '#f59e0b',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '8, 8',
      }).addTo(map);

      targetLineRef.current = line;
    }
  }, [position, targetCalc.target]);

  // Helper for boat SVG
  function getBoatSvgContent(type: string): string {
    if (type === 'kapal_kayu') {
      return `
        <path d="M32 4 C42 16 44 42 41 57 C38 60 26 60 23 57 C20 42 22 16 32 4 Z" fill="#D97706" stroke="#FFFFFF" stroke-width="2"/>
        <rect x="26" y="24" width="12" height="18" rx="2" fill="#FDE68A"/>
        <polygon points="32,2 26,10 38,10" fill="#EF4444"/>
      `;
    } else if (type === 'speedboat') {
      return `
        <path d="M32 3 C39 16 41 44 38 58 L26 58 C23 44 25 16 32 3 Z" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
        <path d="M26 22 Q32 20 38 22 L36 32 Q32 30 28 32 Z" fill="#0284C7"/>
        <polygon points="32,1 28,8 36,8" fill="#EF4444"/>
      `;
    } else if (type === 'pamboat') {
      return `
        <path d="M32 2 C36 14 37 46 35 60 L29 60 C27 46 28 14 32 2 Z" fill="#F43F5E" stroke="#FFFFFF" stroke-width="2"/>
        <polygon points="32,1 28,7 36,7" fill="#FACC15"/>
      `;
    } else if (type === 'pagae') {
      return `
        <path d="M32 3 C39 15 41 42 38 58 L26 58 C23 42 25 15 32 3 Z" fill="#0284C7" stroke="#FFFFFF" stroke-width="2"/>
        <line x1="6" y1="28" x2="58" y2="28" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="10" y1="46" x2="54" y2="46" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="5" y="18" width="3.5" height="34" rx="1.5" fill="#F8FAFC" stroke="#0284C7" stroke-width="1"/>
        <rect x="55" y="18" width="3.5" height="34" rx="1.5" fill="#F8FAFC" stroke="#0284C7" stroke-width="1"/>
        <circle cx="32" cy="22" r="3" fill="#FACC15"/>
        <polygon points="32,1 27,9 37,9" fill="#EF4444"/>
      `;
    } else if (type === 'kapal_sumber_01') {
      return `
        <path d="M32 2 C44 14 46 44 43 59 L21 59 C18 44 20 14 32 2 Z" fill="#0F766E" stroke="#FFFFFF" stroke-width="2"/>
        <path d="M32 6 C41 16 43 42 40 56 L24 56 C21 42 23 16 32 6 Z" fill="#0284C7"/>
        <rect x="24" y="20" width="16" height="22" rx="3" fill="#F8FAFC" stroke="#0F172A" stroke-width="1.5"/>
        <rect x="26" y="22" width="12" height="6" rx="1" fill="#0284C7"/>
        <rect x="25" y="46" width="14" height="7" rx="1.5" fill="#FACC15"/>
        <text x="32" y="51.5" fill="#0F172A" font-size="5" font-weight="900" text-anchor="middle" font-family="sans-serif">S-01</text>
        <polygon points="32,0 26,8 38,8" fill="#EF4444"/>
      `;
    }
    // Katir (default)
    return `
      <path d="M32 4 C35 18 36 38 35 56 C33 59 31 59 29 56 C28 38 29 18 32 4 Z" fill="#0284C7" stroke="#FFFFFF" stroke-width="2"/>
      <line x1="8" y1="26" x2="56" y2="26" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <line x1="12" y1="44" x2="52" y2="44" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <rect x="7" y="16" width="5" height="38" rx="2.5" fill="#F8FAFC" stroke="#0284C7" stroke-width="1.5"/>
      <rect x="52" y="16" width="5" height="38" rx="2.5" fill="#F8FAFC" stroke="#0284C7" stroke-width="1.5"/>
      <polygon points="32,2 27,10 37,10" fill="#EF4444"/>
    `;
  }

  const handleRecenter = () => {
    setFollowShip(true);
    if (mapRef.current && position) {
      mapRef.current.setView([position.lat, position.lng], 13, { animate: true });
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)] bg-slate-950 overflow-hidden flex flex-col">
      {/* 1. TOP STATUS & HUD BAR (Offset with safe area margin to avoid notch / mobile status bar overlap) */}
      <div className="absolute top-2.5 sm:top-3 left-2 right-2 z-[400] flex flex-col gap-1.5 pointer-events-none">
        {/* Real-time Maritime HUD metrics */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-2xl flex items-center justify-between text-white">
          {/* Speed & Heading */}
          <div className="flex items-center gap-3">
            <div className="border-r border-slate-700 pr-3">
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-400 block">
                Kecepatan (SOG)
              </span>
              <span className="text-xl font-black tracking-tight text-amber-400 font-mono">
                {formatSpeed(position?.speedKnots ?? 0, settings.speedUnit)}
              </span>
            </div>

            <div>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-400 block flex items-center gap-1">
                <Compass className="w-3 h-3 text-cyan-400" /> Haluan (COG)
              </span>
              <span className="text-xl font-black tracking-tight text-cyan-300 font-mono">
                {position?.heading !== null && position?.heading !== undefined
                  ? `${Math.round(position.heading)}°`
                  : '---°'}
              </span>
            </div>
          </div>

          {/* Quick HUD Action Buttons: Sailing Mode, Voice, Explorer */}
          <div className="flex items-center gap-1.5">
            {/* Sailing Mode (Mode Berlayar) Button */}
            <button
              onClick={onToggleSailingMode}
              title={isSailingMode ? 'Keluar Mode Berlayar' : 'Mulai Mode Berlayar'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs tracking-wide shadow-lg active:scale-95 transition border ${
                isSailingMode
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 animate-pulse'
                  : 'bg-blue-600/80 hover:bg-blue-600 text-white border-blue-400'
              }`}
            >
              {isSailingMode ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isSailingMode ? 'BERLAYAR' : 'BERLAYAR'}</span>
            </button>

            {/* Voice toggle */}
            <button
              onClick={onToggleVoice}
              title="Panduan Suara"
              className={`p-2.5 rounded-lg border transition active:scale-95 ${
                settings.voiceGuidanceEnabled
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300 hover:bg-blue-600/50'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {settings.voiceGuidanceEnabled ? <Volume2 className="w-5 h-5 text-blue-400" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Explorer Mode switch */}
            <button
              onClick={onOpenExplorerMode}
              title="Explorer Mode (Tampilan Layar Penuh Nelayan)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-400 text-white font-bold text-xs tracking-wide shadow-lg active:scale-95 transition"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">EXPLORER</span>
            </button>
          </div>
        </div>

        {/* Target Destination Banner (if set) */}
        {targetCalc.target && (
          <div className="pointer-events-auto bg-amber-950/90 backdrop-blur-md border border-amber-500/60 rounded-xl p-2.5 shadow-xl flex items-center justify-between text-white animate-in fade-in duration-200">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
                <Anchor className="w-4 h-4 text-amber-400" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-300 truncate">
                    {targetCalc.target.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-semibold uppercase">
                    {CATEGORY_INFO[targetCalc.target.category].label}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
                  <span>Jarak: <strong className="text-white">{formatDistance(targetCalc.distanceNmi, settings.distanceUnit)}</strong></span>
                  <span>•</span>
                  <span>Arah: <strong className="text-white">{Math.round(targetCalc.bearingDeg)}°</strong></span>
                  <span>•</span>
                  <span>ETA: <strong className="text-amber-200">{targetCalc.etaTimeFormatted || '--'}</strong></span>
                </div>
              </div>
            </div>

            {/* Clear target button */}
            <button
              onClick={() => onSelectTarget(null)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 border border-amber-600 text-amber-200 shrink-0 font-medium active:scale-95 transition"
            >
              Lepas
            </button>
          </div>
        )}

        {/* GPS Status & Simulation Warnings */}
        {gpsStatus === 'simulated' && (
          <div className="pointer-events-auto bg-blue-950/95 border border-cyan-400 text-cyan-200 text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
            <span><strong>Mode Uji Coba Lapangan Aktif</strong> (Simulasi Nelayan Sulawesi - Perairan Spermonde).</span>
          </div>
        )}

        {gpsStatus === 'searching' && (
          <div className="pointer-events-auto bg-amber-950/90 border border-amber-500 text-amber-200 text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <span>Mencari sinyal GPS maritim... Pastikan berada di perairan terbuka.</span>
          </div>
        )}

        {(gpsStatus === 'denied' || gpsStatus === 'unavailable') && (
          <div className="pointer-events-auto bg-rose-950/95 border border-rose-500 text-rose-200 text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{gpsErrorMessage || 'GPS tidak aktif. Aktifkan lokasi di pengaturan HP.'}</span>
          </div>
        )}

        {/* Hint banner: Ketuk 2 kali di peta untuk tambah titik */}
        <div className="pointer-events-auto self-center bg-slate-900/75 border border-slate-700/60 text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full backdrop-blur-sm">
          💡 Tips: <strong>Ketuk 2x di peta</strong> untuk tandai titik rumpon baru
        </div>
      </div>

      {/* 2. WATERMARK ON TOP-RIGHT OF MAP (Opacity 30%, small text) */}
      <div className="absolute top-4 right-3 z-[410] pointer-events-none select-none">
        <span className="text-[11px] font-mono tracking-widest text-white/30 uppercase font-black px-1.5 py-0.5 rounded bg-black/10">
          ISWANDI
        </span>
      </div>

      {/* 3. LEAFLET MAP CANVAS */}
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-900" />

      {/* 4. MAP FLOATING CONTROLS (Right side: Layer toggle, Recenter, Zoom, Quick Point) */}
      <div className="absolute bottom-24 right-3 z-[400] flex flex-col gap-2">
        {/* Layer Switcher Menu */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="w-11 h-11 rounded-xl bg-slate-900/90 border border-slate-700 shadow-xl flex items-center justify-center text-slate-200 hover:text-white active:scale-95 transition backdrop-blur-md"
            title="Pilih Lapisan Peta"
          >
            <Layers className="w-5 h-5 text-cyan-400" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-13 bottom-0 bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md w-56 text-white text-xs flex flex-col gap-2 z-[420]">
              <span className="font-bold text-slate-300 pb-1 border-b border-slate-800">
                Penyedia Peta
              </span>
              <button
                onClick={() => handleSwitchLayer('satellite')}
                className={`flex items-center justify-between p-2 rounded-lg transition ${
                  activeLayer === 'satellite' ? 'bg-cyan-600/40 border border-cyan-400 text-white' : 'hover:bg-slate-800'
                }`}
              >
                <span>Satelit Maritim (Esri)</span>
                {activeLayer === 'satellite' && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
              </button>
              <button
                onClick={() => handleSwitchLayer('street')}
                className={`flex items-center justify-between p-2 rounded-lg transition ${
                  activeLayer === 'street' ? 'bg-cyan-600/40 border border-cyan-400 text-white' : 'hover:bg-slate-800'
                }`}
              >
                <span>Peta Jalan / Pesisir (OSM)</span>
                {activeLayer === 'street' && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
              </button>
              <button
                onClick={() => handleSwitchLayer('ocean')}
                className={`flex items-center justify-between p-2 rounded-lg transition ${
                  activeLayer === 'ocean' ? 'bg-cyan-600/40 border border-cyan-400 text-white' : 'hover:bg-slate-800'
                }`}
              >
                <span>Peta Laut Dalam (Ocean)</span>
                {activeLayer === 'ocean' && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
              </button>

              <span className="font-bold text-slate-300 pt-2 pb-1 border-b border-slate-800">
                Lapisan Navigasi Laut
              </span>
              <button
                onClick={toggleSeamarks}
                className={`flex items-center justify-between p-2 rounded-lg transition ${
                  showSeamarks ? 'bg-blue-600/40 border border-blue-400 text-white' : 'hover:bg-slate-800 text-slate-400'
                }`}
              >
                <span>Pelampung & Rambu (OpenSeaMap)</span>
                <span>{showSeamarks ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={toggleBathymetry}
                className={`flex items-center justify-between p-2 rounded-lg transition ${
                  showBathymetry ? 'bg-indigo-600/40 border border-indigo-400 text-white' : 'hover:bg-slate-800 text-slate-400'
                }`}
              >
                <span>Kontur Kedalaman (Batimetri)</span>
                <span>{showBathymetry ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Recenter Ship Button */}
        <button
          onClick={handleRecenter}
          className={`w-11 h-11 rounded-xl border shadow-xl flex items-center justify-center active:scale-95 transition backdrop-blur-md ${
            followShip
              ? 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-600/30'
              : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title={followShip ? 'Kapal Terkunci di Tengah' : 'Pusatkan ke Posisi Kapal'}
        >
          <Navigation className={`w-5 h-5 ${followShip ? 'fill-current' : ''}`} />
        </button>

        {/* Zoom In & Out */}
        <div className="flex flex-col bg-slate-900/90 border border-slate-700 rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            className="w-11 h-10 flex items-center justify-center text-slate-200 hover:bg-slate-800 text-lg font-bold border-b border-slate-800 active:bg-slate-700"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-11 h-10 flex items-center justify-center text-slate-200 hover:bg-slate-800 text-lg font-bold active:bg-slate-700"
          >
            −
          </button>
        </div>

        {/* Quick Mark Point at Ship GPS Button */}
        <button
          onClick={onQuickAddWaypoint}
          className="w-11 h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black border border-cyan-300 shadow-xl flex items-center justify-center active:scale-90 transition shadow-cyan-500/20"
          title="Tandai Rumpon / Titik Cepat di Sini"
        >
          <MapPin className="w-6 h-6 fill-current" />
        </button>
      </div>

      {/* 5. FLOATING "+" BUTTON DI POJOK KIRI BAWAH: TAMBAH MANUAL TITIK */}
      <div className="absolute bottom-24 left-3 z-[400]">
        <button
          onClick={() => onManualAddWaypoint()}
          className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border-2 border-amber-300 shadow-2xl flex items-center justify-center active:scale-90 transition shadow-amber-500/30"
          title="Tambah Manual Titik Koordinat"
        >
          <Plus className="w-7 h-7 stroke-[3]" />
        </button>
      </div>

      {/* 6. BOTTOM TELEMETRY BAR: SAILING MODE / COORDINATES */}
      {isSailingMode ? (
        /* SAILING TELEMETRY HUD (Kecepatan, Jarak Ditempuh, Derajat, Estimasi, Sisa Jarak) */
        <div className="absolute bottom-2 left-2 right-2 z-[400] bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md text-white animate-in slide-in-from-bottom-2">
          {/* Header sailing mode */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                MODE BERLAYAR AKTIF
              </span>
              {targetCalc.target && (
                <span className="text-[11px] text-slate-300 font-semibold truncate max-w-[150px]">
                  • Menuju {targetCalc.target.name}
                </span>
              )}
            </div>

            <button
              onClick={onToggleSailingMode}
              className="px-2.5 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-600 font-bold text-[11px] active:scale-95 transition"
            >
              Akhiri Berlayar
            </button>
          </div>

          {/* 5 Requested Telemetry Metrics */}
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {/* 1. Kecepatan */}
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                Kecepatan
              </span>
              <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
                {formatSpeed(position?.speedKnots ?? 0, settings.speedUnit)}
              </span>
            </div>

            {/* 2. Jarak Ditempuh */}
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                Ditempuh
              </span>
              <span className="text-sm sm:text-base font-black text-cyan-300 font-mono">
                {formatDistance(tripDistanceNmi, settings.distanceUnit)}
              </span>
            </div>

            {/* 3. Derajat (Haluan COG) */}
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                Derajat
              </span>
              <span className="text-sm sm:text-base font-black text-white font-mono">
                {position?.heading !== null && position?.heading !== undefined
                  ? `${Math.round(position.heading)}°`
                  : '---°'}
              </span>
            </div>

            {/* 4. Estimasi (ETA) */}
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                Estimasi
              </span>
              <span className="text-xs sm:text-sm font-black text-amber-200 font-mono truncate block">
                {targetCalc.etaTimeFormatted || '--'}
              </span>
            </div>

            {/* 5. Sisa Jarak */}
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                Sisa Jarak
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-400 font-mono truncate block">
                {targetCalc.target
                  ? formatDistance(targetCalc.distanceNmi, settings.distanceUnit)
                  : '--'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD BOTTOM BAR: COORDINATES & TARGET SELECTION */
        <div className="absolute bottom-2 left-2 right-16 z-[400] flex items-center gap-2">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 shadow-xl text-white text-xs flex-1 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Koordinat Kapal
              </span>
              <span className="font-mono text-cyan-300 font-bold text-xs truncate block max-w-[200px]">
                {position
                  ? formatCoordinates(position.lat, position.lng, settings.coordinateFormat)
                  : 'Mencari satelit...'}
              </span>
            </div>

            <button
              onClick={onOpenTargetPicker}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow border border-blue-400 active:scale-95 transition shrink-0 ml-2"
            >
              {targetCalc.target ? 'Ganti Target' : 'Pilih Target'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

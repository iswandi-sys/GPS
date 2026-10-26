/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Waypoint,
  NavPosition,
  GPSStatus,
  AppSettings,
  NavTargetCalculation,
} from './types';
import {
  getAllWaypoints,
  saveWaypoint,
  deleteWaypoint,
  saveWaypointsBatch,
  getSettings,
  saveSettings,
} from './services/db';
import { locationService } from './services/LocationService';
import { computeNavTarget } from './services/NavigationEngine';
import { voiceGuidance } from './services/VoiceGuidance';
import { exportWaypointsToJSON, downloadFile } from './services/ImportExportManager';

// Components
import { NavigationMap } from './components/NavigationMap';
import { ExplorerMode } from './components/ExplorerMode';
import { TitikSayaMenu } from './components/TitikSayaMenu';
import { CuacaLautMenu } from './components/CuacaLautMenu';
import { PetaOfflineMenu } from './components/PetaOfflineMenu';
import { PengaturanMenu } from './components/PengaturanMenu';
import { WaypointModal } from './components/WaypointModal';
import { ImportExportModal } from './components/ImportExportModal';
import { OfflineIndicator } from './components/OfflineIndicator';

import {
  Navigation as NavIcon,
  MapPin,
  Waves,
  DownloadCloud,
  Settings as SettingsIcon,
  Radio,
  Anchor,
  X,
  Compass,
} from 'lucide-react';
import { CATEGORY_INFO } from './components/MarineIcons';
import { formatDistance } from './services/NavigationEngine';

// Seed initial Sulsel / NTT fishing waypoints on first launch
const INITIAL_FISHING_WAYPOINTS: Waypoint[] = [
  {
    id: 'seed_wp_1',
    name: 'Rumpon Paotere 01 (Cakalang)',
    category: 'rumpon',
    lat: -5.0490,
    lng: 119.2800,
    notes: 'Rumpon bambu tali jangkar 90 meter. Ikan cakalang & tongkol berkumpul saat subuh.',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'seed_wp_2',
    name: 'Spot Ikan Barrang Caddi',
    category: 'lokasi_ikan',
    lat: -5.0830,
    lng: 119.3170,
    notes: 'Karang tubir kedalaman 35 meter, target tenggiri dan kakap merah.',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'seed_wp_3',
    name: 'Pangkalan Pelabuhan Paotere',
    category: 'pelabuhan',
    lat: -5.1185,
    lng: 119.4170,
    notes: 'Dermaga pendaratan ikan tradisional dan stasiun bahan bakar solar kapal.',
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'seed_wp_4',
    name: 'Karang Dangkal Samalona (Bahaya)',
    category: 'lokasi_berbahaya',
    lat: -5.1260,
    lng: 119.3400,
    notes: 'Karang muncul saat air surut terendah. Jangan melintas malam hari tanpa suar.',
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'seed_wp_5',
    name: 'Tempat Berlindung Teluk Sinjai',
    category: 'tempat_berlindung',
    lat: -5.1200,
    lng: 120.2500,
    notes: 'Teluk terlindung dari gelombang musim barat.',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'navigasi' | 'titik' | 'cuaca' | 'offline_map' | 'pengaturan'>('navigasi');

  // Navigation State
  const [position, setPosition] = useState<NavPosition | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('searching');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string>('');

  // Waypoints & Settings
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedTargetWaypoint, setSelectedTargetWaypoint] = useState<Waypoint | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    coordinateFormat: 'DMS',
    speedUnit: 'knot',
    distanceUnit: 'nmi',
    boatIcon: 'katir',
    mapLayer: 'satellite',
    showSeamarks: true,
    showBathymetry: true,
    voiceGuidanceEnabled: true,
    voiceIntervalSeconds: 60,
    voiceHeadingThreshold: 15,
    voiceProximityWarningNmi: 0.5,
    nightMode: false,
  });

  // UI Modals
  const [isExplorerMode, setIsExplorerMode] = useState<boolean>(false);
  const [isWaypointModalOpen, setIsWaypointModalOpen] = useState<boolean>(false);
  const [waypointToEdit, setWaypointToEdit] = useState<Waypoint | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [isTargetPickerOpen, setIsTargetPickerOpen] = useState<boolean>(false);

  // 1. Load initial data from IndexedDB
  useEffect(() => {
    async function initData() {
      try {
        const loadedSettings = await getSettings();
        setSettings(loadedSettings);

        const loadedWaypoints = await getAllWaypoints();
        if (loadedWaypoints.length === 0) {
          await saveWaypointsBatch(INITIAL_FISHING_WAYPOINTS);
          setWaypoints(INITIAL_FISHING_WAYPOINTS);
          setSelectedTargetWaypoint(INITIAL_FISHING_WAYPOINTS[0]);
        } else {
          setWaypoints(loadedWaypoints);
          // Set first rumpon as default target if available
          const defaultTarget = loadedWaypoints.find((w) => w.category === 'rumpon') || loadedWaypoints[0];
          setSelectedTargetWaypoint(defaultTarget);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
    initData();
  }, []);

  // 2. Start GPS Tracking via LocationService
  useEffect(() => {
    const unsubscribe = locationService.subscribe((pos, status, error) => {
      setPosition(pos);
      setGpsStatus(status);
      if (error) setGpsErrorMessage(error);
    });

    locationService.startTracking();

    return () => {
      unsubscribe();
      locationService.stopTracking();
    };
  }, []);

  // 3. Compute real-time Navigation Target calculations
  const targetCalc: NavTargetCalculation = useMemo(() => {
    if (!position) {
      return {
        target: selectedTargetWaypoint,
        distanceNmi: 0,
        distanceKm: 0,
        bearingDeg: 0,
        relativeBearingDelta: 0,
        etaMinutes: null,
        etaTimeFormatted: null,
        crossTrackErrorNmi: 0,
      };
    }
    return computeNavTarget(position, selectedTargetWaypoint);
  }, [position, selectedTargetWaypoint]);

  // 4. Trigger Voice Guidance processing on updates
  useEffect(() => {
    if (position && targetCalc.target) {
      voiceGuidance.processNavigation(targetCalc, position, settings);
    }
  }, [position, targetCalc, settings]);

  // Handlers for Waypoints
  const handleSaveWaypoint = async (wp: Waypoint) => {
    await saveWaypoint(wp);
    const updated = await getAllWaypoints();
    setWaypoints(updated);
  };

  const handleDeleteWaypoint = async (id: string) => {
    await deleteWaypoint(id);
    if (selectedTargetWaypoint?.id === id) {
      setSelectedTargetWaypoint(null);
    }
    const updated = await getAllWaypoints();
    setWaypoints(updated);
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleExportAll = () => {
    const jsonStr = exportWaypointsToJSON(waypoints);
    downloadFile(jsonStr, `NavigasiLautSR_Cadangan_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const handleToggleSimulation = () => {
    locationService.toggleSimulation();
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Offline Status Warning Banner */}
      <OfflineIndicator />

      {/* 1. TOP APP HEADER */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between z-[500] shrink-0">
        <div className="flex items-center gap-2">
          {/* Logo Anchor / Ship */}
          <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
            <Anchor className="w-5 h-5 text-cyan-400" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-wide text-white">NAVIGASI LAUT SR</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                OFFLINE
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block -mt-0.5">Sulawesi & Nusa Tenggara</span>
          </div>
        </div>

        {/* Right header actions: Simulation Toggle & GPS Status */}
        <div className="flex items-center gap-2">
          {/* Simulation Toggle Button */}
          <button
            onClick={handleToggleSimulation}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
              locationService.isSimulating()
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Klik untuk uji navigasi simulasi atau kembali ke sinyal GPS asli"
          >
            <Radio className="w-3 h-3" />
            <span>{locationService.isSimulating() ? 'Simulasi' : 'Uji Lapangan'}</span>
          </button>

          {/* GPS Satellite indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
              gpsStatus === 'active' || gpsStatus === 'simulated'
                ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300'
                : gpsStatus === 'searching'
                ? 'bg-amber-950/80 border border-amber-500 text-amber-300'
                : 'bg-rose-950/80 border border-rose-500 text-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                gpsStatus === 'active' || gpsStatus === 'simulated'
                  ? 'bg-emerald-400 animate-pulse'
                  : gpsStatus === 'searching'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-[10px] uppercase font-bold tracking-wider">
              {gpsStatus === 'active'
                ? 'GPS Terkunci'
                : gpsStatus === 'simulated'
                ? 'Demo Rute'
                : gpsStatus === 'searching'
                ? 'Mencari...'
                : 'Tanpa GPS'}
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN ACTIVE VIEW CONTENT */}
      <main className="flex-1 w-full relative overflow-y-auto">
        {activeTab === 'navigasi' && (
          <NavigationMap
            position={position}
            gpsStatus={gpsStatus}
            gpsErrorMessage={gpsErrorMessage}
            targetCalc={targetCalc}
            waypoints={waypoints}
            settings={settings}
            onSelectTarget={(wp) => setSelectedTargetWaypoint(wp)}
            onOpenExplorerMode={() => setIsExplorerMode(true)}
            onToggleVoice={() =>
              handleUpdateSettings({
                ...settings,
                voiceGuidanceEnabled: !settings.voiceGuidanceEnabled,
              })
            }
            onQuickAddWaypoint={() => {
              setWaypointToEdit(null);
              setIsWaypointModalOpen(true);
            }}
            onOpenTargetPicker={() => setIsTargetPickerOpen(true)}
          />
        )}

        {activeTab === 'titik' && (
          <TitikSayaMenu
            waypoints={waypoints}
            currentPosition={position}
            targetCalc={targetCalc}
            settings={settings}
            onOpenAddModal={() => {
              setWaypointToEdit(null);
              setIsWaypointModalOpen(true);
            }}
            onEditWaypoint={(wp) => {
              setWaypointToEdit(wp);
              setIsWaypointModalOpen(true);
            }}
            onDeleteWaypoint={handleDeleteWaypoint}
            onSelectTarget={(wp) => setSelectedTargetWaypoint(wp)}
            onOpenImportExport={() => setIsImportExportOpen(true)}
            onNavigateToMap={() => setActiveTab('navigasi')}
          />
        )}

        {activeTab === 'cuaca' && <CuacaLautMenu currentPosition={position} />}

        {activeTab === 'offline_map' && <PetaOfflineMenu />}

        {activeTab === 'pengaturan' && (
          <PengaturanMenu
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onExportAllData={handleExportAll}
          />
        )}
      </main>

      {/* 3. FULL-SCREEN EXPLORER MODE OVERLAY */}
      {isExplorerMode && (
        <ExplorerMode
          position={position}
          targetCalc={targetCalc}
          settings={settings}
          onClose={() => setIsExplorerMode(false)}
          onToggleVoice={() =>
            handleUpdateSettings({
              ...settings,
              voiceGuidanceEnabled: !settings.voiceGuidanceEnabled,
            })
          }
          onOpenTargetPicker={() => {
            setIsExplorerMode(false);
            setIsTargetPickerOpen(true);
          }}
        />
      )}

      {/* 4. MODALS */}
      {/* Add / Edit Waypoint Modal */}
      <WaypointModal
        isOpen={isWaypointModalOpen}
        waypointToEdit={waypointToEdit}
        currentGpsPosition={position}
        coordinateFormat={settings.coordinateFormat}
        onSave={handleSaveWaypoint}
        onDelete={handleDeleteWaypoint}
        onClose={() => setIsWaypointModalOpen(false)}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        waypoints={waypoints}
        onImportComplete={(imported) => setWaypoints(imported)}
        onClose={() => setIsImportExportOpen(false)}
      />

      {/* Target Picker Quick Sheet */}
      {isTargetPickerOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Anchor className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Pilih Titik Tujuan Navigasi</h3>
              </div>
              <button
                onClick={() => setIsTargetPickerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 overflow-y-auto space-y-2">
              {waypoints.map((wp) => {
                const isSelected = selectedTargetWaypoint?.id === wp.id;
                const cat = CATEGORY_INFO[wp.category];
                return (
                  <button
                    key={wp.id}
                    onClick={() => {
                      setSelectedTargetWaypoint(wp);
                      setIsTargetPickerOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-lg">{cat.iconEmoji}</span>
                      <div className="truncate">
                        <div className="font-bold text-xs text-white truncate">{wp.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{cat.label}</div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-black font-black uppercase shrink-0">
                        TARGET AKTIF
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedTargetWaypoint && (
              <button
                onClick={() => {
                  setSelectedTargetWaypoint(null);
                  setIsTargetPickerOpen(false);
                }}
                className="mt-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs"
              >
                Batalkan Target Navigasi
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. BOTTOM NAVIGATION BAR (5 Menus - Large touch targets for Android at sea) */}
      <nav className="fixed bottom-0 left-0 right-0 h-18 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md z-[500] flex items-stretch justify-around px-1">
        {/* Menu 1: Navigasi */}
        <button
          onClick={() => setActiveTab('navigasi')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
            activeTab === 'navigasi' ? 'text-cyan-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <NavIcon className={`w-5 h-5 ${activeTab === 'navigasi' ? 'fill-current stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-tight">Navigasi</span>
        </button>

        {/* Menu 2: Titik Saya */}
        <button
          onClick={() => setActiveTab('titik')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
            activeTab === 'titik' ? 'text-cyan-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className={`w-5 h-5 ${activeTab === 'titik' ? 'fill-current stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-tight">Titik Saya</span>
        </button>

        {/* Menu 3: Cuaca Laut */}
        <button
          onClick={() => setActiveTab('cuaca')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
            activeTab === 'cuaca' ? 'text-cyan-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Waves className={`w-5 h-5 ${activeTab === 'cuaca' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-tight">Cuaca Laut</span>
        </button>

        {/* Menu 4: Peta Offline */}
        <button
          onClick={() => setActiveTab('offline_map')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
            activeTab === 'offline_map' ? 'text-cyan-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DownloadCloud className={`w-5 h-5 ${activeTab === 'offline_map' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-tight">Peta Offline</span>
        </button>

        {/* Menu 5: Pengaturan */}
        <button
          onClick={() => setActiveTab('pengaturan')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
            activeTab === 'pengaturan' ? 'text-cyan-400 font-black' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SettingsIcon className={`w-5 h-5 ${activeTab === 'pengaturan' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-tight">Pengaturan</span>
        </button>
      </nav>
    </div>
  );
}

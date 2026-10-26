import React, { useState, useEffect } from 'react';
import { OfflineMapArea } from '../types';
import {
  getOfflineAreas,
  saveOfflineArea,
  deleteOfflineArea,
  getTotalStorageUsage,
} from '../services/db';
import {
  offlineMapDownloader,
  calculateTilesForBounds,
  estimateDownloadSize,
} from '../services/OfflineMapManager';
import {
  DownloadCloud,
  HardDrive,
  Trash2,
  CheckCircle2,
  Pause,
  Play,
  Layers,
  MapPin,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface PresetArea {
  name: string;
  desc: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const PRESET_OFFLINE_REGIONS: PresetArea[] = [
  {
    name: 'Selat Makassar & Spermonde',
    desc: 'Makassar, Kepulauan Spermonde, Pangkep, Parepare s/d Majene',
    minLat: -5.50,
    maxLat: -3.50,
    minLng: 118.50,
    maxLng: 119.80,
  },
  {
    name: 'Teluk Bone & Selat Selayar',
    desc: 'Bulukumba, Kepulauan Selayar, Sinjai, Bajoe s/d Kolaka',
    minLat: -6.50,
    maxLat: -3.80,
    minLng: 120.00,
    maxLng: 121.50,
  },
  {
    name: 'Laut Flores & Taman Nasional Komodo',
    desc: 'Takabonerate, Flores Utara, Labuan Bajo s/d Selat Sape',
    minLat: -8.80,
    maxLat: -6.50,
    minLng: 119.00,
    maxLng: 121.50,
  },
  {
    name: 'Laut Banda & Wakatobi',
    desc: 'Pulau Wangi-Wangi, Kaledupa, Tomia, Binongko s/d Kendari',
    minLat: -6.00,
    maxLat: -4.00,
    minLng: 122.50,
    maxLng: 124.50,
  },
  {
    name: 'Nusa Tenggara Timur (Laut Sawu)',
    desc: 'Kupang, Pulau Rote, Sabu Raijua, Selat Pantar s/d Alor',
    minLat: -10.50,
    maxLat: -8.50,
    minLng: 121.50,
    maxLng: 124.50,
  },
];

export const PetaOfflineMenu: React.FC = () => {
  const [areas, setAreas] = useState<OfflineMapArea[]>([]);
  const [storageUsage, setStorageUsage] = useState<{ tileCount: number; bytes: number }>({
    tileCount: 0,
    bytes: 0,
  });

  // New Download Form State
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [detailLevel, setDetailLevel] = useState<'hemat' | 'standar' | 'tinggi'>('hemat');
  const [customName, setCustomName] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  const loadAreasAndStorage = async () => {
    try {
      const storedAreas = await getOfflineAreas();
      setAreas(storedAreas);

      const usage = await getTotalStorageUsage();
      setStorageUsage(usage);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadAreasAndStorage();
  }, []);

  const currentPreset = PRESET_OFFLINE_REGIONS[selectedPresetIndex];

  // Calculate zoom range based on detail level
  const getZoomRange = (level: 'hemat' | 'standar' | 'tinggi') => {
    switch (level) {
      case 'hemat':
        return { minZoom: 6, maxZoom: 9 };
      case 'standar':
        return { minZoom: 6, maxZoom: 11 };
      case 'tinggi':
        return { minZoom: 6, maxZoom: 12 };
    }
  };

  const { minZoom, maxZoom } = getZoomRange(detailLevel);

  // Calculate tiles and size estimate
  const tilesToDownload = calculateTilesForBounds(
    currentPreset.minLat,
    currentPreset.maxLat,
    currentPreset.minLng,
    currentPreset.maxLng,
    minZoom,
    maxZoom
  );
  const sizeEstimate = estimateDownloadSize(tilesToDownload.length);

  const handleStartDownload = async () => {
    const areaName = customName.trim() || currentPreset.name;
    const newArea: OfflineMapArea = {
      id: `area_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: areaName,
      minLat: currentPreset.minLat,
      maxLat: currentPreset.maxLat,
      minLng: currentPreset.minLng,
      maxLng: currentPreset.maxLng,
      minZoom,
      maxZoom,
      detailLevel,
      totalTiles: tilesToDownload.length,
      downloadedTiles: 0,
      sizeBytes: 0,
      status: 'downloading',
      createdAt: Date.now(),
    };

    setIsDownloading(true);
    setActiveAreaId(newArea.id);
    setAreas((prev) => [newArea, ...prev]);

    try {
      await offlineMapDownloader.startDownload(newArea, (id, downloaded, total, size, status) => {
        setAreas((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  downloadedTiles: downloaded,
                  totalTiles: total,
                  sizeBytes: size,
                  status,
                }
              : a
          )
        );
      });
    } catch {
      // Handled in downloader
    } finally {
      setIsDownloading(false);
      setActiveAreaId(null);
      await loadAreasAndStorage();
    }
  };

  const handleCancelDownload = (areaId: string) => {
    offlineMapDownloader.cancelDownload(areaId);
    setIsDownloading(false);
    setActiveAreaId(null);
  };

  const handleDeleteArea = async (areaId: string, areaName: string) => {
    if (confirm(`Hapus peta offline "${areaName}" beserta seluruh data tile dari memori HP?`)) {
      await deleteOfflineArea(areaId);
      await loadAreasAndStorage();
    }
  };

  const formatMb = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 0.1) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="w-full min-h-[calc(100vh-4.5rem)] bg-slate-950 text-white p-3 sm:p-5 flex flex-col max-w-4xl mx-auto space-y-4 pb-24">
      {/* 1. Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <DownloadCloud className="w-6 h-6 text-cyan-400" />
            Peta Offline Nelayan
          </h1>
          <p className="text-xs text-slate-400">
            Unduh peta navigasi ke memori HP agar dapat dibuka di tengah laut tanpa sinyal internet.
          </p>
        </div>

        {/* Storage Meter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Memori Terpakai</span>
            <span className="font-mono font-bold text-cyan-300">
              {formatMb(storageUsage.bytes)} ({storageUsage.tileCount} Tile)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Download New Map Area Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Pilih & Unduh Wilayah Peta Baru
        </h2>

        {/* Preset Selector */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Pilih Wilayah Laut Sulawesi & Nusa Tenggara
          </label>
          <div className="space-y-1.5">
            {PRESET_OFFLINE_REGIONS.map((preset, idx) => {
              const isSelected = selectedPresetIndex === idx;
              return (
                <button
                  key={preset.name}
                  onClick={() => setSelectedPresetIndex(idx)}
                  className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 text-white ring-1 ring-cyan-400'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-white">{preset.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{preset.desc}</div>
                  </div>
                  {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail Level Selector */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Tingkat Detail Peta
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setDetailLevel('hemat')}
              className={`p-2.5 rounded-xl border text-center transition ${
                detailLevel === 'hemat'
                  ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold text-xs">Hemat</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Zoom 6-9 (Cepat)</div>
            </button>

            <button
              onClick={() => setDetailLevel('standar')}
              className={`p-2.5 rounded-xl border text-center transition ${
                detailLevel === 'standar'
                  ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold text-xs">Standar</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Zoom 6-11 (Lengkap)</div>
            </button>

            <button
              onClick={() => setDetailLevel('tinggi')}
              className={`p-2.5 rounded-xl border text-center transition ${
                detailLevel === 'tinggi'
                  ? 'bg-blue-950/60 border-blue-400 text-blue-300 ring-1 ring-blue-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold text-xs">Tinggi</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Zoom 6-12 (Detail Karang)</div>
            </button>
          </div>
        </div>

        {/* Estimate summary & Download CTA */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Estimasi Ukuran Unduhan
            </span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              ~{sizeEstimate.estimatedFormatted} ({sizeEstimate.count} Potongan Tile)
            </span>
          </div>

          <button
            onClick={handleStartDownload}
            disabled={isDownloading}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition active:scale-95"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Mulai Unduh Peta</span>
          </button>
        </div>
      </div>

      {/* 3. Downloaded Offline Maps List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center justify-between">
          <span>Peta Tersimpan di HP ({areas.length})</span>
          <button
            onClick={loadAreasAndStorage}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Segarkan
          </button>
        </h2>

        {areas.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
            Belum ada wilayah peta offline yang diunduh. Pilih salah satu wilayah perairan di atas untuk menyimpan peta ke HP Anda.
          </div>
        ) : (
          <div className="space-y-2.5">
            {areas.map((area) => {
              const pct = area.totalTiles > 0 ? Math.round((area.downloadedTiles / area.totalTiles) * 100) : 0;
              const isCurrentDownloading = area.status === 'downloading';

              return (
                <div
                  key={area.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm">{area.name}</h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                          Detail: {area.detailLevel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {formatMb(area.sizeBytes)} • {area.downloadedTiles} dari {area.totalTiles} tile
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCurrentDownloading ? (
                        <button
                          onClick={() => handleCancelDownload(area.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-900/80 hover:bg-amber-800 text-amber-200 text-xs font-bold flex items-center gap-1"
                        >
                          <Pause className="w-3.5 h-3.5" /> Hentikan
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteArea(area.id, area.name)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/80 hover:text-rose-300 transition"
                          title="Hapus Peta Offline"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 relative">
                    <div
                      className={`h-full transition-all duration-300 ${
                        area.status === 'completed'
                          ? 'bg-emerald-500'
                          : area.status === 'downloading'
                          ? 'bg-cyan-500 animate-pulse'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      {area.status === 'completed' && (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-semibold">Siap Digunakan Offline</span>
                        </>
                      )}
                      {area.status === 'downloading' && (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                          <span className="text-cyan-300 font-semibold">Sedang Mengunduh...</span>
                        </>
                      )}
                      {area.status === 'paused' && <span className="text-amber-300">Dihentikan</span>}
                    </span>

                    <span className="font-mono font-bold text-white">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

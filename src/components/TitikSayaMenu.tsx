import React, { useState, useMemo } from 'react';
import {
  Waypoint,
  WaypointCategory,
  NavPosition,
  AppSettings,
  NavTargetCalculation,
} from '../types';
import { CATEGORY_INFO } from './MarineIcons';
import {
  Plus,
  Search,
  Filter,
  Navigation,
  Edit2,
  Trash2,
  Share2,
  Copy,
  Check,
  MapPin,
  Anchor,
  ArrowUpDown,
  FileDown,
  Info,
} from 'lucide-react';
import { calculateDistanceMeters } from '../services/NavigationEngine';
import { formatCoordinates, copyCoordinatesToClipboard, shareCoordinates } from '../services/CoordinateConverter';
import { formatDistance } from '../services/NavigationEngine';

interface TitikSayaMenuProps {
  waypoints: Waypoint[];
  currentPosition: NavPosition | null;
  targetCalc: NavTargetCalculation;
  settings: AppSettings;
  onOpenAddModal: () => void;
  onEditWaypoint: (wp: Waypoint) => void;
  onDeleteWaypoint: (id: string) => void;
  onSelectTarget: (wp: Waypoint | null) => void;
  onOpenImportExport: () => void;
  onNavigateToMap: () => void;
}

export const TitikSayaMenu: React.FC<TitikSayaMenuProps> = ({
  waypoints,
  currentPosition,
  targetCalc,
  settings,
  onOpenAddModal,
  onEditWaypoint,
  onDeleteWaypoint,
  onSelectTarget,
  onOpenImportExport,
  onNavigateToMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'name' | 'newest'>('distance');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute distance from ship and filter
  const processedWaypoints = useMemo(() => {
    return waypoints
      .map((wp) => {
        let distM = 0;
        let distNmi = 0;
        if (currentPosition) {
          distM = calculateDistanceMeters(currentPosition.lat, currentPosition.lng, wp.lat, wp.lng);
          distNmi = distM / 1852;
        }
        return {
          ...wp,
          distNmi,
        };
      })
      .filter((wp) => {
        const matchesSearch = wp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (wp.notes && wp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || wp.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return a.distNmi - b.distNmi;
        } else if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        } else {
          return b.createdAt - a.createdAt;
        }
      });
  }, [waypoints, searchQuery, selectedCategory, sortBy, currentPosition]);

  const handleCopyCoord = async (wp: Waypoint) => {
    const text = formatCoordinates(wp.lat, wp.lng, settings.coordinateFormat);
    const success = await copyCoordinatesToClipboard(`${wp.name}: ${text}`);
    if (success) {
      setCopiedId(wp.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleShareCoord = async (wp: Waypoint) => {
    const text = `${wp.name} (${CATEGORY_INFO[wp.category].label}): ${formatCoordinates(wp.lat, wp.lng, settings.coordinateFormat)}`;
    await shareCoordinates(`Titik Koordinat: ${wp.name}`, text);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4.5rem)] bg-slate-950 text-white p-3 sm:p-5 flex flex-col max-w-4xl mx-auto space-y-4 pb-24">
      {/* 1. Header with Add & Share actions */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <Anchor className="w-6 h-6 text-amber-400" />
            Titik Saya
          </h1>
          <p className="text-xs text-slate-400">
            Daftar rumpon, lokasi mancing, dan koordinat tersimpan aman di HP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImportExport}
            className="p-2 sm:px-3 sm:py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition active:scale-95"
            title="Ekspor / Impor GPX"
          >
            <FileDown className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Bagi File</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Titik</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama rumpon, pulau, atau pelabuhan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs font-bold"
            >
              Reset
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Semua ({waypoints.length})
          </button>

          {(Object.keys(CATEGORY_INFO) as WaypointCategory[]).map((cat) => {
            const info = CATEGORY_INFO[cat];
            const count = waypoints.filter((w) => w.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 transition ${
                  isSelected
                    ? `${info.bg} ${info.border} ${info.color} ring-1 ring-cyan-400`
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>{info.iconEmoji}</span>
                <span>{info.label} ({count})</span>
              </button>
            );
          })}
        </div>

        {/* Sort selector */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>Menampilkan {processedWaypoints.length} titik</span>
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-300 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="distance" className="bg-slate-900">Jarak Terdekat</option>
              <option value="name" className="bg-slate-900">Nama (A-Z)</option>
              <option value="newest" className="bg-slate-900">Baru Ditambahkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Waypoint Cards List */}
      {processedWaypoints.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center my-6">
          <Anchor className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300 mb-1">Belum Ada Titik Ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery
              ? 'Tidak ada titik yang cocok dengan kata pencarian.'
              : 'Mulai tandai lokasi rumpon ikan atau simpan pelabuhan agar mudah dituju saat melaut.'}
          </p>
          <button
            onClick={onOpenAddModal}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Titik Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {processedWaypoints.map((wp) => {
            const cat = CATEGORY_INFO[wp.category];
            const isTarget = targetCalc.target?.id === wp.id;

            return (
              <div
                key={wp.id}
                className={`bg-slate-900 border rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-lg transition hover:border-slate-600 ${
                  isTarget ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-950/20' : 'border-slate-800'
                }`}
              >
                {/* Top info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 overflow-hidden">
                    {/* Category Icon Badge or Photo Thumbnail */}
                    {wp.photoDataUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-700">
                        <img src={wp.photoDataUrl} alt={wp.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center shrink-0 text-lg`}>
                        {cat.iconEmoji}
                      </div>
                    )}

                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-white text-sm truncate">{wp.name}</h3>
                        {isTarget && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-black uppercase">
                            TARGET
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-semibold ${cat.color} block`}>
                        {cat.label}
                      </span>
                    </div>
                  </div>

                  {/* Distance from vessel */}
                  {currentPosition && (
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-black text-cyan-300">
                        {formatDistance(wp.distNmi, settings.distanceUnit)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">dari kapal</span>
                    </div>
                  )}
                </div>

                {/* Notes if available */}
                {wp.notes && (
                  <p className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 line-clamp-2">
                    {wp.notes}
                  </p>
                )}

                {/* Coordinates & Quick Copy */}
                <div className="flex items-center justify-between bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300">
                  <span className="truncate">
                    {formatCoordinates(wp.lat, wp.lng, settings.coordinateFormat)}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <button
                      onClick={() => handleCopyCoord(wp)}
                      className="p-1 text-slate-400 hover:text-white transition"
                      title="Salin Koordinat"
                    >
                      {copiedId === wp.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleShareCoord(wp)}
                      className="p-1 text-slate-400 hover:text-white transition"
                      title="Bagikan Koordinat"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Action Buttons: Set as Target, Edit, Delete */}
                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditWaypoint(wp)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition"
                      title="Ubah Titik"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus titik "${wp.name}"?`)) {
                          onDeleteWaypoint(wp.id);
                        }
                      }}
                      className="p-2 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950 hover:text-rose-300 text-xs font-semibold transition"
                      title="Hapus Titik"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (isTarget) {
                        onSelectTarget(null);
                      } else {
                        onSelectTarget(wp);
                        onNavigateToMap();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 ${
                      isTarget
                        ? 'bg-amber-600/80 hover:bg-amber-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 fill-current" />
                    <span>{isTarget ? 'Batalkan Target' : 'Tuju Titik Ini'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
